import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { telegramMessages } from "../drizzle/schema";
import { eq, and, or, isNull, desc, sql } from "drizzle-orm";

// Tipos para adaptação hospitalar
export interface HospitalAdaptation {
  adaptedTitle: string;
  adaptedDescription: string;
  hospitalContext: string;
  usabilityScore: number; // 0-5
  complexityScore: number; // 1-10
  roiPotential: number; // valor estimado em R$
  implementationTime: string;
  requiredResources: string[];
  adaptedWorkflow?: string;
  adaptedCode?: string;
  targetDepartments: string[];
  complianceNotes: string;
  lgpdCompliant: boolean;
  cfmCompliant: boolean;
}

// Departamentos hospitalares alvo
const HOSPITAL_DEPARTMENTS = [
  "UTI",
  "Emergência",
  "Centro Cirúrgico",
  "Farmácia",
  "Laboratório",
  "Radiologia",
  "Enfermagem",
  "Administração",
  "Faturamento",
  "RH",
  "TI",
  "Qualidade",
  "SCIH",
  "Nutrição",
  "Fisioterapia"
];

// Prompt do sistema para adaptação hospitalar
const HOSPITAL_ADAPTATION_PROMPT = `Você é um especialista em transformação digital hospitalar e IA na saúde.
Sua missão é adaptar conteúdo de automação/IA do INEMA VIP para o contexto HOSPITALAR SAÚDE.

CONTEXTO DO USUÁRIO:
- CEO Rudson Oliveira - Hospitalar Saúde
- Foco: Automação hospitalar, IA na saúde, compliance LGPD/CFM
- Objetivo: Identificar oportunidades de automação com ROI mensurável

CRITÉRIOS DE AVALIAÇÃO (usabilityScore 0-5):
5 = Implementação imediata, ROI alto, baixa complexidade
4 = Implementação em 1 semana, ROI médio-alto
3 = Implementação em 1 mês, ROI médio
2 = Requer adaptação significativa
1 = Conceito interessante, mas difícil aplicação
0 = Não aplicável ao contexto hospitalar

DEPARTAMENTOS ALVO:
${HOSPITAL_DEPARTMENTS.join(", ")}

COMPLIANCE OBRIGATÓRIO:
- LGPD (Lei Geral de Proteção de Dados)
- CFM 2.314/2022 (Telemedicina)
- ISO 14971 (Gestão de Risco em Dispositivos Médicos)
- ISO 27001 (Segurança da Informação)

Responda APENAS em JSON válido com o formato especificado.`;

/**
 * Adapta conteúdo do INEMA para contexto Hospitalar Saúde
 */
