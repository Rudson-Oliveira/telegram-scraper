import { eq, desc, like, and, sql, or, between } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  telegramCredentials, InsertTelegramCredential, TelegramCredential,
  telegramChannels, InsertTelegramChannel, TelegramChannel,
  telegramMessages, InsertTelegramMessage, TelegramMessage,
  scrapingHistory, InsertScrapingHistory, ScrapingHistory,
  contentCategories, InsertContentCategory, ContentCategory
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ TELEGRAM CREDENTIALS ============
export async function saveCredentials(data: InsertTelegramCredential) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(telegramCredentials)
    .where(eq(telegramCredentials.userId, data.userId)).limit(1);
  
  if (existing.length > 0) {
    await db.update(telegramCredentials)
      .set({ apiId: data.apiId, apiHash: data.apiHash, phoneNumber: data.phoneNumber })
      .where(eq(telegramCredentials.userId, data.userId));
    return existing[0];
  }
  
  const result = await db.insert(telegramCredentials).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getCredentials(userId: number): Promise<TelegramCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(telegramCredentials)
    .where(eq(telegramCredentials.userId, userId)).limit(1);
  return result[0];
}

// ============ TELEGRAM CHANNELS ============
export async function createChannel(data: InsertTelegramChannel) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(telegramChannels).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getChannels(userId: number): Promise<TelegramChannel[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(telegramChannels)
    .where(eq(telegramChannels.userId, userId))
    .orderBy(telegramChannels.id); // Order by ID to show channels with messages first
}

export async function getChannelById(id: number, userId: number): Promise<TelegramChannel | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(telegramChannels)
    .where(and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId))).limit(1);
  return result[0];
}

export async function updateChannel(id: number, userId: number, data: Partial<InsertTelegramChannel>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(telegramChannels).set(data)
    .where(and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)));
}

export async function deleteChannel(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(telegramChannels)
    .where(and(eq(telegramChannels.id, id), eq(telegramChannels.userId, userId)));
}

// ============ TELEGRAM MESSAGES ============
export async function createMessage(data: InsertTelegramMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(telegramMessages).values(data);
  return { id: result[0].insertId, ...data };
}

export async function createMessages(data: InsertTelegramMessage[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  await db.insert(telegramMessages).values(data);
  return data;
}

export async function getMessages(userId: number, filters?: {
  channelId?: number;
  messageType?: string;
  search?: string;
  isPrompt?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<TelegramMessage[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(telegramMessages.userId, userId)];
  
  if (filters?.channelId) {
    conditions.push(eq(telegramMessages.channelId, filters.channelId));
  }
  if (filters?.messageType) {
    conditions.push(eq(telegramMessages.messageType, filters.messageType as any));
  }
  if (filters?.isPrompt !== undefined) {
    conditions.push(eq(telegramMessages.isPrompt, filters.isPrompt));
  }
  if (filters?.search) {
    conditions.push(or(
      like(telegramMessages.content, `%${filters.search}%`),
      like(telegramMessages.caption, `%${filters.search}%`)
    )!);
  }
  if (filters?.startDate && filters?.endDate) {
    conditions.push(between(telegramMessages.messageDate, filters.startDate, filters.endDate));
  }
  
  let query = db.select().from(telegramMessages)
    .where(and(...conditions))
    .orderBy(desc(telegramMessages.messageDate))
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
  
  return query;
}

export async function getMessageStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, images: 0, videos: 0, prompts: 0, text: 0 };
  
  const total = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages).where(eq(telegramMessages.userId, userId));
  
  const images = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(and(eq(telegramMessages.userId, userId), eq(telegramMessages.messageType, "image")));
  
  const videos = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(and(eq(telegramMessages.userId, userId), eq(telegramMessages.messageType, "video")));
  
  const prompts = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(and(eq(telegramMessages.userId, userId), eq(telegramMessages.isPrompt, true)));
  
  const text = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(and(eq(telegramMessages.userId, userId), eq(telegramMessages.messageType, "text")));
  
  return {
    total: Number(total[0]?.count || 0),
    images: Number(images[0]?.count || 0),
    videos: Number(videos[0]?.count || 0),
    prompts: Number(prompts[0]?.count || 0),
    text: Number(text[0]?.count || 0),
  };
}

