/**
 * Webhook Endpoints para Integração com N8N/Make
 * Permite que ferramentas externas recebam dados do Telegram Scraper
 */

import { Router, Request, Response } from "express";
import * as db from "./db";
import { runTelegramScraper } from "./telegramService";

export const webhookRouter = Router();

// Middleware para validar API Key
const validateApiKey = (req: Request, res: Response, next: () => void) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  const userId = req.headers["x-user-id"] || req.query.userId;
  
  if (!apiKey || !userId) {
    res.status(401).json({ error: "API Key e User ID são obrigatórios" });
    return;
  }
  
  // TODO: Validar API Key no banco de dados
  (req as any).userId = Number(userId);
  next();
};

/**
 * GET /api/webhooks/messages
 * Retorna mensagens coletadas (para N8N/Make consumir)
 */
webhookRouter.get("/messages", validateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { channelId, messageType, limit = 50, offset = 0, since } = req.query;
    
    const messages = await db.getMessages(userId, {
      channelId: channelId ? Number(channelId) : undefined,
      messageType: messageType as string | undefined,
      limit: Number(limit),
      offset: Number(offset),
      startDate: since ? new Date(since as string) : undefined,
    });
    
    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
});

/**
 * GET /api/webhooks/channels
 * Retorna canais configurados
 */
webhookRouter.get("/channels", validateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const channels = await db.getChannels(userId);
    
    res.json({
      success: true,
      count: channels.length,
      channels,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar canais" });
  }
});

/**
 * GET /api/webhooks/stats
 * Retorna estatísticas do dashboard
 */
webhookRouter.get("/stats", validateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const [channels, messageStats] = await Promise.all([
      db.getChannels(userId),
      db.getMessageStats(userId),
    ]);
    
    res.json({
      success: true,
      stats: {
        totalChannels: channels.length,
        activeChannels: channels.filter(c => c.isActive).length,
        ...messageStats,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

/**
 * POST /api/webhooks/scrape
 * Inicia uma raspagem (pode ser chamado pelo N8N/Make)
 */
webhookRouter.post("/scrape", validateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { channelIds, limit = 100 } = req.body;
    
    // Get credentials
    const credentials = await db.getCredentials(userId);
    if (!credentials?.apiId || !credentials?.apiHash) {
      res.status(400).json({ error: "Credenciais da API não configuradas" });
      return;
    }
    
    // Get channels
    const channels = await db.getChannels(userId);
    const selectedChannels = channels
      .filter(c => (!channelIds || channelIds.includes(c.id)) && c.channelUsername && c.isActive)
      .map(c => c.channelUsername!);
    
    if (selectedChannels.length === 0) {
      res.status(400).json({ error: "Nenhum canal válido para raspar" });
      return;
    }
    
    // Run scraper
    const result = await runTelegramScraper({
      apiId: credentials.apiId,
      apiHash: credentials.apiHash,
      phone: credentials.phoneNumber || undefined,
      channels: selectedChannels,
      limit,
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao iniciar raspagem" });
  }
});

/**
 * GET /api/webhooks/prompts
 * Retorna apenas mensagens identificadas como prompts/IA
 */
webhookRouter.get("/prompts", validateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await db.getMessages(userId, {
      isPrompt: true,
      limit: Number(limit),
      offset: Number(offset),
    });
    
    res.json({
      success: true,
      count: messages.length,
      prompts: messages,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar prompts" });
  }
});

/**
 * GET /api/webhooks/export
 * Exporta dados em JSON ou CSV
 */
webhookRouter.get("/export", validateApiKey, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { format = "json", channelId, messageType } = req.query;
    
    const messages = await db.getMessages(userId, {
      channelId: channelId ? Number(channelId) : undefined,
      messageType: messageType as string | undefined,
      limit: 10000,
    });
    
    if (format === "csv") {
      const headers = ["id", "channelId", "messageType", "content", "senderName", "messageDate", "hasMedia", "isPrompt"];
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
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=telegram_export.csv");
      res.send(csvRows.join("\n"));
    } else {
      res.json({
        success: true,
        exported_at: new Date().toISOString(),
        count: messages.length,
        messages,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao exportar dados" });
  }
});
