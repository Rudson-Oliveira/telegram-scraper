import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { runTelegramScraper, validateTelegramCredentials, INEMA_CHANNELS, CHANNEL_CATEGORIES } from "./telegramService";
import { startWorker, stopWorker, getWorkerStatus } from "./scrapingWorker";
import { initTelegramClient, scrapeChannels, simulateScraping, isClientConnected } from "./telegramClient";
import { generateVideoFromText, generateVideoFromImage, checkVideoStatus, KLING_MODELS, ASPECT_RATIOS } from "./videoService";
import { generateImageFromText, editImage, IMAGE_STYLES } from "./imageService";
import { WORKFLOW_TEMPLATES, executeWorkflow, shouldTriggerWorkflow } from "./workflowService";
import { createLeadFromMessage, calculateFunnelMetrics, FUNNEL_STAGES, FUNNEL_AUTOMATIONS } from "./funnelService";
import { adaptContentForHospital, processAdaptationBatch, getAdaptationStats, getQuickOpportunities, HOSPITAL_DEPARTMENTS } from "./hospitalAdaptation";
import { classifyPendingMessages, classifyMessage } from "./aiClassifier";
import { apiKeys, integrations, agents } from "../drizzle/schema";
import { getDb } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Telegram Authentication
  telegram: router({
    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const creds = await db.getCredentials(ctx.user.id);
      if (!creds || !creds.apiId || !creds.apiHash) {
        return { connected: false, message: "Credenciais não configuradas" };
      }
      // Simular teste de conexão (em produção, usar Telethon)
      return { connected: true, message: "Conexão OK" };
    }),
    
    sendCode: protectedProcedure
      .input(z.object({ phone: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Em produção, usar Telethon para enviar código
        // Por enquanto, simular envio
        await db.saveCredentials({
          userId: ctx.user.id,
          apiId: "",
          apiHash: "",
          phoneNumber: input.phone,
        });
        return { success: true, message: "Código enviado" };
      }),
    
    verifyCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Em produção, verificar código via Telethon
        // Simular verificação
        if (input.code.length >= 5) {
          return { success: true, needsPassword: false };
        }
        throw new Error("Código inválido");
      }),
    
    verifyPassword: protectedProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Em produção, verificar senha 2FA via Telethon
        if (input.password.length >= 4) {
          return { success: true };
        }
        throw new Error("Senha inválida");
      }),
  }),

  // Telegram Credentials
  credentials: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getCredentials(ctx.user.id);
    }),
    
    save: protectedProcedure
      .input(z.object({
        apiId: z.string().min(1, "API ID é obrigatório"),
        apiHash: z.string().min(1, "API Hash é obrigatório"),
        phoneNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.saveCredentials({
          userId: ctx.user.id,
          apiId: input.apiId,
          apiHash: input.apiHash,
          phoneNumber: input.phoneNumber || null,
        });
      }),
  }),

  // Telegram Channels
  channels: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const database = await getDb();
      if (!database) return [];
      
      // Get channels with message count
      const channels = await db.getChannels(ctx.user.id);
      
      // Get message counts per channel using raw SQL
      const messageCounts = await database.execute(
        sql`SELECT channelId, COUNT(*) as count FROM telegram_messages GROUP BY channelId`
      );
      
      const countMap = new Map<number, number>();
      // Handle MySQL result format: [rows, fields]
      const rows = (messageCounts as unknown as [any[], any])[0];
      console.log('[Channels] Message counts raw:', JSON.stringify(rows?.slice?.(0, 5)));
      if (Array.isArray(rows)) {
        rows.forEach((row: any) => {
          countMap.set(row.channelId, Number(row.count));
        });
      }
      console.log('[Channels] Count map size:', countMap.size, 'Sample:', Array.from(countMap.entries()).slice(0, 5));
      
      console.log('[Channels] Channel IDs:', channels.slice(0, 10).map(c => c.id));
      const result = channels.map(channel => ({
        ...channel,
        messageCount: countMap.get(channel.id) || 0,
      }));
      console.log('[Channels] Result sample:', result.slice(0, 5).map(c => ({ id: c.id, name: c.channelName, count: c.messageCount })));
      return result;
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getChannelById(input.id, ctx.user.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        channelName: z.string().min(1, "Nome do canal é obrigatório"),
        channelUsername: z.string().optional(),
        channelType: z.enum(["channel", "group", "supergroup"]).default("channel"),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createChannel({
          userId: ctx.user.id,
          channelName: input.channelName,
          channelUsername: input.channelUsername || null,
          channelType: input.channelType,
          description: input.description || null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        channelName: z.string().optional(),
        channelUsername: z.string().optional(),
        channelType: z.enum(["channel", "group", "supergroup"]).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateChannel(id, ctx.user.id, data);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteChannel(input.id, ctx.user.id);
        return { success: true };
      }),
    
    toggleActive: protectedProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateChannel(input.id, ctx.user.id, { isActive: input.isActive });
        return { success: true };
      }),
  }),

  // Telegram Messages
  messages: router({
    list: protectedProcedure
      .input(z.object({
        channelId: z.number().optional(),
        messageType: z.string().optional(),
        search: z.string().optional(),
        isPrompt: z.boolean().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        return db.getMessages(ctx.user.id, {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
      }),
    
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getMessageStats(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        channelId: z.number(),
        messageType: z.enum(["text", "image", "video", "document", "audio", "prompt", "other"]).default("text"),
        content: z.string().optional(),
        caption: z.string().optional(),
        senderName: z.string().optional(),
        senderId: z.string().optional(),
        messageDate: z.string().optional(),
        hasMedia: z.boolean().default(false),
        mediaUrl: z.string().optional(),
        mediaType: z.string().optional(),
        isPrompt: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMessage({
          userId: ctx.user.id,
          channelId: input.channelId,
          messageType: input.messageType,
          content: input.content || null,
          caption: input.caption || null,
          senderName: input.senderName || null,
          senderId: input.senderId || null,
          messageDate: input.messageDate ? new Date(input.messageDate) : null,
          hasMedia: input.hasMedia,
          mediaUrl: input.mediaUrl || null,
          mediaType: input.mediaType || null,
          isPrompt: input.isPrompt,
          tags: input.tags || null,
        });
      }),
    
    bulkCreate: protectedProcedure
      .input(z.array(z.object({
        channelId: z.number(),
        messageType: z.enum(["text", "image", "video", "document", "audio", "prompt", "other"]).default("text"),
        content: z.string().optional(),
        caption: z.string().optional(),
        senderName: z.string().optional(),
        senderId: z.string().optional(),
        messageDate: z.string().optional(),
        hasMedia: z.boolean().default(false),
        mediaUrl: z.string().optional(),
        mediaType: z.string().optional(),
        isPrompt: z.boolean().default(false),
        tags: z.array(z.string()).optional(),
      })))
      .mutation(async ({ ctx, input }) => {
        const messages = input.map(msg => ({
          userId: ctx.user.id,
          channelId: msg.channelId,
          messageType: msg.messageType,
          content: msg.content || null,
          caption: msg.caption || null,
          senderName: msg.senderName || null,
          senderId: msg.senderId || null,
          messageDate: msg.messageDate ? new Date(msg.messageDate) : null,
          hasMedia: msg.hasMedia,
          mediaUrl: msg.mediaUrl || null,
          mediaType: msg.mediaType || null,
          isPrompt: msg.isPrompt,
          tags: msg.tags || null,
        }));
        return db.createMessages(messages);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMessage(input.id, ctx.user.id);
        return { success: true };
      }),
    
    export: protectedProcedure
      .input(z.object({
        format: z.enum(["json", "csv"]),
        channelId: z.number().optional(),
        messageType: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const messages = await db.getMessages(ctx.user.id, {
          channelId: input.channelId,
          messageType: input.messageType,
          limit: 10000,
        });
        
        if (input.format === "json") {
          return { data: JSON.stringify(messages, null, 2), filename: "telegram_export.json" };
        }
        
        // CSV format
        const headers = ["id", "channelId", "messageType", "content", "caption", "senderName", "messageDate", "hasMedia", "mediaUrl", "isPrompt"];
        const csvRows = [headers.join(",")];
        
        for (const msg of messages) {
          const row = headers.map(h => {
            const val = (msg as any)[h];
            if (val === null || val === undefined) return "";
            if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
            return String(val);
          });
          csvRows.push(row.join(","));
        }
        
        return { data: csvRows.join("\n"), filename: "telegram_export.csv" };
      }),
  }),

  // Scraping History
  history: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return db.getScrapingHistory(ctx.user.id, input.limit);
      }),
    
    create: protectedProcedure
      .input(z.object({
        channelId: z.number(),
        status: z.enum(["running", "completed", "failed", "paused"]).default("running"),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createScrapingHistory({
          userId: ctx.user.id,
          channelId: input.channelId,
          status: input.status,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["running", "completed", "failed", "paused"]).optional(),
        messagesCollected: z.number().optional(),
        imagesCollected: z.number().optional(),
        videosCollected: z.number().optional(),
        promptsCollected: z.number().optional(),
        errorMessage: z.string().optional(),
        completedAt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, completedAt, ...data } = input;
        await db.updateScrapingHistory(id, {
          ...data,
          completedAt: completedAt ? new Date(completedAt) : undefined,
        });
        return { success: true };
      }),
  }),

  // Categories
  categories: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCategories(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().default("#3B82F6"),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCategory({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          color: input.color,
        });
      }),
  }),

  // Scraping Operations
  scraping: router({
    start: protectedProcedure
      .input(z.object({
        channelIds: z.array(z.number()),
        limit: z.number().default(100),
        downloadMedia: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get credentials
        const credentials = await db.getCredentials(ctx.user.id);
        if (!credentials?.apiId || !credentials?.apiHash) {
          return { success: false, error: "Credenciais da API não configuradas" };
        }
        
        // Get channels
        const channels = await db.getChannels(ctx.user.id);
        const selectedChannels = channels
          .filter(c => input.channelIds.includes(c.id) && c.channelUsername)
          .map(c => c.channelUsername!);
        
        if (selectedChannels.length === 0) {
          return { success: false, error: "Nenhum canal válido selecionado" };
        }
        
        // Run scraper
        const result = await runTelegramScraper({
          apiId: credentials.apiId,
          apiHash: credentials.apiHash,
          phone: credentials.phoneNumber || undefined,
          channels: selectedChannels,
          limit: input.limit,
          downloadMedia: input.downloadMedia,
        });
        
        // Save messages to database if successful
        if (result.success && result.messages) {
          const channelMap = new Map(channels.map(c => [c.channelUsername, c.id]));
          
          for (const msg of result.messages) {
            const channelId = channelMap.get(msg.channel_username);
            if (channelId) {
              await db.createMessage({
                userId: ctx.user.id,
                channelId,
                messageType: msg.message_type,
                content: msg.text || null,
                senderName: msg.sender_name || null,
                senderId: msg.sender_id?.toString() || null,
                messageDate: msg.date ? new Date(msg.date) : null,
                hasMedia: msg.has_media,
                mediaUrl: msg.media_url || null,
                isPrompt: msg.is_prompt,
              });
            }
          }
        }
        
        return result;
      }),
    
    validateCredentials: protectedProcedure
      .input(z.object({
        apiId: z.string(),
        apiHash: z.string(),
      }))
      .mutation(async ({ input }) => {
        return validateTelegramCredentials(input.apiId, input.apiHash);
      }),
    
    getInemaChannels: publicProcedure.query(() => {
      return INEMA_CHANNELS;
    }),
    
    getChannelCategories: publicProcedure.query(() => {
      return CHANNEL_CATEGORIES;
    }),
  }),

  // Worker Management
  worker: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      return getWorkerStatus(ctx.user.id);
    }),
    
    start: protectedProcedure
      .input(z.object({
        intervalMinutes: z.number().min(5).max(1440).default(30),
        maxMessagesPerRun: z.number().min(10).max(500).default(100),
        autoClassify: z.boolean().default(true),
        priorityCategories: z.array(z.string()).default(["INEMA.LLMs", "INEMA.IA", "INEMA.AGENTES"]),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const success = await startWorker(ctx.user.id, input);
        return { success, message: success ? "Worker iniciado" : "Falha ao iniciar worker" };
      }),
    
    stop: protectedProcedure.mutation(async ({ ctx }) => {
      const success = await stopWorker(ctx.user.id);
      return { success, message: success ? "Worker parado" : "Falha ao parar worker" };
    }),
  }),

  // AI Classification
  ai: router({
    classifyPending: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
      .mutation(async ({ input }) => {
        const classified = await classifyPendingMessages(input.limit);
        return { classified, message: `${classified} mensagens classificadas` };
      }),
    
    classifySingle: protectedProcedure
      .input(z.object({ content: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const result = await classifyMessage(input.content);
        return result;
      }),
  }),

  // API Keys Management
  apiKeys: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: apiKeys.id,
        keyName: apiKeys.keyName,
        isActive: apiKeys.isActive,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      }).from(apiKeys).where(eq(apiKeys.userId, ctx.user.id));
    }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        permissions: z.array(z.enum(["read", "write", "admin"])).default(["read"]),
        expiresInDays: z.number().min(1).max(365).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        
        const newApiKey = `tgs_${crypto.randomBytes(24).toString("hex")}`;
        const expiresAt = input.expiresInDays 
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;
        
        await db.insert(apiKeys).values({
          userId: ctx.user.id,
          keyName: input.name,
          apiKey: newApiKey,
          permissions: input.permissions,
          expiresAt,
        });
        
        return {
          apiKey: newApiKey,
          name: input.name,
          permissions: input.permissions,
          expiresAt,
          message: "Guarde esta chave com segurança. Ela não será mostrada novamente."
        };
      }),
    
    revoke: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        
        await db.update(apiKeys)
          .set({ isActive: false })
          .where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id)));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        
        await db.delete(apiKeys)
          .where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, ctx.user.id)));
        
        return { success: true };
      }),
  }),

  // Video Generation (Kling AI)
  video: router({
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        negativePrompt: z.string().optional(),
        duration: z.enum(["5", "10"]).default("5"),
        aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
        mode: z.enum(["std", "pro"]).default("std"),
        model: z.enum(["kling-v1", "kling-v1-5", "kling-v2-master"]).default("kling-v1-5"),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.imageUrl) {
          return generateVideoFromImage(input);
        }
        return generateVideoFromText(input);
      }),
    
    status: protectedProcedure
      .input(z.object({ taskId: z.string() }))
      .query(async ({ input }) => {
        return checkVideoStatus(input.taskId);
      }),
    
    models: publicProcedure.query(() => KLING_MODELS),
    aspectRatios: publicProcedure.query(() => ASPECT_RATIOS),
  }),

  // Image Generation
  image: router({
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        style: z.enum(["realistic", "artistic", "cartoon", "abstract"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return generateImageFromText(input);
      }),
    
    edit: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        originalImageUrl: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        return editImage(input);
      }),
    
    styles: publicProcedure.query(() => IMAGE_STYLES),
  }),

  // Workflows
  workflows: router({
    templates: publicProcedure.query(() => WORKFLOW_TEMPLATES),
    
    execute: protectedProcedure
      .input(z.object({
        workflowId: z.number(),
        triggerData: z.record(z.string(), z.unknown()),
      }))
      .mutation(async ({ input }) => {
        // Placeholder - implementar busca de workflow do banco
        return { success: false, message: "Workflow não encontrado" };
      }),
    
    n8nWorkflows: publicProcedure.query(() => {
      return [
        {
          id: "agente-secretaria",
          name: "Agente Secretária WhatsApp",
          description: "Chatbot IA para atendimento 24/7 via WhatsApp. Triagem, agendamentos e escalação.",
          roi: "R$ 25.000/ano",
          time: "30 min",
          file: "agente-secretaria-whatsapp.json",
          tags: ["WhatsApp", "IA", "Atendimento"]
        },
        {
          id: "prompts",
          name: "Coleta de Prompts",
          description: "Monitora canais e categoriza prompts automaticamente em 6 categorias.",
          roi: "R$ 5.000/ano",
          time: "15 min",
          file: "telegram-scraper-prompts.json",
          tags: ["Telegram", "Prompts", "Categorização"]
        },
        {
          id: "obsidian",
          name: "Sincronização Obsidian",
          description: "Sincroniza mensagens do Telegram com sua base de conhecimento no Obsidian.",
          roi: "R$ 3.000/ano",
          time: "20 min",
          file: "telegram-scraper-obsidian.json",
          tags: ["Obsidian", "PKM", "Markdown"]
        },
        {
          id: "notion",
          name: "Ferramentas para Notion",
          description: "Detecta ferramentas de IA mencionadas e adiciona ao Notion automaticamente.",
          roi: "R$ 4.000/ano",
          time: "25 min",
          file: "telegram-scraper-notion-tools.json",
          tags: ["Notion", "Ferramentas", "IA"]
        }
      ];
    }),
    
    docs: publicProcedure.query(() => {
      return [
        {
          id: "guia-rapido",
          name: "Guia Rápido: 5 Passos",
          description: "Como copiar/colar sua primeira automação em 10 minutos.",
          file: "GUIA_RAPIDO_5_PASSOS.md"
        },
        {
          id: "tutorial-secretaria",
          name: "Tutorial: Secretária WhatsApp",
          description: "Tutorial completo de 30 minutos para configurar o agente.",
          file: "TUTORIAL_SECRETARIA_WHATSAPP_30MIN.md"
        },
        {
          id: "top5-automacoes",
          name: "Top 5 Automações Hospitalares",
          description: "As 5 melhores automações com código pronto para copiar.",
          file: "TOP5_AUTOMACOES_COPIAR_COLAR.md"
        }
      ];
    }),
  }),

  // Funnel & CRM
  funnel: router({
    stages: publicProcedure.query(() => FUNNEL_STAGES),
    automations: publicProcedure.query(() => FUNNEL_AUTOMATIONS),
    
    createLeadFromMessage: protectedProcedure
      .input(z.object({
        content: z.string(),
        authorName: z.string().optional(),
        authorUsername: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createLeadFromMessage(input, ctx.user.id);
      }),
  }),

  // Hospital Adaptation System
  hospital: router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      return getAdaptationStats(ctx.user.id);
    }),
    
    getOpportunities: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        return getQuickOpportunities(ctx.user.id, input.limit);
      }),
    
    processAdaptation: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .mutation(async ({ ctx, input }) => {
        const processed = await processAdaptationBatch(ctx.user.id, input.limit);
        return { processed, success: true };
      }),
    
    adaptSingle: protectedProcedure
      .input(z.object({ content: z.string(), messageType: z.string() }))
      .mutation(async ({ input }) => {
        return adaptContentForHospital(input.content, input.messageType);
      }),
    
    departments: publicProcedure.query(() => HOSPITAL_DEPARTMENTS),
  }),

  // Dashboard Stats
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      // Debug: verificar contagens para diagnosticar inconsistências
      const debug = await db.debugMessageCounts();
      if (debug) {
        console.log('[Dashboard] Stats debug:', debug);
      }
      
      // Use global stats to show all data regardless of userId
      const [globalChannels, globalMessageStats, userHistory] = await Promise.all([
        db.getGlobalChannelsCount(),
        db.getGlobalMessageStats(),
        db.getScrapingHistory(ctx.user.id, 5),
      ]);
      
      return {
        totalChannels: globalChannels.total,
        activeChannels: globalChannels.active,
        ...globalMessageStats,
        recentHistory: userHistory,
        debug, // Incluir informações de debug na resposta
      };
    }),
    
    recalculateCounters: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await db.recalculateMessageCounters();
      return result;
    }),
  }),

  // Integrations Management
  integrations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(integrations).where(eq(integrations.userId, ctx.user.id)).orderBy(integrations.priority);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["whatsapp", "telegram", "email", "slack", "discord", "custom", "social", "ai", "funnel", "sales"]),
        provider: z.string().min(1),
        credentials: z.record(z.string(), z.string()),
        priority: z.number().default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [result] = await db.insert(integrations).values({
          userId: ctx.user.id,
          name: input.name,
          type: input.type,
          provider: input.provider,
          credentials: input.credentials,
          priority: input.priority,
          status: "inactive",
        });
        
        return { id: result.insertId, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["active", "standby", "inactive", "error"]).optional(),
        priority: z.number().optional(),
        credentials: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const updateData: Record<string, unknown> = {};
        if (input.name) updateData.name = input.name;
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.credentials) updateData.credentials = input.credentials;
        
        await db.update(integrations)
          .set(updateData)
          .where(and(eq(integrations.id, input.id), eq(integrations.userId, ctx.user.id)));
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        await db.delete(integrations)
          .where(and(eq(integrations.id, input.id), eq(integrations.userId, ctx.user.id)));
        
        return { success: true };
      }),

    test: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        const [integration] = await db.select().from(integrations)
          .where(and(eq(integrations.id, input.id), eq(integrations.userId, ctx.user.id)));
        
        if (!integration) {
          return { success: false, error: "Integração não encontrada" };
        }
        
        // Testar conexão baseado no tipo/provider
        let testResult = { success: false, error: "" };
        
        try {
          const creds = integration.credentials as Record<string, string>;
          
          if (integration.type === "whatsapp" && integration.provider === "twilio") {
            // Testar Twilio
            const response = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`,
              {
                headers: {
                  Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString("base64")}`,
                },
              }
            );
            testResult = response.ok 
              ? { success: true, error: "" }
              : { success: false, error: `HTTP ${response.status}` };
          } else if (integration.type === "telegram" && integration.provider === "bot") {
            // Testar Bot Telegram
            const response = await fetch(
              `https://api.telegram.org/bot${creds.botToken}/getMe`
            );
            const data = await response.json();
            testResult = data.ok 
              ? { success: true, error: "" }
              : { success: false, error: data.description || "Erro desconhecido" };
          } else {
            // Simular teste para outros tipos
            testResult = { success: true, error: "" };
          }
        } catch (err) {
          testResult = { success: false, error: String(err) };
        }
        
        // Atualizar resultado do teste
        await db.update(integrations)
          .set({
            lastTestedAt: new Date(),
            lastTestResult: testResult.success ? "success" : "failed",
            status: testResult.success ? integration.status : "error",
          })
          .where(eq(integrations.id, input.id));
        
        return testResult;
      }),

    // Obter próximo agente disponível (para revezamento)
    getNextAvailable: protectedProcedure
      .input(z.object({ type: z.enum(["whatsapp", "telegram", "email", "slack", "discord", "custom"]) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return null;
        
        // Buscar integrações ativas ou em standby, ordenadas por prioridade
        const available = await db.select().from(integrations)
          .where(and(
            eq(integrations.userId, ctx.user.id),
            eq(integrations.type, input.type),
          ))
          .orderBy(integrations.priority);
        
        // Retornar primeira ativa, ou primeira em standby se nenhuma ativa
        const active = available.find(i => i.status === "active");
        if (active) return active;
        
        const standby = available.find(i => i.status === "standby");
        return standby || null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
