import { getDb } from "./db";
import { telegramChannels, telegramMessages, scrapingWorkers, scrapingHistory, telegramCredentials } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { processNewMessage, classifyPendingMessages } from "./aiClassifier";
import { spawn } from "child_process";
import path from "path";

interface WorkerConfig {
  intervalMinutes: number;
  maxMessagesPerRun: number;
  autoClassify: boolean;
  priorityCategories: string[];
}

const DEFAULT_CONFIG: WorkerConfig = {
  intervalMinutes: 30,
  maxMessagesPerRun: 100,
  autoClassify: true,
  priorityCategories: ["INEMA.LLMs", "INEMA.IA", "INEMA.AGENTES", "INEMA.N8N"]
};

// Estado do worker em memória
const workerState: Map<number, {
  isRunning: boolean;
  intervalId?: NodeJS.Timeout;
  lastRun?: Date;
}> = new Map();

/**
 * Inicia o worker de raspagem para um usuário
 */
export async function startWorker(userId: number, config?: Partial<WorkerConfig>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Verificar se já está rodando
  if (workerState.get(userId)?.isRunning) {
    console.log(`[Worker] Worker já está rodando para usuário ${userId}`);
    return true;
  }

  const workerConfig = { ...DEFAULT_CONFIG, ...config };

  // Criar ou atualizar registro do worker
  const [existingWorker] = await db
    .select()
    .from(scrapingWorkers)
    .where(eq(scrapingWorkers.userId, userId))
    .limit(1);

  if (existingWorker) {
    await db
      .update(scrapingWorkers)
      .set({
        status: "running",
        lastHeartbeat: new Date(),
        config: workerConfig
      })
      .where(eq(scrapingWorkers.id, existingWorker.id));
  } else {
    await db.insert(scrapingWorkers).values({
      userId,
      status: "running",
      lastHeartbeat: new Date(),
      config: workerConfig
    });
  }

  // Executar primeira raspagem imediatamente
  await runScrapingCycle(userId, workerConfig);

  // Configurar intervalo
  const intervalMs = workerConfig.intervalMinutes * 60 * 1000;
  const intervalId = setInterval(async () => {
    await runScrapingCycle(userId, workerConfig);
  }, intervalMs);

  workerState.set(userId, {
    isRunning: true,
    intervalId,
    lastRun: new Date()
  });

  console.log(`[Worker] Iniciado para usuário ${userId}, intervalo: ${workerConfig.intervalMinutes}min`);
  return true;
}

/**
 * Para o worker de raspagem
 */
export async function stopWorker(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const state = workerState.get(userId);
  if (state?.intervalId) {
    clearInterval(state.intervalId);
  }

  workerState.set(userId, { isRunning: false });

  await db
    .update(scrapingWorkers)
    .set({ status: "paused" })
    .where(eq(scrapingWorkers.userId, userId));

  console.log(`[Worker] Parado para usuário ${userId}`);
  return true;
}

/**
 * Obtém status do worker
 */
export async function getWorkerStatus(userId: number): Promise<{
  isRunning: boolean;
  status: string;
  lastHeartbeat?: Date;
  messagesProcessed: number;
  errorCount: number;
  config?: WorkerConfig;
}> {
  const db = await getDb();
  if (!db) {
    return { isRunning: false, status: "error", messagesProcessed: 0, errorCount: 0 };
  }

  const [worker] = await db
    .select()
    .from(scrapingWorkers)
    .where(eq(scrapingWorkers.userId, userId))
    .limit(1);

  const state = workerState.get(userId);

  return {
    isRunning: state?.isRunning || false,
    status: worker?.status || "idle",
    lastHeartbeat: worker?.lastHeartbeat || undefined,
    messagesProcessed: worker?.messagesProcessed || 0,
    errorCount: worker?.errorCount || 0,
    config: worker?.config as WorkerConfig || DEFAULT_CONFIG
  };
}

/**
 * Executa um ciclo de raspagem
 */
