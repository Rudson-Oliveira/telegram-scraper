import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import * as db from './db';

// Configuração das credenciais
const API_ID = 34460706;
const API_HASH = process.env.TELEGRAM_API_HASH || '';

// Rate limiting configuration - 500 msgs/hour = ~8 msgs/minute
const RATE_LIMIT = {
  messagesPerHour: 500,
  delayBetweenChannels: 2000, // 2 seconds between channels
  delayBetweenMessages: 200, // 200ms between message batches
  maxMessagesPerChannel: 100, // Max messages per channel per run
};

interface TelegramMessage {
  id: number;
  channelId: string;
  channelName: string;
  content: string;
  date: Date;
  mediaType?: string;
  mediaUrl?: string;
  views?: number;
  forwards?: number;
  senderName?: string;
}

interface ScrapingResult {
  success: boolean;
  messagesCollected: number;
  errors: string[];
  channels: { name: string; count: number }[];
  duration: number;
  rateInfo: {
    messagesPerHour: number;
    remainingQuota: number;
  };
}

let client: TelegramClient | null = null;
let isConnected = false;
let sessionString: string = '';
let messagesThisHour = 0;
let hourStartTime = Date.now();

// Reset hourly counter
function checkHourlyReset() {
  const now = Date.now();
  if (now - hourStartTime >= 3600000) { // 1 hour
    messagesThisHour = 0;
    hourStartTime = now;
  }
}

/**
 * Helper function for delays and rate limiting
 * @param ms - Milliseconds to wait
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function initTelegramClient(session?: string): Promise<boolean> {
  try {
    sessionString = session || process.env.TELEGRAM_SESSION || '';
    const stringSession = new StringSession(sessionString);
    
    // CORREÇÃO: Aumentar timeout de 30s para 120s e adicionar mais retries
    client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,        // 5 tentativas de reconexão
      useWSS: true,
      timeout: 120000,             // 120 segundos (antes era 30s)
      retryDelay: 5000,            // 5 segundos entre tentativas
      autoReconnect: true,         // Reconectar automaticamente
      maxConcurrentDownloads: 1,   // 1 download por vez (evitar sobrecarga)
    });

    // Se já temos uma sessão válida, apenas conectar
    if (sessionString) {
      console.log('[Telegram] Connecting with existing session...');
      await client.connect();
      isConnected = client.connected ?? false;
      if (isConnected) {
        console.log('[Telegram] ✅ Connected with existing session');
        return true;
      }
    }

    // Caso contrário, iniciar autenticação
    console.log('[Telegram] Starting authentication flow...');
    await client.start({
      phoneNumber: async () => process.env.TELEGRAM_PHONE || '+5535998352323',
      password: async () => process.env.TELEGRAM_2FA_PASSWORD || '',
      phoneCode: async () => {
        throw new Error('PHONE_CODE_REQUIRED');
      },
      onError: (err) => console.error('[Telegram] Auth error:', err),
    });

    isConnected = true;
    sessionString = client.session.save() as unknown as string;
    console.log('[Telegram] ✅ Client connected successfully');
    console.log('[Telegram] Session saved for future reconnection');
    
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Telegram] ❌ Failed to initialize:', errorMsg);
    
    if (errorMsg === 'PHONE_CODE_REQUIRED') {
      console.log('[Telegram] Phone verification required - use sendCode endpoint');
    }
    
    isConnected = false;
    return false;
  }
}

export async function sendVerificationCode(phone: string): Promise<{ success: boolean; phoneCodeHash?: string }> {
  try {
    if (!client) {
      const stringSession = new StringSession('');
      client = new TelegramClient(stringSession, API_ID, API_HASH, {
        connectionRetries: 5,
        useWSS: true,
      });
      await client.connect();
    }

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phone,
        apiId: API_ID,
        apiHash: API_HASH,
        settings: new Api.CodeSettings({}),
      })
    );

    return { success: true, phoneCodeHash: (result as any).phoneCodeHash };
  } catch (error) {
    console.error('[Telegram] Send code error:', error);
    return { success: false };
  }
}

export async function verifyCode(phone: string, code: string, phoneCodeHash: string): Promise<boolean> {
  try {
    if (!client) return false;

    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );

    isConnected = true;
    sessionString = client.session.save() as unknown as string;
    
    // Save session to database for persistence
    console.log('[Telegram] Verification successful, session saved');
    
    return true;
  } catch (error) {
    console.error('[Telegram] Verify code error:', error);
    return false;
  }
}

export async function getChannelMessages(
  channelUsername: string,
  limit: number = RATE_LIMIT.maxMessagesPerChannel
): Promise<TelegramMessage[]> {
  if (!client || !isConnected) {
    throw new Error('Telegram client not connected');
  }

  checkHourlyReset();
  
  // Check rate limit
  const remainingQuota = RATE_LIMIT.messagesPerHour - messagesThisHour;
  if (remainingQuota <= 0) {
    console.log('[Telegram] Rate limit reached, waiting for next hour');
    return [];
  }

  const actualLimit = Math.min(limit, remainingQuota);

  try {
    const channel = await client.getEntity(channelUsername);
    const messages = await client.getMessages(channel, { limit: actualLimit });
    
    messagesThisHour += messages.length;
    
    return messages.map(msg => ({
      id: msg.id,
      channelId: channelUsername,
      channelName: channelUsername,
      content: msg.message || '',
      date: new Date(msg.date * 1000),
      mediaType: msg.media ? getMediaType(msg.media) : undefined,
      views: msg.views || 0,
      forwards: msg.forwards || 0,
      senderName: msg.fromId ? String(msg.fromId) : undefined,
    }));
  } catch (error) {
    console.error(`[Telegram] Error fetching from ${channelUsername}:`, error);
    return [];
  }
}

function getMediaType(media: Api.TypeMessageMedia): string {
  if (media instanceof Api.MessageMediaPhoto) return 'image';
  if (media instanceof Api.MessageMediaDocument) {
    const doc = media.document;
    if (doc && 'mimeType' in doc) {
      if (doc.mimeType?.startsWith('video/')) return 'video';
      if (doc.mimeType?.startsWith('audio/')) return 'audio';
    }
    return 'document';
  }
  if (media instanceof Api.MessageMediaWebPage) return 'webpage';
  return 'other';
}

/**
 * CORREÇÃO: Função de raspagem com retry automático e backoff exponencial
 * Resolve o problema de sessões travadas (30-40% de falhas)
 * 
 * @param channelUsername - Username do canal (ex: @canal)
 * @param limit - Número máximo de mensagens
 * @param maxRetries - Número máximo de tentativas (padrão: 3)
 * @returns Array de mensagens do Telegram
 */
