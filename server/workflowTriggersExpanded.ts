/**
 * Sistema Expandido de Triggers de Workflow
 * Inclui triggers por palavra-chave, prompts, ferramentas de IA, agendamento e webhooks
 */

// Tipos de triggers disponíveis
export const TRIGGER_TYPES = [
  {
    id: "keyword",
    name: "Palavra-chave",
    description: "Dispara quando uma mensagem contém palavras-chave específicas",
    icon: "🔑",
    category: "content",
  },
  {
    id: "prompt_detected",
    name: "Prompt Detectado",
    description: "Dispara quando um novo prompt é identificado pela IA",
    icon: "💡",
    category: "content",
  },
  {
    id: "tool_found",
    name: "Ferramenta de IA",
    description: "Dispara quando uma nova ferramenta de IA é encontrada",
    icon: "🔧",
    category: "content",
  },
  {
    id: "media_received",
    name: "Mídia Recebida",
    description: "Dispara quando imagem ou vídeo é coletado",
    icon: "🖼️",
    category: "content",
  },
  {
    id: "schedule",
    name: "Agendamento",
    description: "Dispara em horários específicos (cron)",
    icon: "⏰",
    category: "time",
  },
  {
    id: "interval",
    name: "Intervalo",
    description: "Dispara a cada X minutos/horas",
    icon: "🔄",
    category: "time",
  },
  {
    id: "webhook_received",
    name: "Webhook Recebido",
    description: "Dispara quando um webhook externo é recebido",
    icon: "🌐",
    category: "external",
  },
  {
    id: "api_call",
    name: "Chamada de API",
    description: "Dispara quando a API pública é chamada",
    icon: "📡",
    category: "external",
  },
  {
    id: "new_channel",
    name: "Novo Canal",
    description: "Dispara quando um novo canal é adicionado",
    icon: "📺",
    category: "system",
  },
  {
    id: "scraping_complete",
    name: "Raspagem Completa",
    description: "Dispara quando uma raspagem é finalizada",
    icon: "✅",
    category: "system",
  },
  {
    id: "lead_created",
    name: "Lead Criado",
    description: "Dispara quando um novo lead é criado no CRM",
    icon: "👤",
    category: "crm",
  },
  {
    id: "lead_stage_changed",
    name: "Estágio Alterado",
    description: "Dispara quando um lead muda de estágio",
    icon: "📊",
    category: "crm",
  },
] as const;

// Ações disponíveis para workflows
export const WORKFLOW_ACTIONS = [
  {
    id: "send_notion",
    name: "Enviar para Notion",
    description: "Adiciona item a um database do Notion",
    icon: "📓",
    category: "integration",
    config: ["database_id", "properties_mapping"],
  },
  {
    id: "send_obsidian",
    name: "Enviar para Obsidian",
    description: "Cria nota no Obsidian via Local REST API",
    icon: "🗃️",
    category: "integration",
    config: ["vault_path", "template"],
  },
  {
    id: "send_slack",
    name: "Enviar para Slack",
    description: "Envia mensagem para canal do Slack",
    icon: "💬",
    category: "notification",
    config: ["webhook_url", "channel", "message_template"],
  },
  {
    id: "send_discord",
    name: "Enviar para Discord",
    description: "Envia mensagem para canal do Discord",
    icon: "🎮",
    category: "notification",
    config: ["webhook_url", "message_template"],
  },
  {
    id: "send_telegram",
    name: "Enviar para Telegram",
    description: "Envia mensagem para chat do Telegram",
    icon: "📱",
    category: "notification",
    config: ["bot_token", "chat_id", "message_template"],
  },
  {
    id: "send_email",
    name: "Enviar Email",
    description: "Envia email via SMTP",
    icon: "📧",
    category: "notification",
    config: ["to", "subject_template", "body_template"],
  },
  {
    id: "call_webhook",
    name: "Chamar Webhook",
    description: "Faz requisição HTTP para URL externa",
    icon: "🔗",
    category: "integration",
    config: ["url", "method", "headers", "body_template"],
  },
  {
    id: "call_n8n",
    name: "Disparar N8N",
    description: "Dispara workflow no N8N",
    icon: "⚡",
    category: "automation",
    config: ["webhook_url", "payload_template"],
  },
  {
    id: "call_make",
    name: "Disparar Make",
    description: "Dispara cenário no Make (Integromat)",
    icon: "🔮",
    category: "automation",
    config: ["webhook_url", "payload_template"],
  },
  {
    id: "generate_image",
    name: "Gerar Imagem",
    description: "Gera imagem a partir do conteúdo",
    icon: "🎨",
    category: "ai",
    config: ["prompt_template", "style"],
  },
  {
    id: "generate_video",
    name: "Gerar Vídeo",
    description: "Gera vídeo a partir do conteúdo",
    icon: "🎬",
    category: "ai",
    config: ["prompt_template", "duration"],
  },
  {
    id: "classify_content",
    name: "Classificar Conteúdo",
    description: "Classifica conteúdo usando IA",
    icon: "🏷️",
    category: "ai",
    config: ["categories"],
  },
  {
    id: "create_lead",
    name: "Criar Lead",
    description: "Cria lead no CRM do sistema",
    icon: "👤",
    category: "crm",
    config: ["stage", "tags", "custom_fields"],
  },
  {
    id: "update_lead",
    name: "Atualizar Lead",
    description: "Atualiza dados de um lead existente",
    icon: "✏️",
    category: "crm",
    config: ["field_mapping"],
  },
  {
    id: "export_data",
    name: "Exportar Dados",
    description: "Exporta dados para arquivo JSON/CSV",
    icon: "📤",
    category: "data",
    config: ["format", "filters", "destination"],
  },
  {
    id: "save_to_db",
    name: "Salvar no Banco",
    description: "Salva dados em tabela personalizada",
    icon: "💾",
    category: "data",
    config: ["table", "field_mapping"],
  },
] as const;

