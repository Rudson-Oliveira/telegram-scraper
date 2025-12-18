/**
 * Serviço Expandido de Funil de Vendas e CRM
 * Inclui campos personalizados, automações de follow-up, tags, histórico e scoring por IA
 */

import { invokeLLM } from "./_core/llm";

// Estágios expandidos do funil
export const FUNNEL_STAGES_EXPANDED = [
  { id: "new", name: "Novo Lead", color: "#6366f1", order: 1 },
  { id: "contacted", name: "Contatado", color: "#8b5cf6", order: 2 },
  { id: "interested", name: "Interessado", color: "#a855f7", order: 3 },
  { id: "qualified", name: "Qualificado", color: "#d946ef", order: 4 },
  { id: "proposal", name: "Proposta Enviada", color: "#ec4899", order: 5 },
  { id: "negotiation", name: "Negociação", color: "#f43f5e", order: 6 },
  { id: "won", name: "Fechado Ganho", color: "#22c55e", order: 7 },
  { id: "lost", name: "Fechado Perdido", color: "#ef4444", order: 8 },
] as const;

// Campos personalizados para leads
export const CUSTOM_FIELDS = [
  { id: "company", name: "Empresa", type: "text", required: false },
  { id: "position", name: "Cargo", type: "text", required: false },
  { id: "budget", name: "Orçamento", type: "currency", required: false },
  { id: "timeline", name: "Prazo", type: "select", options: ["Imediato", "1-3 meses", "3-6 meses", "6+ meses"], required: false },
  { id: "source", name: "Origem", type: "select", options: ["Telegram", "Site", "Indicação", "Anúncio", "Outro"], required: false },
  { id: "interest", name: "Interesse Principal", type: "select", options: ["IA", "Automação", "Marketing", "Desenvolvimento", "Consultoria"], required: false },
  { id: "notes", name: "Observações", type: "textarea", required: false },
] as const;

// Tags para segmentação
export const LEAD_TAGS = [
  { id: "hot", name: "Quente", color: "#ef4444", icon: "🔥" },
  { id: "warm", name: "Morno", color: "#f59e0b", icon: "☀️" },
  { id: "cold", name: "Frio", color: "#3b82f6", icon: "❄️" },
  { id: "vip", name: "VIP", color: "#8b5cf6", icon: "⭐" },
  { id: "returning", name: "Retorno", color: "#22c55e", icon: "🔄" },
  { id: "inema", name: "INEMA", color: "#06b6d4", icon: "📱" },
  { id: "automation", name: "Automação", color: "#10b981", icon: "🤖" },
  { id: "ai", name: "IA", color: "#6366f1", icon: "🧠" },
] as const;

// Tipos de interação para histórico
export const INTERACTION_TYPES = [
  { id: "message", name: "Mensagem", icon: "💬" },
  { id: "call", name: "Ligação", icon: "📞" },
  { id: "email", name: "Email", icon: "📧" },
  { id: "meeting", name: "Reunião", icon: "📅" },
  { id: "proposal", name: "Proposta", icon: "📄" },
  { id: "note", name: "Nota", icon: "📝" },
  { id: "task", name: "Tarefa", icon: "✅" },
] as const;

// Automações de follow-up
export const FOLLOWUP_AUTOMATIONS = [
  {
    id: "welcome",
    name: "Boas-vindas",
    trigger: "new_lead",
    delay: 0,
    action: "send_message",
    template: "Olá {{name}}! Obrigado pelo interesse. Como posso ajudar?",
    enabled: true,
  },
  {
    id: "followup_1",
    name: "Follow-up 24h",
    trigger: "no_response",
    delay: 24 * 60 * 60 * 1000, // 24 horas
    action: "send_message",
    template: "Oi {{name}}, tudo bem? Vi que você demonstrou interesse em {{interest}}. Posso te ajudar com mais informações?",
    enabled: true,
  },
  {
    id: "followup_3",
    name: "Follow-up 3 dias",
    trigger: "no_response",
    delay: 3 * 24 * 60 * 60 * 1000, // 3 dias
    action: "send_message",
    template: "{{name}}, ainda está interessado em {{interest}}? Tenho algumas novidades que podem te interessar!",
    enabled: true,
  },
  {
    id: "followup_7",
    name: "Follow-up 7 dias",
    trigger: "no_response",
    delay: 7 * 24 * 60 * 60 * 1000, // 7 dias
    action: "send_message",
    template: "Oi {{name}}! Passando para saber se posso ajudar com algo. Estamos com promoções especiais essa semana!",
    enabled: true,
  },
  {
    id: "proposal_reminder",
    name: "Lembrete de Proposta",
    trigger: "proposal_sent",
    delay: 2 * 24 * 60 * 60 * 1000, // 2 dias
    action: "send_message",
    template: "{{name}}, você teve a chance de analisar nossa proposta? Estou à disposição para esclarecer qualquer dúvida!",
    enabled: true,
  },
  {
    id: "win_celebration",
    name: "Celebração de Venda",
    trigger: "deal_won",
    delay: 0,
    action: "send_message",
    template: "🎉 Parabéns {{name}}! Seja bem-vindo(a)! Estamos muito felizes em tê-lo conosco. Em breve entraremos em contato para os próximos passos.",
    enabled: true,
  },
  {
    id: "lost_nurture",
    name: "Nutrição Pós-Perda",
    trigger: "deal_lost",
    delay: 30 * 24 * 60 * 60 * 1000, // 30 dias
    action: "send_message",
    template: "Oi {{name}}! Espero que esteja bem. Temos novidades que podem te interessar. Gostaria de saber mais?",
    enabled: true,
  },
] as const;

