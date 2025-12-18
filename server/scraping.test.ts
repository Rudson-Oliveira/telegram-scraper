import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getCredentials: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    apiId: "12345678",
    apiHash: "abcdef1234567890abcdef1234567890",
    phoneNumber: "+5535998352323",
  }),
  getChannels: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      channelName: "INEMA VIP",
      channelUsername: "inema_vip",
      channelType: "channel",
      isActive: true,
      totalMessages: 0,
    },
  ]),
  createChannel: vi.fn().mockResolvedValue({ id: 1 }),
  deleteChannel: vi.fn().mockResolvedValue(undefined),
  updateChannel: vi.fn().mockResolvedValue(undefined),
  getMessageStats: vi.fn().mockResolvedValue({
    total: 0,
    images: 0,
    videos: 0,
    prompts: 0,
    text: 0,
  }),
  getScrapingHistory: vi.fn().mockResolvedValue([]),
  saveCredentials: vi.fn().mockResolvedValue({ id: 1 }),
  createMessage: vi.fn().mockResolvedValue({ id: 1 }),
}));

// Mock telegram service
vi.mock("./telegramService", () => ({
  runTelegramScraper: vi.fn().mockResolvedValue({
    success: true,
    total_messages: 10,
    messages: [],
  }),
  validateTelegramCredentials: vi.fn().mockResolvedValue({ valid: true }),
  INEMA_CHANNELS: [
    { name: "INEMA.VIP", username: "+WfQSB6Ndr35iZWRh", description: "Grupo VIP principal", type: "supergroup", category: "principal" },
    { name: "INEMA.N8N", username: "INEMA_N8N", description: "Automações com N8N", type: "supergroup", category: "automacao" },
    { name: "INEMA.IA", username: "INEMA_IA", description: "Inteligência Artificial", type: "supergroup", category: "ia" },
  ],
  CHANNEL_CATEGORIES: [
    { id: "principal", name: "Principal", color: "#3B82F6" },
    { id: "ia", name: "Inteligência Artificial", color: "#8B5CF6" },
    { id: "automacao", name: "Automação", color: "#10B981" },
  ],
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("scraping router", () => {
  it("returns INEMA channels list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const channels = await caller.scraping.getInemaChannels();

    expect(channels).toHaveLength(3);
    expect(channels[0].name).toBe("INEMA.VIP");
    expect(channels[0].category).toBe("principal");
  });

  it("validates telegram credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scraping.validateCredentials({
      apiId: "12345678",
      apiHash: "abcdef1234567890abcdef1234567890",
    });

    expect(result.valid).toBe(true);
  });
});

describe("credentials router", () => {
  it("gets user credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const credentials = await caller.credentials.get();

    expect(credentials).toBeDefined();
    expect(credentials?.apiId).toBe("12345678");
  });

  it("saves new credentials", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.credentials.save({
      apiId: "87654321",
      apiHash: "newapihash1234567890abcdef123456",
      phoneNumber: "+5535998352323",
    });

    expect(result).toBeDefined();
  });
});
