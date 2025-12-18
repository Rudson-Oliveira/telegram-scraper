/**
 * Telegram Scraping Service
 * Integra o script Python de raspagem com o backend Node.js
 */

import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");
const DATA_DIR = path.join(process.cwd(), "data");

// Garantir que os diretórios existam
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface ScrapingOptions {
  apiId: string;
  apiHash: string;
  phone?: string;
  channels: string[];
  limit?: number;
  downloadMedia?: boolean;
}

export interface ScrapingResult {
  success: boolean;
  scraped_at?: string;
  total_messages?: number;
  total_images?: number;
  total_videos?: number;
  total_prompts?: number;
  messages?: any[];
  error?: string;
  outputFile?: string;
}

/**
 * Executa o script de raspagem do Telegram
 */
export async function runTelegramScraper(options: ScrapingOptions): Promise<ScrapingResult> {
  return new Promise((resolve) => {
    const args = [
      path.join(SCRIPTS_DIR, "telegram_scraper.py"),
      "--api-id", options.apiId,
      "--api-hash", options.apiHash,
      "--channels", ...options.channels,
      "--limit", String(options.limit || 100),
      "--format", "json",
    ];

    if (options.phone) {
      args.push("--phone", options.phone);
    }

    if (options.downloadMedia) {
      args.push("--download-media");
    }

    console.log("[TelegramService] Iniciando raspagem...");
    console.log("[TelegramService] Canais:", options.channels);

    const childProcess = spawn("python3", args, {
      cwd: process.cwd(),
      env: { ...globalThis.process.env },
    });

    let stdout = "";
    let stderr = "";

    childProcess.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
      console.log("[TelegramService]", data.toString().trim());
    });

    childProcess.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
      console.error("[TelegramService Error]", data.toString().trim());
    });

    childProcess.on("close", (code: number | null) => {
      if (code === 0) {
        // Tentar ler o arquivo de resultados mais recente
        try {
          const files = fs.readdirSync(DATA_DIR)
            .filter(f => f.startsWith("scrape_results_") && f.endsWith(".json"))
            .sort()
            .reverse();

          if (files.length > 0) {
            const latestFile = path.join(DATA_DIR, files[0]);
            const results = JSON.parse(fs.readFileSync(latestFile, "utf-8"));
            
            resolve({
              success: true,
              scraped_at: results.scraped_at,
              total_messages: results.total_messages,
              total_images: results.total_images,
              total_videos: results.total_videos,
              total_prompts: results.total_prompts,
              messages: results.messages,
              outputFile: latestFile,
            });
          } else {
            resolve({
              success: true,
              total_messages: 0,
              messages: [],
            });
          }
        } catch (error: unknown) {
          resolve({
            success: false,
            error: `Erro ao ler resultados: ${error}`,
          });
        }
      } else {
        resolve({
          success: false,
          error: stderr || `Processo terminou com código ${code}`,
        });
      }
    });

    childProcess.on("error", (error: Error) => {
      resolve({
        success: false,
        error: `Erro ao executar script: ${error.message}`,
      });
    });
  });
}

/**
 * Verifica se as credenciais do Telegram são válidas
 */
export async function validateTelegramCredentials(
  apiId: string,
  apiHash: string
): Promise<{ valid: boolean; error?: string }> {
  // Validação básica
  if (!apiId || !apiHash) {
    return { valid: false, error: "API ID e API Hash são obrigatórios" };
  }

  if (!/^\d+$/.test(apiId)) {
    return { valid: false, error: "API ID deve conter apenas números" };
  }

  if (apiHash.length < 20) {
    return { valid: false, error: "API Hash parece inválido (muito curto)" };
  }

  return { valid: true };
}

/**
 * Lista os arquivos de resultados de raspagem
 */
export function listScrapingResults(): string[] {
  if (!fs.existsSync(DATA_DIR)) {
    return [];
  }

  return fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith("scrape_results_") && f.endsWith(".json"))
    .sort()
    .reverse();
}

/**
 * Lê um arquivo de resultados específico
 */
