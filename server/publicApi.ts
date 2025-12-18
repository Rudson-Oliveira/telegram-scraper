import { Router, Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { apiKeys, telegramMessages, telegramChannels, scrapingHistory } from "../drizzle/schema";
import { eq, and, desc, like, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Middleware de autenticação por API Key
async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string || req.query.api_key as string;

  if (!apiKey) {
    return res.status(401).json({ 
      error: "API Key required",
      message: "Provide API key via X-API-Key header or api_key query parameter"
    });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database unavailable" });
  }

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.apiKey, apiKey), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!key) {
    return res.status(401).json({ error: "Invalid or inactive API key" });
  }

  // Verificar expiração
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return res.status(401).json({ error: "API key expired" });
  }

  // Atualizar último uso
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  // Adicionar info do usuário ao request
  (req as any).apiKeyUser = {
    userId: key.userId,
    permissions: key.permissions || ["read"]
  };

  next();
}

// Verificar permissão
function hasPermission(req: Request, permission: string): boolean {
  const permissions = (req as any).apiKeyUser?.permissions || [];
  return permissions.includes(permission) || permissions.includes("admin");
}

/**
 * GET /api/v1/messages
 * Lista mensagens com filtros
 */
router.get("/messages", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { userId } = (req as any).apiKeyUser;
    const { 
      type, 
      channel_id, 
      classification, 
      search, 
      limit = "50", 
      offset = "0",
      sort = "desc"
    } = req.query;

    let query = db
      .select({
        id: telegramMessages.id,
        channelId: telegramMessages.channelId,
        messageType: telegramMessages.messageType,
        content: telegramMessages.content,
        caption: telegramMessages.caption,
        senderName: telegramMessages.senderName,
        messageDate: telegramMessages.messageDate,
        hasMedia: telegramMessages.hasMedia,
        mediaUrl: telegramMessages.mediaUrl,
        aiClassification: telegramMessages.aiClassification,
        aiConfidence: telegramMessages.aiConfidence,
        isPrompt: telegramMessages.isPrompt,
        tags: telegramMessages.tags,
        createdAt: telegramMessages.createdAt
      })
      .from(telegramMessages)
      .where(eq(telegramMessages.userId, userId))
      .orderBy(sort === "asc" ? telegramMessages.createdAt : desc(telegramMessages.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const messages = await query;

    // Aplicar filtros em memória (simplificado)
    let filtered = messages;
    if (type) {
      filtered = filtered.filter(m => m.messageType === type);
    }
    if (channel_id) {
      filtered = filtered.filter(m => m.channelId === parseInt(channel_id as string));
    }
    if (classification) {
      filtered = filtered.filter(m => m.aiClassification === classification);
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(m => 
        m.content?.toLowerCase().includes(searchLower) ||
        m.caption?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      data: filtered,
      meta: {
        total: filtered.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error("[Public API] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/messages/:id
 * Busca mensagem por ID
 */
router.get("/messages/:id", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { userId } = (req as any).apiKeyUser;
    const messageId = parseInt(req.params.id);

    const [message] = await db
      .select()
      .from(telegramMessages)
      .where(and(
        eq(telegramMessages.id, messageId),
        eq(telegramMessages.userId, userId)
      ))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/channels
 * Lista canais configurados
 */
router.get("/channels", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { userId } = (req as any).apiKeyUser;

    const channels = await db
      .select()
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId));

    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/stats
 * Estatísticas gerais
 */
router.get("/stats", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { userId } = (req as any).apiKeyUser;

    // Contagens
    const [messagesCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(telegramMessages)
      .where(eq(telegramMessages.userId, userId));

    const [channelsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(telegramChannels)
      .where(eq(telegramChannels.userId, userId));

    const [promptsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(telegramMessages)
      .where(and(
        eq(telegramMessages.userId, userId),
        eq(telegramMessages.isPrompt, true)
      ));

    // Por classificação
    const byClassification = await db
      .select({
        classification: telegramMessages.aiClassification,
        count: sql<number>`count(*)`
      })
      .from(telegramMessages)
      .where(eq(telegramMessages.userId, userId))
      .groupBy(telegramMessages.aiClassification);

    res.json({
      success: true,
      data: {
        totalMessages: messagesCount?.count || 0,
        totalChannels: channelsCount?.count || 0,
        totalPrompts: promptsCount?.count || 0,
        byClassification: byClassification.reduce((acc, item) => {
          if (item.classification) {
            acc[item.classification] = item.count;
          }
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/export
 * Exporta dados em JSON ou CSV
 */
router.get("/export", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { userId } = (req as any).apiKeyUser;
    const { format = "json", type, classification, limit = "1000" } = req.query;

    let messages = await db
      .select()
      .from(telegramMessages)
      .where(eq(telegramMessages.userId, userId))
      .limit(parseInt(limit as string));

    // Filtros
    if (type) {
      messages = messages.filter(m => m.messageType === type);
    }
    if (classification) {
      messages = messages.filter(m => m.aiClassification === classification);
    }

    if (format === "csv") {
      const headers = ["id", "channelId", "messageType", "content", "aiClassification", "aiConfidence", "createdAt"];
      const csv = [
        headers.join(","),
        ...messages.map(m => [
          m.id,
          m.channelId,
          m.messageType,
          `"${(m.content || "").replace(/"/g, '""').substring(0, 500)}"`,
          m.aiClassification || "",
          m.aiConfidence || "",
          m.createdAt
        ].join(","))
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=telegram-export.csv");
      return res.send(csv);
    }

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      count: messages.length,
      data: messages
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/keys
 * Gera nova API Key (requer permissão admin)
 */
router.post("/keys", authenticateApiKey, async (req: Request, res: Response) => {
  try {
    if (!hasPermission(req, "admin")) {
      return res.status(403).json({ error: "Admin permission required" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { userId } = (req as any).apiKeyUser;
    const { name, permissions = ["read"], expiresInDays } = req.body;

    const newApiKey = `tgs_${crypto.randomBytes(24).toString("hex")}`;
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(apiKeys).values({
      userId,
      keyName: name || "API Key",
      apiKey: newApiKey,
      permissions: permissions as string[],
      expiresAt
    });

    res.json({
      success: true,
      data: {
        apiKey: newApiKey,
        name: name || "API Key",
        permissions,
        expiresAt,
        message: "Guarde esta chave com segurança. Ela não será mostrada novamente."
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/health
 * Health check (público)
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

export default router;
