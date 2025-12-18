import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { telegramMessages } from "../drizzle/schema";
import { eq, isNull } from "drizzle-orm";
import crypto from "crypto";

// Tipos de classificação
export type AIClassification = 
  | "prompt" 
  | "ferramenta" 
  | "tutorial" 
  | "noticia" 
  | "discussao" 
  | "recurso" 
  | "codigo" 
  | "imagem_ia" 
  | "video_ia" 
  | "audio_ia" 
  | "workflow"
  | "healthcare"
  | "outro";

interface ClassificationResult {
  classification: AIClassification;
  confidence: number;
  reasoning: string;
  tags?: string[];
  relevanceScore?: number; // 0-5 for healthcare/automation relevance
  language?: string;
}

/**
 * Gera hash MD5 do conteúdo para deduplicação
 */
export function generateContentHash(content: string): string {
  return crypto.createHash("md5").update(content.trim().toLowerCase()).digest("hex");
}

/**
 * Verifica se uma mensagem já existe no banco (deduplicação)
 */
export async function checkDuplicate(contentHash: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const existing = await db
    .select({ id: telegramMessages.id })
    .from(telegramMessages)
    .where(eq(telegramMessages.contentHash, contentHash))
    .limit(1);

  return existing.length > 0;
}

/**
 * Classifica uma mensagem usando IA
 */
export async function classifyMessage(content: string): Promise<ClassificationResult> {
  const systemPrompt = `Você é um classificador de conteúdo especializado em tecnologia, IA e automação.
Analise o conteúdo e classifique em UMA das seguintes categorias:

- prompt: Prompts para LLMs, engenharia de prompts, templates de prompt
- ferramenta: Ferramentas de IA, apps, plataformas, serviços (ex: ChatGPT, Midjourney, N8N)
- tutorial: Tutoriais, guias passo-a-passo, how-to
- noticia: Notícias, atualizações, lançamentos
- discussao: Discussões, perguntas, debates
- recurso: Recursos, assets, templates, arquivos úteis
- codigo: Código, scripts, snippets de programação
- imagem_ia: Conteúdo sobre geração de imagens com IA
- video_ia: Conteúdo sobre geração de vídeos com IA
- audio_ia: Conteúdo sobre geração de áudio/música com IA
- workflow: Workflows, automações N8N/Make/Zapier, integrações
- healthcare: Conteúdo específico para saúde, hospitais, clínicas
- outro: Não se encaixa em nenhuma categoria acima

Além disso, avalie:
- relevanceScore (0-5): Relevância para healthcare/automação hospitalar
- tags: Lista de até 5 tags relevantes (ex: ["GPT", "WhatsApp", "Automação"])

Responda APENAS em JSON válido com o formato:
{
  "classification": "categoria",
  "confidence": 0-100,
  "reasoning": "breve explicação",
  "tags": ["tag1", "tag2"],
  "relevanceScore": 0-5
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classifique este conteúdo:\n\n${content.substring(0, 2000)}` }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "classification_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              classification: { 
                type: "string",
                enum: ["prompt", "ferramenta", "tutorial", "noticia", "discussao", "recurso", "codigo", "imagem_ia", "video_ia", "audio_ia", "workflow", "healthcare", "outro"]
              },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
              reasoning: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              relevanceScore: { type: "integer", minimum: 0, maximum: 5 }
            },
            required: ["classification", "confidence", "reasoning", "tags", "relevanceScore"],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    const result = JSON.parse(contentStr || "{}");
    return {
      classification: result.classification || "outro",
      confidence: result.confidence || 50,
      reasoning: result.reasoning || "",
      tags: result.tags || [],
      relevanceScore: result.relevanceScore || 0,
      language: "pt"
    };
  } catch (error) {
    console.error("[AI Classifier] Error:", error);
    return {
      classification: "outro",
      confidence: 0,
      reasoning: "Erro na classificação"
    };
  }
}

/**
 * Classifica mensagens pendentes em batch
 */
export async function classifyPendingMessages(limit: number = 10): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Buscar mensagens não classificadas
  const pendingMessages = await db
    .select()
    .from(telegramMessages)
    .where(isNull(telegramMessages.aiClassification))
    .limit(limit);

  let classified = 0;

  for (const message of pendingMessages) {
    if (!message.content) continue;

    const result = await classifyMessage(message.content);

    await db
      .update(telegramMessages)
      .set({
        aiClassification: result.classification,
        aiConfidence: result.confidence,
        aiClassifiedAt: new Date()
      })
      .where(eq(telegramMessages.id, message.id));

    classified++;
    
    // Pequeno delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return classified;
}

/**
 * Processa uma nova mensagem: deduplica e classifica
 */
export async function processNewMessage(
  content: string,
  userId: number,
  autoClassify: boolean = true
): Promise<{ isDuplicate: boolean; hash: string; classification?: ClassificationResult }> {
  const hash = generateContentHash(content);
  const isDuplicate = await checkDuplicate(hash, userId);

  if (isDuplicate) {
    return { isDuplicate: true, hash };
  }

  let classification: ClassificationResult | undefined;
  if (autoClassify) {
    classification = await classifyMessage(content);
  }

  return { isDuplicate: false, hash, classification };
}