// Interface para Lead expandido
export interface ExpandedLead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
  stage: string;
  score: number;
  tags: string[];
  customFields: Record<string, string | number | boolean>;
  interactions: Interaction[];
  automations: AutomationStatus[];
  createdAt: Date;
  updatedAt: Date;
  lastInteraction?: Date;
  nextFollowup?: Date;
  assignedTo?: string;
  value?: number;
}

export interface Interaction {
  id: number;
  type: string;
  content: string;
  createdAt: Date;
  createdBy?: string;
}

export interface AutomationStatus {
  automationId: string;
  status: "pending" | "sent" | "cancelled";
  scheduledAt?: Date;
  sentAt?: Date;
}

/**
 * Calcular score do lead usando IA
 */
export async function calculateLeadScore(lead: Partial<ExpandedLead>): Promise<{
  score: number;
  factors: { factor: string; impact: number; reason: string }[];
  recommendation: string;
}> {
  const prompt = `Analise este lead e calcule um score de 0 a 100 baseado na probabilidade de conversão.

Lead:
- Nome: ${lead.name || "Não informado"}
- Email: ${lead.email || "Não informado"}
- Telefone: ${lead.phone || "Não informado"}
- Telegram: ${lead.telegramUsername || "Não informado"}
- Estágio: ${lead.stage || "new"}
- Tags: ${lead.tags?.join(", ") || "Nenhuma"}
- Empresa: ${lead.customFields?.company || "Não informado"}
- Cargo: ${lead.customFields?.position || "Não informado"}
- Orçamento: ${lead.customFields?.budget || "Não informado"}
- Prazo: ${lead.customFields?.timeline || "Não informado"}
- Interesse: ${lead.customFields?.interest || "Não informado"}
- Número de interações: ${lead.interactions?.length || 0}
- Última interação: ${lead.lastInteraction || "Nunca"}

Retorne um JSON com:
{
  "score": número de 0 a 100,
  "factors": [
    { "factor": "nome do fator", "impact": impacto de -20 a +20, "reason": "explicação" }
  ],
  "recommendation": "próxima ação recomendada"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um especialista em vendas e qualificação de leads. Analise leads e forneça scores precisos." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lead_score",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              factors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor: { type: "string" },
                    impact: { type: "number" },
                    reason: { type: "string" },
                  },
                  required: ["factor", "impact", "reason"],
                  additionalProperties: false,
                },
              },
              recommendation: { type: "string" },
            },
            required: ["score", "factors", "recommendation"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content && typeof content === 'string') {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Erro ao calcular score do lead:", error);
  }

  // Fallback com cálculo básico
  let score = 50;
  const factors: { factor: string; impact: number; reason: string }[] = [];

  if (lead.email) {
    score += 10;
    factors.push({ factor: "Email", impact: 10, reason: "Lead forneceu email" });
  }
  if (lead.phone) {
    score += 10;
    factors.push({ factor: "Telefone", impact: 10, reason: "Lead forneceu telefone" });
  }
  if (lead.tags?.includes("hot")) {
    score += 15;
    factors.push({ factor: "Tag Quente", impact: 15, reason: "Lead marcado como quente" });
  }
  if (lead.customFields?.budget) {
    score += 10;
    factors.push({ factor: "Orçamento", impact: 10, reason: "Lead informou orçamento" });
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    factors,
    recommendation: score >= 70 ? "Entrar em contato imediatamente" : score >= 50 ? "Agendar follow-up" : "Nutrir com conteúdo",
  };
}

/**
 * Gerar relatório de conversão do funil
 */
export function generateConversionReport(leads: ExpandedLead[]): {
  totalLeads: number;
  byStage: Record<string, number>;
  conversionRates: Record<string, number>;
  averageScore: number;
  topTags: { tag: string; count: number }[];
  revenueProjection: number;
  timeline: { date: string; leads: number; conversions: number }[];
} {
  const byStage: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  let totalScore = 0;
  let totalValue = 0;

  leads.forEach((lead) => {
    byStage[lead.stage] = (byStage[lead.stage] || 0) + 1;
    totalScore += lead.score;
    if (lead.value) totalValue += lead.value;
    lead.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const conversionRates: Record<string, number> = {};
  const stages = FUNNEL_STAGES_EXPANDED.map((s) => s.id);
  for (let i = 0; i < stages.length - 1; i++) {
    const current = byStage[stages[i]] || 0;
    const next = byStage[stages[i + 1]] || 0;
    if (current > 0) {
      conversionRates[`${stages[i]}_to_${stages[i + 1]}`] = (next / current) * 100;
    }
  }

  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLeads: leads.length,
    byStage,
    conversionRates,
    averageScore: leads.length > 0 ? totalScore / leads.length : 0,
    topTags,
    revenueProjection: totalValue,
    timeline: [], // Implementar agrupamento por data
  };
}

/**
 * Processar automação de follow-up
 */
export function processFollowupAutomation(
  lead: ExpandedLead,
  automation: (typeof FOLLOWUP_AUTOMATIONS)[number]
): { message: string; scheduledAt: Date } | null {
  if (!automation.enabled) return null;

  const now = new Date();
  const scheduledAt = new Date(now.getTime() + automation.delay);

  // Substituir variáveis no template
  let message = automation.template
    .replace(/\{\{name\}\}/g, lead.name || "")
    .replace(/\{\{interest\}\}/g, (lead.customFields?.interest as string) || "nossos serviços")
    .replace(/\{\{company\}\}/g, (lead.customFields?.company as string) || "");

  return { message, scheduledAt };
}

// Exports já definidos inline com 'export const'