export async function adaptContentForHospital(content: string, messageType: string): Promise<HospitalAdaptation> {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: HOSPITAL_ADAPTATION_PROMPT },
        { 
          role: "user", 
          content: `Analise e adapte este conteúdo do INEMA para o contexto HOSPITALAR SAÚDE:

TIPO: ${messageType}
CONTEÚDO:
${content.substring(0, 3000)}

Gere uma adaptação completa com:
1. Título adaptado para contexto hospitalar
2. Descrição de como aplicar no hospital
3. Score de usabilidade (0-5)
4. Complexidade de implementação (1-10)
5. ROI potencial estimado em R$
6. Tempo de implementação
7. Recursos necessários
8. Workflow/código adaptado (se aplicável)
9. Departamentos alvo
10. Notas de compliance (LGPD, CFM)` 
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "hospital_adaptation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              adaptedTitle: { type: "string", description: "Título adaptado para contexto hospitalar" },
              adaptedDescription: { type: "string", description: "Descrição detalhada da aplicação hospitalar" },
              hospitalContext: { type: "string", description: "Contexto específico de uso no hospital" },
              usabilityScore: { type: "integer", minimum: 0, maximum: 5 },
              complexityScore: { type: "integer", minimum: 1, maximum: 10 },
              roiPotential: { type: "number", description: "ROI estimado em R$" },
              implementationTime: { type: "string", description: "Tempo estimado de implementação" },
              requiredResources: { 
                type: "array", 
                items: { type: "string" },
                description: "Lista de recursos necessários"
              },
              adaptedWorkflow: { type: "string", description: "Workflow adaptado em formato JSON ou texto" },
              adaptedCode: { type: "string", description: "Código adaptado se aplicável" },
              targetDepartments: { 
                type: "array", 
                items: { type: "string" },
                description: "Departamentos hospitalares alvo"
              },
              complianceNotes: { type: "string", description: "Notas sobre compliance LGPD/CFM" },
              lgpdCompliant: { type: "boolean" },
              cfmCompliant: { type: "boolean" }
            },
            required: [
              "adaptedTitle", "adaptedDescription", "hospitalContext",
              "usabilityScore", "complexityScore", "roiPotential",
              "implementationTime", "requiredResources", "targetDepartments",
              "complianceNotes", "lgpdCompliant", "cfmCompliant"
            ],
            additionalProperties: false
          }
        }
      }
    });

    const messageContent = response.choices[0].message.content;
    const contentStr = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
    const result = JSON.parse(contentStr || "{}");
    
    return {
      adaptedTitle: result.adaptedTitle || "Adaptação Pendente",
      adaptedDescription: result.adaptedDescription || "",
      hospitalContext: result.hospitalContext || "",
      usabilityScore: result.usabilityScore || 0,
      complexityScore: result.complexityScore || 5,
      roiPotential: result.roiPotential || 0,
      implementationTime: result.implementationTime || "A definir",
      requiredResources: result.requiredResources || [],
      adaptedWorkflow: result.adaptedWorkflow || undefined,
      adaptedCode: result.adaptedCode || undefined,
      targetDepartments: result.targetDepartments || [],
      complianceNotes: result.complianceNotes || "",
      lgpdCompliant: result.lgpdCompliant ?? true,
      cfmCompliant: result.cfmCompliant ?? true
    };
  } catch (error) {
    console.error("[Hospital Adaptation] Error:", error);
    return {
      adaptedTitle: "Erro na Adaptação",
      adaptedDescription: "Não foi possível adaptar o conteúdo",
      hospitalContext: "",
      usabilityScore: 0,
      complexityScore: 10,
      roiPotential: 0,
      implementationTime: "N/A",
      requiredResources: [],
      targetDepartments: [],
      complianceNotes: "Erro no processamento",
      lgpdCompliant: false,
      cfmCompliant: false
    };
  }
}

/**
 * Processa mensagens pendentes de adaptação
 */
export async function processAdaptationBatch(userId: number, limit: number = 10): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Buscar mensagens de automação/prompt não adaptadas
  const pendingMessages = await db
    .select()
    .from(telegramMessages)
    .where(
      and(
        eq(telegramMessages.userId, userId),
        or(
          eq(telegramMessages.aiClassification, "prompt"),
          eq(telegramMessages.aiClassification, "ferramenta"),
          eq(telegramMessages.aiClassification, "tutorial"),
          eq(telegramMessages.aiClassification, "codigo")
        )
      )
    )
    .limit(limit);

  let adapted = 0;

  for (const message of pendingMessages) {
    if (!message.content) continue;

    // Verificar se já foi adaptado
    const [existing] = await db.execute(
      sql`SELECT id FROM adapted_content WHERE messageId = ${message.id} LIMIT 1`
    );
    
    if (existing && Array.isArray(existing) && existing.length > 0) continue;

    const adaptation = await adaptContentForHospital(
      message.content, 
      message.aiClassification || message.messageType
    );

    // Inserir adaptação no banco
    await db.execute(sql`
      INSERT INTO adapted_content (
        messageId, userId, originalContent, adaptedTitle, adaptedDescription,
        hospitalContext, usabilityScore, complexityScore, roiPotential,
        implementationTime, requiredResources, adaptedWorkflow, adaptedCode,
        targetDepartments, complianceNotes, lgpdCompliant, cfmCompliant,
        adaptationStatus, adaptedAt
      ) VALUES (
        ${message.id}, ${userId}, ${message.content}, ${adaptation.adaptedTitle},
        ${adaptation.adaptedDescription}, ${adaptation.hospitalContext},
        ${adaptation.usabilityScore}, ${adaptation.complexityScore}, ${adaptation.roiPotential},
        ${adaptation.implementationTime}, ${JSON.stringify(adaptation.requiredResources)},
        ${adaptation.adaptedWorkflow || null}, ${adaptation.adaptedCode || null},
        ${JSON.stringify(adaptation.targetDepartments)}, ${adaptation.complianceNotes},
        ${adaptation.lgpdCompliant}, ${adaptation.cfmCompliant},
        'completed', NOW()
      )
    `);

    adapted++;
    
    // Delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return adapted;
}