async function runScrapingCycle(userId: number, config: WorkerConfig): Promise<void> {
  const db = await getDb();
  if (!db) return;

  console.log(`[Worker] Iniciando ciclo de raspagem para usuário ${userId}`);

  try {
    // Atualizar heartbeat
    await db
      .update(scrapingWorkers)
      .set({ lastHeartbeat: new Date() })
      .where(eq(scrapingWorkers.userId, userId));

    // Buscar credenciais do usuário
    const [credentials] = await db
      .select()
      .from(telegramCredentials)
      .where(and(
        eq(telegramCredentials.userId, userId),
        eq(telegramCredentials.isActive, true)
      ))
      .limit(1);

    if (!credentials) {
      console.log(`[Worker] Sem credenciais configuradas para usuário ${userId}`);
      return;
    }

    // Buscar canais ativos, priorizando os da lista de prioridade
    const channels = await db
      .select()
      .from(telegramChannels)
      .where(and(
        eq(telegramChannels.userId, userId),
        eq(telegramChannels.isActive, true)
      ));

    // Ordenar por prioridade
    const sortedChannels = channels.sort((a, b) => {
      const aPriority = config.priorityCategories.some(p => 
        a.channelName.toLowerCase().includes(p.toLowerCase())
      ) ? 0 : 1;
      const bPriority = config.priorityCategories.some(p => 
        b.channelName.toLowerCase().includes(p.toLowerCase())
      ) ? 0 : 1;
      return aPriority - bPriority;
    });

    let totalMessagesCollected = 0;

    for (const channel of sortedChannels) {
      if (totalMessagesCollected >= config.maxMessagesPerRun) break;

      // Criar registro de histórico
      const [historyRecord] = await db
        .insert(scrapingHistory)
        .values({
          userId,
          channelId: channel.id,
          status: "running"
        })
        .$returningId();

      try {
        // Chamar script Python de raspagem
        const messages = await scrapeChannelWithPython(
          credentials.apiId,
          credentials.apiHash,
          credentials.phoneNumber || "",
          channel.channelUsername || channel.channelName,
          Math.min(50, config.maxMessagesPerRun - totalMessagesCollected)
        );

        let messagesInserted = 0;
        let promptsFound = 0;

        for (const msg of messages) {
          // Processar mensagem (deduplicação + classificação)
          const result = await processNewMessage(msg.content, userId, config.autoClassify);

          if (!result.isDuplicate) {
            await db.insert(telegramMessages).values({
              channelId: channel.id,
              userId,
              telegramMessageId: msg.telegramMessageId,
              messageType: (msg.messageType as "text" | "image" | "video" | "document" | "audio" | "prompt" | "other") || "text",
              content: msg.content,
              caption: msg.caption,
              senderName: msg.senderName,
              senderId: msg.senderId,
              messageDate: msg.messageDate ? new Date(msg.messageDate) : new Date(),
              hasMedia: msg.hasMedia || false,
              mediaUrl: msg.mediaUrl,
              mediaType: msg.mediaType,
              contentHash: result.hash,
              aiClassification: result.classification?.classification,
              aiConfidence: result.classification?.confidence,
              aiClassifiedAt: result.classification ? new Date() : undefined,
              isPrompt: result.classification?.classification === "prompt"
            });

            messagesInserted++;
            if (result.classification?.classification === "prompt") {
              promptsFound++;
            }
          }
        }

        totalMessagesCollected += messagesInserted;

        // Atualizar histórico
        await db
          .update(scrapingHistory)
          .set({
            status: "completed",
            messagesCollected: messagesInserted,
            promptsCollected: promptsFound,
            completedAt: new Date()
          })
          .where(eq(scrapingHistory.id, historyRecord.id));

        // Atualizar canal
        await db
          .update(telegramChannels)
          .set({
            lastScrapedAt: new Date(),
            totalMessages: channel.totalMessages + messagesInserted
          })
          .where(eq(telegramChannels.id, channel.id));

        console.log(`[Worker] Canal ${channel.channelName}: ${messagesInserted} mensagens, ${promptsFound} prompts`);

      } catch (error) {
        console.error(`[Worker] Erro no canal ${channel.channelName}:`, error);
        
        await db
          .update(scrapingHistory)
          .set({
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            completedAt: new Date()
          })
          .where(eq(scrapingHistory.id, historyRecord.id));
      }
    }

    // Atualizar contador do worker
    await db
      .update(scrapingWorkers)
      .set({
        messagesProcessed: totalMessagesCollected,
        lastHeartbeat: new Date()
      })
      .where(eq(scrapingWorkers.userId, userId));

    // Classificar mensagens pendentes se autoClassify estiver ativo
    if (config.autoClassify) {
      const classified = await classifyPendingMessages(20);
      console.log(`[Worker] ${classified} mensagens classificadas por IA`);
    }

    console.log(`[Worker] Ciclo concluído: ${totalMessagesCollected} mensagens coletadas`);

  } catch (error) {
    console.error(`[Worker] Erro no ciclo:`, error);
    
    await db
      .update(scrapingWorkers)
      .set({
        status: "error",
        lastError: error instanceof Error ? error.message : "Unknown error",
        errorCount: 1
      })
      .where(eq(scrapingWorkers.userId, userId));
  }
}

/**
 * Chama o script Python para raspar um canal
 */
async function scrapeChannelWithPython(
  apiId: string,
  apiHash: string,
  phoneNumber: string,
  channelUsername: string,
  limit: number
): Promise<Array<{
  telegramMessageId: number;
  content: string;
  caption?: string;
  senderName?: string;
  senderId?: string;
  messageDate?: string;
  hasMedia?: boolean;
  mediaUrl?: string;
  mediaType?: string;
  messageType?: string;
}>> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "telegram_scraper.py");
    
    const childProcess = spawn("python3", [
      scriptPath,
      "--api-id", apiId,
      "--api-hash", apiHash,
      "--phone", phoneNumber,
      "--channel", channelUsername,
      "--limit", limit.toString(),
      "--output", "json"
    ]);

    let stdout = "";
    let stderr = "";

    childProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    childProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    childProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[Python] stderr: ${stderr}`);
        // Retornar array vazio em caso de erro para não interromper o fluxo
        resolve([]);
        return;
      }

      try {
        // Tentar parsear o JSON da saída
        const jsonMatch = stdout.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const messages = JSON.parse(jsonMatch[0]);
          resolve(messages);
        } else {
          resolve([]);
        }
      } catch (error) {
        console.error(`[Python] Parse error:`, error);
        resolve([]);
      }
    });

    childProcess.on("error", (error) => {
      console.error(`[Python] Spawn error:`, error);
      resolve([]);
    });

    // Timeout de 5 minutos
    setTimeout(() => {
      childProcess.kill();
      resolve([]);
    }, 5 * 60 * 1000);
  });
}

export { WorkerConfig, DEFAULT_CONFIG };