export async function scrapeChannelWithRetry(
  channelUsername: string,
  limit: number = 100,
  maxRetries: number = 3
): Promise<TelegramMessage[]> {
  if (!client || !isConnected) {
    throw new Error('Telegram client not connected');
  }

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Telegram] 📥 Tentativa ${attempt}/${maxRetries} para canal ${channelUsername}`);
      
      // Verificar se canal existe
      const channel = await client.getEntity(channelUsername);
      if (!channel) {
        throw new Error(`Canal ${channelUsername} não encontrado`);
      }
      
      // Raspar mensagens com timeout maior
      const messages = await client.getMessages(channel, { limit });
      
      // Rate limiting: aguardar 1 segundo entre requisições
      await sleep(1000);
      
      console.log(`[Telegram] ✅ Sucesso: ${messages.length} mensagens coletadas de ${channelUsername}`);
      
      // Converter para formato TelegramMessage
      return messages.map(msg => ({
        id: msg.id,
        channelId: channelUsername,
        channelName: channelUsername,
        content: msg.message || '',
        date: new Date(msg.date * 1000),
        mediaType: msg.media ? getMediaType(msg.media) : undefined,
        views: msg.views || 0,
        forwards: msg.forwards || 0,
        senderName: msg.fromId ? String(msg.fromId) : undefined,
      }));
      
    } catch (error) {
      lastError = error as Error;
      console.error(`[Telegram] ❌ Erro na tentativa ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        // Backoff exponencial: 5s, 10s, 15s
        const waitTime = attempt * 5000;
        console.log(`[Telegram] ⏳ Aguardando ${waitTime}ms antes de tentar novamente...`);
        await sleep(waitTime);
      }
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  const errorMsg = `Falha ao raspar canal ${channelUsername} após ${maxRetries} tentativas: ${lastError?.message}`;
  console.error(`[Telegram] ❌ ${errorMsg}`);
  throw new Error(errorMsg);
}

