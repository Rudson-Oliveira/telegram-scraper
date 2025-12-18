import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  getChannels: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      channelName: "Test Channel",
      channelUsername: "testchannel",
      channelType: "channel",
      isActive: true,
      totalMessages: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createChannel: vi.fn().mockResolvedValue({
    id: 2,
    channelName: "New Channel",
    channelType: "channel",
  }),
  deleteChannel: vi.fn().mockResolvedValue(undefined),
  updateChannel: vi.fn().mockResolvedValue(undefined),
  getMessageStats: vi.fn().mockResolvedValue({
    total: 100,
    images: 20,
    videos: 10,
    prompts: 5,
    text: 65,
  }),
  getGlobalMessageStats: vi.fn().mockResolvedValue({
    total: 100,
    images: 20,
    videos: 10,
    prompts: 5,
    text: 65,
  }),
  getGlobalChannelsCount: vi.fn().mockResolvedValue({
    total: 1,
    active: 1,
  }),
  getScrapingHistory: vi.fn().mockResolvedValue([]),
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

describe("channels router", () => {
  it("lists channels for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const channels = await caller.channels.list();

    expect(channels).toHaveLength(1);
    expect(channels[0].channelName).toBe("Test Channel");
  });

  it("creates a new channel", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.channels.create({
      channelName: "New Channel",
      channelType: "channel",
    });

    expect(result.channelName).toBe("New Channel");
  });

  it("deletes a channel", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.channels.delete({ id: 1 });

    expect(result.success).toBe(true);
  });

  it("toggles channel active status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.channels.toggleActive({ id: 1, isActive: false });

    expect(result.success).toBe(true);
  });
});

describe("dashboard router", () => {
  it("returns dashboard stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats.totalChannels).toBe(1);
    expect(stats.total).toBe(100);
    expect(stats.images).toBe(20);
    expect(stats.videos).toBe(10);
    expect(stats.prompts).toBe(5);
  });
});