// Global stats (no userId filter) - for public dashboard
export async function getGlobalMessageStats() {
  const db = await getDb();
  if (!db) return { total: 0, images: 0, videos: 0, prompts: 0, text: 0 };
  
  const total = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages);
  
  const images = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(eq(telegramMessages.messageType, "image"));
  
  const videos = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(eq(telegramMessages.messageType, "video"));
  
  const prompts = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(eq(telegramMessages.isPrompt, true));
  
  const text = await db.select({ count: sql<number>`count(*)` })
    .from(telegramMessages)
    .where(eq(telegramMessages.messageType, "text"));
  
  return {
    total: Number(total[0]?.count || 0),
    images: Number(images[0]?.count || 0),
    videos: Number(videos[0]?.count || 0),
    prompts: Number(prompts[0]?.count || 0),
    text: Number(text[0]?.count || 0),
  };
}

// Global channels count
export async function getGlobalChannelsCount() {
  const db = await getDb();
  if (!db) return { total: 0, active: 0 };
  
  const total = await db.select({ count: sql<number>`count(*)` })
    .from(telegramChannels);
  
  const active = await db.select({ count: sql<number>`count(*)` })
    .from(telegramChannels)
    .where(eq(telegramChannels.isActive, true));
  
  return {
    total: Number(total[0]?.count || 0),
    active: Number(active[0]?.count || 0),
  };
}

export async function deleteMessage(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(telegramMessages)
    .where(and(eq(telegramMessages.id, id), eq(telegramMessages.userId, userId)));
}

// ============ SCRAPING HISTORY ============
export async function createScrapingHistory(data: InsertScrapingHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scrapingHistory).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getScrapingHistory(userId: number, limit = 20): Promise<ScrapingHistory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scrapingHistory)
    .where(eq(scrapingHistory.userId, userId))
    .orderBy(desc(scrapingHistory.startedAt))
    .limit(limit);
}

export async function updateScrapingHistory(id: number, data: Partial<InsertScrapingHistory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scrapingHistory).set(data).where(eq(scrapingHistory.id, id));
}

// ============ CONTENT CATEGORIES ============
export async function createCategory(data: InsertContentCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentCategories).values(data);
  return { id: result[0].insertId, ...data };
}

export async function getCategories(userId: number): Promise<ContentCategory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentCategories)
    .where(eq(contentCategories.userId, userId))
    .orderBy(contentCategories.name);
}

// ============ DEBUG & CONSISTENCY FUNCTIONS ============
/**
 * Debug function to check message count consistency across tables
 * Used to diagnose dashboard counter discrepancies
 */
export async function debugMessageCounts() {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const totalMessages = await db.select({ count: sql<number>`count(*)` })
      .from(telegramMessages);
    
    const totalHistory = await db.select({ count: sql<number>`count(*)` })
      .from(scrapingHistory);
    
    const sumHistoryMessages = await db.select({ 
      sum: sql<number>`sum(messagesCollected)` 
    }).from(scrapingHistory);
    
    console.log('=== DEBUG MESSAGE COUNTS ===');
    console.log('Total messages in telegram_messages:', totalMessages[0]?.count);
    console.log('Total scraping sessions:', totalHistory[0]?.count);
    console.log('Sum of messagesCollected in history:', sumHistoryMessages[0]?.sum);
    console.log('===========================');
    
    return {
      totalMessages: Number(totalMessages[0]?.count || 0),
      totalSessions: Number(totalHistory[0]?.count || 0),
      sumHistoryMessages: Number(sumHistoryMessages[0]?.sum || 0),
    };
  } catch (error) {
    console.error('[Database] Error in debugMessageCounts:', error);
    return null;
  }
}

/**
 * Recalculate and sync message counters between tables
 * Should be run periodically or after bulk operations
 */
export async function recalculateMessageCounters() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // Get actual message counts per channel
    const channelCounts = await db
      .select({
        channelId: telegramMessages.channelId,
        count: sql<number>`count(*)`
      })
      .from(telegramMessages)
      .groupBy(telegramMessages.channelId);
    
    console.log('[Database] Recalculated message counts for', channelCounts.length, 'channels');
    
    return {
      success: true,
      channelsUpdated: channelCounts.length,
      counts: channelCounts.map(c => ({
        channelId: c.channelId,
        count: Number(c.count)
      }))
    };
  } catch (error) {
    console.error('[Database] Error recalculating counters:', error);
    throw error;
  }
}