/**
 * Obtém estatísticas de conteúdo adaptado
 */
export async function getAdaptationStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const [totalResult] = await db.execute(
    sql`SELECT COUNT(*) as total FROM adapted_content WHERE userId = ${userId}`
  );
  
  const [byScoreResult] = await db.execute(sql`
    SELECT usabilityScore, COUNT(*) as count 
    FROM adapted_content 
    WHERE userId = ${userId} 
    GROUP BY usabilityScore 
    ORDER BY usabilityScore DESC
  `);

  const [highPriorityResult] = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM adapted_content 
    WHERE userId = ${userId} AND usabilityScore >= 4
  `);

  const [totalRoiResult] = await db.execute(sql`
    SELECT SUM(roiPotential) as totalRoi 
    FROM adapted_content 
    WHERE userId = ${userId}
  `);

  const [topOpportunitiesResult] = await db.execute(sql`
    SELECT * FROM adapted_content 
    WHERE userId = ${userId} AND usabilityScore >= 4 
    ORDER BY roiPotential DESC 
    LIMIT 10
  `);

  return {
    total: (totalResult as any)?.[0]?.total || 0,
    byScore: byScoreResult || [],
    highPriority: (highPriorityResult as any)?.[0]?.count || 0,
    totalRoi: (totalRoiResult as any)?.[0]?.totalRoi || 0,
    topOpportunities: topOpportunitiesResult || []
  };
}

/**
 * Obtém oportunidades rápidas (score >= 4)
 */
export async function getQuickOpportunities(userId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const [results] = await db.execute(sql`
    SELECT ac.*, tm.content as originalMessage, tc.channelName
    FROM adapted_content ac
    LEFT JOIN telegram_messages tm ON ac.messageId = tm.id
    LEFT JOIN telegram_channels tc ON tm.channelId = tc.id
    WHERE ac.userId = ${userId} AND ac.usabilityScore >= 4
    ORDER BY ac.usabilityScore DESC, ac.roiPotential DESC
    LIMIT ${limit}
  `);

  return results || [];
}

/**
 * Verifica se deve criar alerta/notificação
 */
export async function checkAndCreateAlerts(userId: number, adaptation: HospitalAdaptation, messageId: number) {
  // Score >= 4: Criar alerta de alta prioridade
  if (adaptation.usabilityScore >= 4) {
    console.log(`[ALERTA] Oportunidade de alta prioridade detectada! Score: ${adaptation.usabilityScore}`);
    console.log(`Título: ${adaptation.adaptedTitle}`);
    console.log(`ROI Potencial: R$ ${adaptation.roiPotential}`);
    
    // Aqui pode integrar com Notion, Slack, Email, etc.
    return {
      type: "high_priority",
      title: adaptation.adaptedTitle,
      score: adaptation.usabilityScore,
      roi: adaptation.roiPotential
    };
  }
  
  // Score >= 3: Criar task no Notion
  if (adaptation.usabilityScore >= 3) {
    console.log(`[TASK] Nova task para análise. Score: ${adaptation.usabilityScore}`);
    return {
      type: "notion_task",
      title: adaptation.adaptedTitle,
      score: adaptation.usabilityScore
    };
  }

  return null;
}

export { HOSPITAL_DEPARTMENTS };
