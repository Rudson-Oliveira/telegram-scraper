import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Telegram API credentials for each user
 */
export const telegramCredentials = mysqlTable("telegram_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  apiId: varchar("apiId", { length: 32 }).notNull(),
  apiHash: varchar("apiHash", { length: 64 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  sessionString: text("sessionString"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramCredential = typeof telegramCredentials.$inferSelect;
export type InsertTelegramCredential = typeof telegramCredentials.$inferInsert;

/**
 * Telegram channels/groups to scrape
 */
export const telegramChannels = mysqlTable("telegram_channels", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channelName: varchar("channelName", { length: 255 }).notNull(),
  channelId: varchar("channelId", { length: 64 }),
  channelUsername: varchar("channelUsername", { length: 255 }),
  channelType: mysqlEnum("channelType", ["channel", "group", "supergroup"]).default("channel").notNull(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  lastScrapedAt: timestamp("lastScrapedAt"),
  totalMessages: int("totalMessages").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramChannel = typeof telegramChannels.$inferSelect;
export type InsertTelegramChannel = typeof telegramChannels.$inferInsert;

/**
 * Scraped messages from Telegram
 */
export const telegramMessages = mysqlTable("telegram_messages", {
  id: int("id").autoincrement().primaryKey(),
  channelId: int("channelId").notNull(),
  userId: int("userId").notNull(),
  telegramMessageId: bigint("telegramMessageId", { mode: "number" }),
  messageType: mysqlEnum("messageType", ["text", "image", "video", "document", "audio", "prompt", "other"]).default("text").notNull(),
  content: text("content"),
  caption: text("caption"),
  senderName: varchar("senderName", { length: 255 }),
  senderId: varchar("senderId", { length: 64 }),
  messageDate: timestamp("messageDate"),
  hasMedia: boolean("hasMedia").default(false).notNull(),
  mediaUrl: text("mediaUrl"),
  mediaType: varchar("mediaType", { length: 64 }),
  mediaSize: int("mediaSize"),
  metadata: json("metadata"),
  tags: json("tags"),
  isPrompt: boolean("isPrompt").default(false).notNull(),
  // Deduplicação
  contentHash: varchar("contentHash", { length: 64 }),
  // Classificação por IA
  aiClassification: mysqlEnum("aiClassification", [
    "prompt", "ferramenta", "tutorial", "noticia", "discussao", 
    "recurso", "codigo", "imagem_ia", "video_ia", "audio_ia", 
    "workflow", "healthcare", "outro"
  ]),
  aiConfidence: int("aiConfidence"),
  aiClassifiedAt: timestamp("aiClassifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelegramMessage = typeof telegramMessages.$inferSelect;
export type InsertTelegramMessage = typeof telegramMessages.$inferInsert;

/**
 * Scraping history and statistics
 */
export const scrapingHistory = mysqlTable("scraping_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  channelId: int("channelId").notNull(),
  status: mysqlEnum("status", ["running", "completed", "failed", "paused"]).default("running").notNull(),
  messagesCollected: int("messagesCollected").default(0).notNull(),
  imagesCollected: int("imagesCollected").default(0).notNull(),
  videosCollected: int("videosCollected").default(0).notNull(),
  promptsCollected: int("promptsCollected").default(0).notNull(),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ScrapingHistory = typeof scrapingHistory.$inferSelect;
export type InsertScrapingHistory = typeof scrapingHistory.$inferInsert;

/**
 * Content categories for organization
 */
export const contentCategories = mysqlTable("content_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3B82F6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentCategory = typeof contentCategories.$inferSelect;
export type InsertContentCategory = typeof contentCategories.$inferInsert;

/**
 * API Keys for external integrations (N8N, Make, Zapier, etc.)
 */
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyName: varchar("keyName", { length: 100 }).notNull(),
  apiKey: varchar("apiKey", { length: 64 }).notNull().unique(),
  permissions: json("permissions").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

/**
 * Scraping worker status and configuration
 */
export const scrapingWorkers = mysqlTable("scraping_workers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["idle", "running", "paused", "error"]).default("idle").notNull(),
  currentChannelId: int("currentChannelId"),
  lastHeartbeat: timestamp("lastHeartbeat"),
  messagesProcessed: int("messagesProcessed").default(0).notNull(),
  errorCount: int("errorCount").default(0).notNull(),
  lastError: text("lastError"),
  config: json("config").$type<{
    intervalMinutes: number;
    maxMessagesPerRun: number;
    autoClassify: boolean;
    priorityCategories: string[];
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScrapingWorker = typeof scrapingWorkers.$inferSelect;
export type InsertScrapingWorker = typeof scrapingWorkers.$inferInsert;


/**
 * Integration configurations for multiple providers
 */
export const integrations = mysqlTable("integrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["whatsapp", "telegram", "email", "slack", "discord", "custom", "social", "ai", "funnel", "sales"]).notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // twilio, evolution, gmail, etc.
  status: mysqlEnum("status", ["active", "standby", "inactive", "error"]).default("inactive").notNull(),
  priority: int("priority").default(1).notNull(),
  credentials: json("credentials").$type<{
    accountSid?: string;
    authToken?: string;
    apiKey?: string;
    apiSecret?: string;
    phoneNumber?: string;
    botToken?: string;
    apiId?: string;
    apiHash?: string;
    email?: string;
    password?: string;
    smtpHost?: string;
    smtpPort?: number;
    imapHost?: string;
    imapPort?: number;
    webhookUrl?: string;
    baseUrl?: string;
    headers?: Record<string, string>;
  }>(),
  stats: json("stats").$type<{
    totalRequests: number;
    successCount: number;
    errorCount: number;
    lastUsed?: string;
    lastError?: string;
    avgResponseTime?: number;
  }>(),
  isDefault: boolean("isDefault").default(false).notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestResult: mysqlEnum("lastTestResult", ["success", "failed", "pending"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = typeof integrations.$inferInsert;

/**
 * Agent instances for rotation/load balancing
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  integrationId: int("integrationId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["primary", "backup", "loadbalance"]).default("primary").notNull(),
  status: mysqlEnum("status", ["online", "busy", "offline", "error"]).default("offline").notNull(),
  currentLoad: int("currentLoad").default(0).notNull(),
  maxLoad: int("maxLoad").default(10).notNull(),
  lastActiveAt: timestamp("lastActiveAt"),
  failureCount: int("failureCount").default(0).notNull(),
  successCount: int("successCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;


/**
 * Auto-save state for user sessions
 */
export const autoSaveState = mysqlTable("auto_save_state", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stateKey: varchar("stateKey", { length: 64 }).notNull(),
  stateData: json("stateData"),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutoSaveState = typeof autoSaveState.$inferSelect;
export type InsertAutoSaveState = typeof autoSaveState.$inferInsert;