// Condições para filtrar triggers
export const TRIGGER_CONDITIONS = [
  { id: "contains", name: "Contém", operators: ["text"] },
  { id: "not_contains", name: "Não contém", operators: ["text"] },
  { id: "equals", name: "Igual a", operators: ["text", "number"] },
  { id: "not_equals", name: "Diferente de", operators: ["text", "number"] },
  { id: "starts_with", name: "Começa com", operators: ["text"] },
  { id: "ends_with", name: "Termina com", operators: ["text"] },
  { id: "matches_regex", name: "Corresponde a regex", operators: ["text"] },
  { id: "greater_than", name: "Maior que", operators: ["number"] },
  { id: "less_than", name: "Menor que", operators: ["number"] },
  { id: "in_list", name: "Está na lista", operators: ["text", "number"] },
  { id: "not_in_list", name: "Não está na lista", operators: ["text", "number"] },
  { id: "is_empty", name: "Está vazio", operators: ["text"] },
  { id: "is_not_empty", name: "Não está vazio", operators: ["text"] },
] as const;

// Interface para Workflow expandido
export interface ExpandedWorkflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: string;
    config: Record<string, unknown>;
    conditions: WorkflowCondition[];
  };
  actions: WorkflowAction[];
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  runCount: number;
  errorCount: number;
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number | string[];
}

export interface WorkflowAction {
  id: string;
  type: string;
  config: Record<string, unknown>;
  order: number;
  continueOnError: boolean;
}

// Templates de workflows prontos
export const WORKFLOW_TEMPLATES_EXPANDED = [
  {
    id: "prompt_to_notion",
    name: "Prompts para Notion",
    description: "Salva prompts detectados automaticamente no Notion",
    trigger: { type: "prompt_detected", config: {}, conditions: [] },
    actions: [
      {
        id: "1",
        type: "send_notion",
        config: {
          database_id: "{{NOTION_DATABASE_ID}}",
          properties_mapping: {
            Title: "{{content}}",
            Category: "{{category}}",
            Source: "{{channel}}",
            Date: "{{timestamp}}",
          },
        },
        order: 1,
        continueOnError: false,
      },
    ],
  },
  {
    id: "tool_alert",
    name: "Alerta de Ferramentas IA",
    description: "Envia alerta quando nova ferramenta de IA é encontrada",
    trigger: { type: "tool_found", config: {}, conditions: [] },
    actions: [
      {
        id: "1",
        type: "send_telegram",
        config: {
          message_template: "🔧 Nova ferramenta de IA encontrada!\n\n{{content}}\n\nFonte: {{channel}}",
        },
        order: 1,
        continueOnError: true,
      },
      {
        id: "2",
        type: "send_notion",
        config: {
          database_id: "{{NOTION_TOOLS_DATABASE_ID}}",
          properties_mapping: {
            Name: "{{tool_name}}",
            URL: "{{tool_url}}",
            Description: "{{content}}",
            Category: "{{category}}",
          },
        },
        order: 2,
        continueOnError: false,
      },
    ],
  },
  {
    id: "daily_digest",
    name: "Resumo Diário",
    description: "Envia resumo diário das mensagens coletadas",
    trigger: {
      type: "schedule",
      config: { cron: "0 0 8 * * *" }, // 8h da manhã
      conditions: [],
    },
    actions: [
      {
        id: "1",
        type: "send_email",
        config: {
          subject_template: "📊 Resumo Diário - Telegram Scraper",
          body_template: "Olá!\n\nAqui está seu resumo de ontem:\n\n- {{total_messages}} mensagens coletadas\n- {{prompts_count}} prompts identificados\n- {{tools_count}} ferramentas encontradas\n\nAcesse o dashboard para mais detalhes.",
        },
        order: 1,
        continueOnError: false,
      },
    ],
  },
  {
    id: "keyword_automation",
    name: "Automação por Palavra-chave",
    description: "Executa ações quando palavras-chave são detectadas",
    trigger: {
      type: "keyword",
      config: { keywords: ["ChatGPT", "Claude", "Gemini", "Midjourney", "DALL-E"] },
      conditions: [],
    },
    actions: [
      {
        id: "1",
        type: "classify_content",
        config: { categories: ["LLM", "Imagem", "Vídeo", "Áudio", "Automação"] },
        order: 1,
        continueOnError: true,
      },
      {
        id: "2",
        type: "call_n8n",
        config: {
          webhook_url: "{{N8N_WEBHOOK_URL}}",
          payload_template: { content: "{{content}}", category: "{{category}}", channel: "{{channel}}" },
        },
        order: 2,
        continueOnError: false,
      },
    ],
  },
  {
    id: "lead_nurturing",
    name: "Nutrição de Leads",
    description: "Automatiza follow-up de leads do Telegram",
    trigger: { type: "lead_created", config: {}, conditions: [] },
    actions: [
      {
        id: "1",
        type: "send_telegram",
        config: {
          message_template: "Olá {{lead_name}}! Obrigado pelo interesse. Como posso ajudar?",
        },
        order: 1,
        continueOnError: true,
      },
      {
        id: "2",
        type: "send_notion",
        config: {
          database_id: "{{NOTION_CRM_DATABASE_ID}}",
          properties_mapping: {
            Name: "{{lead_name}}",
            Status: "Novo",
            Source: "Telegram",
          },
        },
        order: 2,
        continueOnError: false,
      },
    ],
  },
  {
    id: "media_processor",
    name: "Processador de Mídia",
    description: "Processa e organiza mídias coletadas",
    trigger: { type: "media_received", config: {}, conditions: [] },
    actions: [
      {
        id: "1",
        type: "classify_content",
        config: { categories: ["Imagem", "Vídeo", "GIF", "Documento"] },
        order: 1,
        continueOnError: true,
      },
      {
        id: "2",
        type: "export_data",
        config: {
          format: "json",
          destination: "{{MEDIA_EXPORT_PATH}}",
        },
        order: 2,
        continueOnError: false,
      },
    ],
  },
] as const;