export function readScrapingResult(filename: string): any | null {
  const filepath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Canais pré-configurados do INEMA.vip
 * Baseado nos grupos reais identificados no Telegram do usuário
 * Link de acesso VIP: https://t.me/+WfQSB6Ndr35iZWRh
 */
export const INEMA_CHANNELS = [
  // Grupos INEMA Principais
  { name: "INEMA.VIP", username: "+WfQSB6Ndr35iZWRh", description: "Grupo VIP principal - Novidades, Dicas e Oportunidades", type: "supergroup" as const, category: "principal" },
  { name: "INEMA.DEV", username: "INEMA_DEV", description: "Desenvolvimento e Vibe Code", type: "supergroup" as const, category: "desenvolvimento" },
  { name: "INEMA.N8N", username: "INEMA_N8N", description: "Automações com N8N", type: "supergroup" as const, category: "automacao" },
  { name: "INEMA.Make", username: "INEMA_Make", description: "Automações com Make/Integromat", type: "supergroup" as const, category: "automacao" },
  { name: "INEMA.LLMs", username: "INEMA_LLMs", description: "Large Language Models e IA", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.IA", username: "INEMA_IA", description: "Inteligência Artificial geral", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.AGENTES", username: "INEMA_AGENTES", description: "Agentes de IA e automação", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.IMAGENS", username: "INEMA_IMAGENS", description: "Geração de imagens com IA", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.AVATARES", username: "INEMA_AVATARES", description: "Avatares e vídeos com IA", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.MUSICAL", username: "INEMA_MUSICAL", description: "Música e áudio com IA", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.MKT", username: "INEMA_MKT", description: "Marketing digital", type: "supergroup" as const, category: "marketing" },
  { name: "INEMA.CPA", username: "INEMA_CPA", description: "CPA e afiliados", type: "supergroup" as const, category: "marketing" },
  { name: "INEMA.VISION", username: "INEMA_VISION", description: "Visão computacional", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.INFRA", username: "INEMA_INFRA", description: "Infraestrutura e DevOps", type: "supergroup" as const, category: "desenvolvimento" },
  { name: "INEMA.TIA", username: "INEMA_TIA", description: "Tecnologia e IA avançada", type: "supergroup" as const, category: "ia" },
  { name: "INEMA.FTD", username: "INEMA_FTD", description: "Ferramentas e Testes", type: "supergroup" as const, category: "ferramentas" },
  { name: "INEMA.Discussao", username: "INEMA_Discussao", description: "Discussões gerais", type: "supergroup" as const, category: "comunidade" },
  { name: "INEMA.Educ", username: "INEMA_Educ", description: "Educação e tutoriais", type: "supergroup" as const, category: "educacao" },
  { name: "INEMA.TOOLS", username: "INEMA_TOOLS", description: "Ferramentas e recursos", type: "supergroup" as const, category: "ferramentas" },
  { name: "INEMA.ADULTO", username: "INEMA_ADULTO", description: "Conteúdo adulto", type: "supergroup" as const, category: "adulto" },
  
  // Grupos pessoais do Rudson
  { name: "RUDSON PROMPT", username: "RUDSON_PROMPT", description: "Prompts pessoais do Rudson", type: "group" as const, category: "pessoal" },
  { name: "AUTOMACAO RUDSON", username: "AUTOMACAO_RUDSON", description: "Automações pessoais", type: "group" as const, category: "pessoal" },
  { name: "ESTUDOS RUDSON", username: "ESTUDOS_RUDSON", description: "Estudos e anotações", type: "group" as const, category: "pessoal" },
  { name: "Rudson ESOTERISMO", username: "Rudson_ESOTERISMO", description: "Conteúdo esotérico", type: "group" as const, category: "pessoal" },
];

/**
 * Categorias de canais para organização
 */
export const CHANNEL_CATEGORIES = [
  { id: "principal", name: "Principal", color: "#3B82F6" },
  { id: "ia", name: "Inteligência Artificial", color: "#8B5CF6" },
  { id: "automacao", name: "Automação", color: "#10B981" },
  { id: "desenvolvimento", name: "Desenvolvimento", color: "#F59E0B" },
  { id: "marketing", name: "Marketing", color: "#EF4444" },
  { id: "ferramentas", name: "Ferramentas", color: "#6366F1" },
  { id: "educacao", name: "Educação", color: "#14B8A6" },
  { id: "comunidade", name: "Comunidade", color: "#EC4899" },
  { id: "adulto", name: "Adulto", color: "#DC2626" },
  { id: "pessoal", name: "Pessoal", color: "#6B7280" },
];
