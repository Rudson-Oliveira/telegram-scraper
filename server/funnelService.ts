/**
 * Sistema de Funil de Vendas e CRM Básico
 * Gerencia leads, pipeline de vendas e tracking de conversões
 */

import { getDb } from './db';
import { invokeLLM } from './_core/llm';

// Estágios do funil de vendas
export type FunnelStage = 
  | 'lead'           // Lead capturado
  | 'qualified'      // Lead qualificado
  | 'contacted'      // Contato realizado
  | 'proposal'       // Proposta enviada
  | 'negotiation'    // Em negociação
  | 'closed_won'     // Venda fechada
  | 'closed_lost';   // Venda perdida

// Fontes de leads
export type LeadSource = 
  | 'telegram'       // Capturado do Telegram
  | 'inema'          // Comunidade INEMA
  | 'organic'        // Orgânico
  | 'referral'       // Indicação
  | 'paid'           // Tráfego pago
  | 'other';         // Outros

interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  telegramUsername?: string;
  source: LeadSource;
  stage: FunnelStage;
  score: number; // 0-100
  tags: string[];
  notes: string;
  value?: number; // Valor potencial
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  lastContactAt?: Date;
}

interface FunnelMetrics {
  totalLeads: number;
  byStage: Record<FunnelStage, number>;
  conversionRate: number;
  averageValue: number;
  topSources: { source: LeadSource; count: number }[];
}

// Criar lead a partir de mensagem do Telegram
export async function createLeadFromMessage(
  message: { content: string; authorName?: string; authorUsername?: string },
  userId: number
): Promise<{ lead: Partial<Lead>; score: number; tags: string[] }> {
  // Usar IA para qualificar o lead
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `Você é um especialista em qualificação de leads. Analise a mensagem e extraia:
1. Score de qualificação (0-100)
2. Tags relevantes (máximo 5)
3. Interesse principal
4. Potencial de conversão

Responda em JSON com o formato:
{
  "score": number,
  "tags": string[],
  "interest": string,
  "potential": "alto" | "medio" | "baixo"
}`
      },
      {
        role: 'user',
        content: `Mensagem: "${message.content}"\nAutor: ${message.authorName || 'Desconhecido'}`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'lead_qualification',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            score: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
            interest: { type: 'string' },
            potential: { type: 'string' }
          },
          required: ['score', 'tags', 'interest', 'potential'],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content;
  const contentStr = typeof content === 'string' ? content : '{}';
  const analysis = JSON.parse(contentStr);

  return {
    lead: {
      name: message.authorName || 'Lead do Telegram',
      telegramUsername: message.authorUsername,
      source: 'telegram',
      stage: analysis.score > 70 ? 'qualified' : 'lead',
      score: analysis.score || 50,
      tags: analysis.tags || [],
      notes: `Interesse: ${analysis.interest}\nPotencial: ${analysis.potential}`,
      userId,
    },
    score: analysis.score || 50,
    tags: analysis.tags || [],
  };
}

// Calcular métricas do funil
export function calculateFunnelMetrics(leads: Lead[]): FunnelMetrics {
  const byStage: Record<FunnelStage, number> = {
    lead: 0,
    qualified: 0,
    contacted: 0,
    proposal: 0,
    negotiation: 0,
    closed_won: 0,
    closed_lost: 0,
  };

  const sourceCount: Record<string, number> = {};
  let totalValue = 0;
  let valueCount = 0;

  for (const lead of leads) {
    byStage[lead.stage]++;
    sourceCount[lead.source] = (sourceCount[lead.source] || 0) + 1;
    if (lead.value) {
      totalValue += lead.value;
      valueCount++;
    }
  }

  const closedWon = byStage.closed_won;
  const closedLost = byStage.closed_lost;
  const totalClosed = closedWon + closedLost;
  const conversionRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

  const topSources = Object.entries(sourceCount)
    .map(([source, count]) => ({ source: source as LeadSource, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLeads: leads.length,
    byStage,
    conversionRate,
    averageValue: valueCount > 0 ? totalValue / valueCount : 0,
    topSources,
  };
}

// Templates de automação para funil
export const FUNNEL_AUTOMATIONS = [
  {
    name: 'Follow-up Automático',
    description: 'Envia mensagem de follow-up após 3 dias sem contato',
    trigger: 'no_contact_3_days',
    action: 'send_followup_message',
  },
  {
    name: 'Qualificação por IA',
    description: 'Qualifica leads automaticamente baseado em interações',
    trigger: 'new_lead',
    action: 'ai_qualify',
  },
  {
    name: 'Alerta de Lead Quente',
    description: 'Notifica quando lead atinge score > 80',
    trigger: 'score_above_80',
    action: 'notify_sales_team',
  },
  {
    name: 'Nutrição de Leads',
    description: 'Envia conteúdo relevante baseado em interesses',
    trigger: 'weekly',
    action: 'send_nurturing_content',
  },
];

// Estágios do funil com descrições
export const FUNNEL_STAGES = [
  { value: 'lead', label: 'Lead', color: '#6B7280', description: 'Capturado, aguardando qualificação' },
  { value: 'qualified', label: 'Qualificado', color: '#3B82F6', description: 'Qualificado pela IA ou manualmente' },
  { value: 'contacted', label: 'Contatado', color: '#8B5CF6', description: 'Primeiro contato realizado' },
  { value: 'proposal', label: 'Proposta', color: '#F59E0B', description: 'Proposta enviada' },
  { value: 'negotiation', label: 'Negociação', color: '#EC4899', description: 'Em negociação ativa' },
  { value: 'closed_won', label: 'Fechado ✓', color: '#10B981', description: 'Venda concluída' },
  { value: 'closed_lost', label: 'Perdido', color: '#EF4444', description: 'Oportunidade perdida' },
];