/**
 * Avaliar se um trigger deve ser disparado
 */
export function evaluateTrigger(
  trigger: ExpandedWorkflow["trigger"],
  data: Record<string, unknown>
): boolean {
  // Verificar condições
  for (const condition of trigger.conditions) {
    const fieldValue = data[condition.field];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case "contains":
        if (typeof fieldValue !== "string" || !fieldValue.includes(String(conditionValue))) {
          return false;
        }
        break;
      case "not_contains":
        if (typeof fieldValue === "string" && fieldValue.includes(String(conditionValue))) {
          return false;
        }
        break;
      case "equals":
        if (fieldValue !== conditionValue) {
          return false;
        }
        break;
      case "not_equals":
        if (fieldValue === conditionValue) {
          return false;
        }
        break;
      case "starts_with":
        if (typeof fieldValue !== "string" || !fieldValue.startsWith(String(conditionValue))) {
          return false;
        }
        break;
      case "ends_with":
        if (typeof fieldValue !== "string" || !fieldValue.endsWith(String(conditionValue))) {
          return false;
        }
        break;
      case "greater_than":
        if (typeof fieldValue !== "number" || fieldValue <= Number(conditionValue)) {
          return false;
        }
        break;
      case "less_than":
        if (typeof fieldValue !== "number" || fieldValue >= Number(conditionValue)) {
          return false;
        }
        break;
      case "in_list":
        if (Array.isArray(conditionValue) && !conditionValue.includes(String(fieldValue))) {
          return false;
        }
        break;
      case "is_empty":
        if (fieldValue !== null && fieldValue !== undefined && fieldValue !== "") {
          return false;
        }
        break;
      case "is_not_empty":
        if (fieldValue === null || fieldValue === undefined || fieldValue === "") {
          return false;
        }
        break;
    }
  }

  return true;
}

/**
 * Executar ação de workflow
 */
export async function executeWorkflowAction(
  action: WorkflowAction,
  data: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    switch (action.type) {
      case "call_webhook":
        const url = replaceVariables(action.config.url as string, data);
        const method = (action.config.method as string) || "POST";
        const body = replaceVariables(JSON.stringify(action.config.body_template), data);
        
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: method !== "GET" ? body : undefined,
        });
        
        return { success: response.ok, result: await response.json() };

      case "classify_content":
        // Usar classificador de IA
        return { success: true, result: { classified: true } };

      case "export_data":
        // Exportar dados
        return { success: true, result: { exported: true } };

      default:
        return { success: false, error: `Ação não implementada: ${action.type}` };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Substituir variáveis no template
 */
function replaceVariables(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}