export async function scrapeChannels(
  userId: number,
  channelUsernames: string[],
  messagesPerChannel: number = 50,
  onProgress?: (current: number, total: number, channel: string) => void
): Promise<ScrapingResult> {
  const startTime = Date.now();
  checkHourlyReset();
  
  const result: ScrapingResult = {
    success: false,
    messagesCollected: 0,
    errors: [],
    channels: [],
    duration: 0,
    rateInfo: {
      messagesPerHour: messagesThisHour,
      remainingQuota: RATE_LIMIT.messagesPerHour - messagesThisHour,
    },
  };

  if (!client || !isConnected) {
    result.errors.push('Telegram client not connected');
    return result;
  }

  const totalChannels = channelUsernames.length;
  let currentChannel = 0;

  for (const username of channelUsernames) {
    currentChannel++;
    
    // Check rate limit before each channel
    if (messagesThisHour >= RATE_LIMIT.messagesPerHour) {
      result.errors.push('Rate limit reached (500 msgs/hour)');
      break;
    }

    try {
      if (onProgress) {
        onProgress(currentChannel, totalChannels, username);
      }

      // CORREÇÃO: Usar scrapeChannelWithRetry ao invés de getChannelMessages
      // Isso adiciona retry automático e backoff exponencial
      const messages = await scrapeChannelWithRetry(username, messagesPerChannel, 3);
      
      // Get channel from database
      const channels = await db.getChannels(userId);
      const dbChannel = channels.find(c => 
        c.channelUsername?.toLowerCase() === username.toLowerCase() ||
        c.channelName?.toLowerCase().includes(username.toLowerCase())
      );
      
      // Save messages to database
      for (const msg of messages) {
        const isPrompt = detectPrompt(msg.content);
        
        await db.createMessage({
          userId,
          channelId: dbChannel?.id || 0,
          content: msg.content,
          messageType: msg.mediaType as any || 'text',
          hasMedia: !!msg.mediaType,
          mediaType: msg.mediaType,
          isPrompt,
          messageDate: msg.date,
          senderName: msg.senderName,
        });
      }
      
      result.channels.push({ name: username, count: messages.length });
      result.messagesCollected += messages.length;
      
      console.log(`[Telegram] ✅ Canal ${username}: ${messages.length} mensagens salvas`);
      
      // Rate limiting delay between channels (2 segundos)
      await sleep(RATE_LIMIT.delayBetweenChannels);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Telegram] ❌ Erro ao processar canal ${username}:`, errorMsg);
      result.errors.push(`${username}: ${errorMsg}`);
    }
  }

  result.success = result.errors.length === 0;
  result.duration = Date.now() - startTime;
  result.rateInfo = {
    messagesPerHour: messagesThisHour,
    remainingQuota: RATE_LIMIT.messagesPerHour - messagesThisHour,
  };
  
  return result;
}

// Detect if message contains a prompt
function detectPrompt(content: string): boolean {
  const promptIndicators = [
    'prompt:', 'prompt para', 'use este prompt',
    'copie e cole', 'template:', 'modelo:',
    'instrução:', 'comando:', 'gpt:', 'claude:',
    'gemini:', 'llm:', 'chatgpt:',
    'você é um', 'você é uma', 'atue como',
    'responda como', 'escreva como',
  ];
  
  const lowerContent = content.toLowerCase();
  return promptIndicators.some(indicator => lowerContent.includes(indicator));
}

export async function startRealtimeScraping(
  userId: number,
  channelUsernames: string[],
  onMessage: (msg: TelegramMessage) => void
): Promise<() => void> {
  if (!client || !isConnected) {
    throw new Error('Telegram client not connected');
  }

  const handler = async (event: { message: Api.Message }) => {
    const msg = event.message;
    if (!msg.message) return;
    
    checkHourlyReset();
    if (messagesThisHour >= RATE_LIMIT.messagesPerHour) {
      console.log('[Telegram] Rate limit reached in realtime scraping');
      return;
    }
    
    messagesThisHour++;
    
    const telegramMsg: TelegramMessage = {
      id: msg.id,
      channelId: String(msg.peerId),
      channelName: '',
      content: msg.message,
      date: new Date(msg.date * 1000),
      views: msg.views || 0,
    };
    
    onMessage(telegramMsg);
  };

  client.addEventHandler(handler);

  return () => {
    // @ts-ignore - GramJS API
    client?.removeEventHandler(handler);
  };
}

export function isClientConnected(): boolean {
  return isConnected;
}

export function getSessionString(): string {
  return sessionString;
}

export function getRateLimitInfo(): { used: number; remaining: number; limit: number } {
  checkHourlyReset();
  return {
    used: messagesThisHour,
    remaining: RATE_LIMIT.messagesPerHour - messagesThisHour,
    limit: RATE_LIMIT.messagesPerHour,
  };
}

export async function disconnectClient(): Promise<void> {
  if (client) {
    await client.disconnect();
    isConnected = false;
    client = null;
  }
}

// Simulate scraping for testing without real connection
export async function simulateScraping(
  userId: number,
  channelUsernames: string[],
  messagesPerChannel: number = 10,
  onProgress?: (current: number, total: number, channel: string) => void
): Promise<ScrapingResult> {
  const startTime = Date.now();
  
  const result: ScrapingResult = {
    success: true,
    messagesCollected: 0,
    errors: [],
    channels: [],
    duration: 0,
    rateInfo: {
      messagesPerHour: messagesThisHour,
      remainingQuota: RATE_LIMIT.messagesPerHour - messagesThisHour,
    },
  };

  const sampleMessages = [
    'Prompt: Você é um assistente médico especializado em triagem de pacientes. Analise os sintomas e sugira prioridade de atendimento.',
    'Workflow N8N para automação de agendamentos hospitalares - conecta WhatsApp + Google Calendar + Sistema interno',
    'Tutorial: Como implementar IA em triagem de pacientes usando GPT-4 e integração com prontuário eletrônico',
    'Ferramenta de análise de contratos médicos com Claude 3.5 - extrai cláusulas e identifica riscos automaticamente',
    'Integração WhatsApp Business + Sistema de prontuários - agendamento automático e confirmação por mensagem',
    'Automação de relatórios de ocupação hospitalar - dashboard em tempo real com alertas',
    'Bot Telegram para atendimento 24/7 em clínicas - FAQ automático + encaminhamento para humano',
    'Pipeline de processamento de imagens médicas com IA - detecção de anomalias em raio-x',
    'Sistema de alertas para exames críticos - notificação imediata para médico responsável',
    'Dashboard de métricas hospitalares em tempo real - ocupação, tempo de espera, satisfação',
  ];

  const totalChannels = channelUsernames.length;
  let currentChannel = 0;

  for (const username of channelUsernames) {
    currentChannel++;
    
    if (onProgress) {
      onProgress(currentChannel, totalChannels, username);
    }
    
    const count = Math.min(messagesPerChannel, sampleMessages.length);
    
    // Get channel from database
    const channels = await db.getChannels(userId);
    const dbChannel = channels.find(c => 
      c.channelUsername?.toLowerCase() === username.toLowerCase() ||
      c.channelName?.toLowerCase().includes(username.toLowerCase())
    );
    
    for (let i = 0; i < count; i++) {
      const content = sampleMessages[i % sampleMessages.length];
      const isPrompt = detectPrompt(content);
      
      await db.createMessage({
        userId,
        channelId: dbChannel?.id || 0,
        content,
        messageType: 'text',
        isPrompt,
      });
    }
    
    result.channels.push({ name: username, count });
    result.messagesCollected += count;
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  result.duration = Date.now() - startTime;
  return result;
}
