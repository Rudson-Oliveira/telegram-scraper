/**
 * Sistema de Workflows e Automação
 * Permite criar fluxos automatizados baseados em triggers de conteúdo
 */

import { getDb } from './db';
import { invokeLLM } from './_core/llm';

// Tipos de triggers disponíveis
export type TriggerType = 
  | 'new_message'      // Nova mensagem coletada
  | 'keyword_match'    // Palavra-chave detectada
  | 'content_type'     // Tipo de conteúdo (prompt, ferramenta, tutorial)
  | 'channel_specific' // Canal específico
  | 'scheduled'        // Agendado
  | 'ai_classified';   // Classificado pela IA

// Tipos de ações disponíveis
export type ActionType = 
  | 'notify_email'     // Enviar e-mail
  | 'notify_telegram'  // Enviar para Telegram
  | 'webhook'          // Chamar webhook externo
  | 'generate_image'   // Gerar imagem
  | 'generate_video'   // Gerar vídeo
  | 'save_to_notion'   // Salvar no Notion
  | 'export_data'      // Exportar dados
  | 'ai_process';      // Processar com IA

interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

interface WorkflowAction {
  type: ActionType;
  config: Record<string, unknown>;
}

interface Workflow {
  id: number;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  userId: number;
  createdAt: Date;
  lastRun?: Date;
  runCount: number;
}

// Executar workflow baseado em trigger
export async function executeWorkflow(
  workflow: Workflow,
  triggerData: Record<string, unknown>
): Promise<{ success: boolean; results: unknown[] }> {
  const results: unknown[] = [];

  for (const action of workflow.actions) {
    try {
      const result = await executeAction(action, triggerData);
      results.push({ action: action.type, success: true, result });
    } catch (error) {
      const err = error as Error;
      results.push({ action: action.type, success: false, error: err.message });
    }
  }

  return {
    success: results.every((r: unknown) => (r as { success: boolean }).success),
    results,
  };
}

// Executar ação individual
async function executeAction(
  action: WorkflowAction,
  data: Record<string, unknown>
): Promise<unknown> {
  switch (action.type) {
    case 'webhook':
      return await callWebhook(action.config.url as string, data);
    
    case 'ai_process':
      return await processWithAI(data, action.config.prompt as string);
    
    case 'notify_email':
      return { queued: true, email: action.config.email };
    
    case 'notify_telegram':
      return { queued: true, chatId: action.config.chatId };
    
    case 'save_to_notion':
      return await saveToNotion(action.config, data);
    
    case 'export_data':
      return { exported: true, format: action.config.format };
    
    default:
      return { skipped: true, reason: 'Ação não implementada' };
  }
}

// Chamar webhook externo
async function callWebhook(url: string, data: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Processar conteúdo com IA
async function processWithAI(data: Record<string, unknown>, customPrompt?: string): Promise<unknown> {
  const prompt = customPrompt || 'Analise o seguinte conteúdo e extraia informações relevantes:';
  
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'Você é um assistente especializado em análise de conteúdo.' },
      { role: 'user', content: `${prompt}\n\n${JSON.stringify(data)}` },
    ],
  });

  return {
    analysis: response.choices[0]?.message?.content,
    processed: true,
  };
}

// Salvar no Notion (placeholder - requer configuração)
async function saveToNotion(
  config: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<unknown> {
  // Implementação básica - requer API key do Notion
  return {
    saved: false,
    reason: 'Configure a API do Notion nas configurações',
    databaseId: config.databaseId,
    data,
  };
}

// Templates de workflows pré-configurados
export const WORKFLOW_TEMPLATES = [
  {
    name: 'Alerta de Novas Ferramentas IA',
    description: 'Notifica quando uma nova ferramenta de IA é detectada',
    trigger: { type: 'ai_classified' as TriggerType, config: { category: 'ferramenta' } },
    actions: [
      { type: 'webhook' as ActionType, config: { url: '{{N8N_WEBHOOK_URL}}' } },
      { type: 'notify_email' as ActionType, config: { email: '{{USER_EMAIL}}' } },
    ],
  },
  {
    name: 'Coletor de Prompts',
    description: 'Salva automaticamente prompts detectados no Notion',
    trigger: { type: 'ai_classified' as TriggerType, config: { category: 'prompt' } },
    actions: [
      { type: 'ai_process' as ActionType, config: { prompt: 'Extraia e formate o prompt encontrado' } },
      { type: 'save_to_notion' as ActionType, config: { databaseId: '{{NOTION_DB_ID}}' } },
    ],
  },
  {
    name: 'Gerador de Conteúdo Visual',
    description: 'Gera imagem ou vídeo baseado em prompts coletados',
    trigger: { type: 'keyword_match' as TriggerType, config: { keywords: ['gerar imagem', 'criar vídeo'] } },
    actions: [
      { type: 'generate_image' as ActionType, config: { style: 'realistic' } },
    ],
  },
  {
    name: 'Exportação Diária',
    description: 'Exporta dados coletados diariamente',
    trigger: { type: 'scheduled' as TriggerType, config: { cron: '0 6 * * *' } },
    actions: [
      { type: 'export_data' as ActionType, config: { format: 'json' } },
      { type: 'webhook' as ActionType, config: { url: '{{BACKUP_WEBHOOK}}' } },
    ],
  },
];

// Verificar se trigger deve ativar workflow
export function shouldTriggerWorkflow(
  workflow: Workflow,
  event: { type: TriggerType; data: Record<string, unknown> }
): boolean {
  if (!workflow.isActive) return false;
  if (workflow.trigger.type !== event.type) return false;

  const config = workflow.trigger.config;

  switch (event.type) {
    case 'keyword_match':
      const keywords = config.keywords as string[];
      const content = (event.data.content as string || '').toLowerCase();
      return keywords.some(kw => content.includes(kw.toLowerCase()));

    case 'content_type':
      return event.data.type === config.contentType;

    case 'channel_specific':
      return event.data.channelId === config.channelId;

    case 'ai_classified':
      return event.data.aiCategory === config.category;

    default:
      return true;
  }
}
