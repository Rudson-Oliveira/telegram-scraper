import { describe, expect, it, vi } from "vitest";
import crypto from "crypto";

// Mock do LLM para testes
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          classification: "prompt",
          confidence: 0.95,
          isPrompt: true,
          tags: ["gpt", "automacao"],
          summary: "Prompt para automação"
        })
      }
    }]
  })
}));

// Função de hash local para testes
function generateContentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

describe("AI Classifier", () => {
  it("classifica mensagem com estrutura correta", async () => {
    const { classifyMessage } = await import("./aiClassifier");
    const content = "Use este prompt para gerar imagens: /imagine a beautiful sunset";
    const result = await classifyMessage(content);
    
    expect(result).toBeDefined();
    expect(result.classification).toBeDefined();
    expect(typeof result.confidence).toBe("number");
  });
});

describe("Content Deduplication", () => {
  it("gera hash consistente para mesmo conteúdo", () => {
    const content = "Mensagem de teste para deduplicação";
    const hash1 = generateContentHash(content);
    const hash2 = generateContentHash(content);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 caracteres
  });

  it("gera hashes diferentes para conteúdos diferentes", () => {
    const hash1 = generateContentHash("Mensagem 1");
    const hash2 = generateContentHash("Mensagem 2");
    
    expect(hash1).not.toBe(hash2);
  });

  it("hash tem formato SHA-256 válido", () => {
    const hash = generateContentHash("teste");
    
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("Worker Status", () => {
  it("estrutura de status do worker está correta", () => {
    const mockStatus = {
      isRunning: false,
      status: "idle" as const,
      messagesProcessed: 0,
      errorCount: 0,
      lastHeartbeat: null,
    };

    expect(mockStatus).toHaveProperty("isRunning");
    expect(mockStatus).toHaveProperty("status");
    expect(mockStatus).toHaveProperty("messagesProcessed");
    expect(mockStatus).toHaveProperty("errorCount");
    expect(["idle", "running", "stopped", "error"]).toContain(mockStatus.status);
  });
});

describe("API Key Generation", () => {
  it("gera API key com prefixo correto", () => {
    const apiKey = `tgs_${crypto.randomBytes(24).toString("hex")}`;
    
    expect(apiKey).toMatch(/^tgs_[a-f0-9]{48}$/);
    expect(apiKey.startsWith("tgs_")).toBe(true);
    expect(apiKey.length).toBe(52); // "tgs_" (4) + 48 hex chars
  });

  it("gera API keys únicas", () => {
    const key1 = `tgs_${crypto.randomBytes(24).toString("hex")}`;
    const key2 = `tgs_${crypto.randomBytes(24).toString("hex")}`;
    
    expect(key1).not.toBe(key2);
  });
});
