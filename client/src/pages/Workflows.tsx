import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  ArrowLeft,
  Workflow,
  Play,
  Pause,
  Plus,
  Zap,
  Bell,
  Mail,
  Webhook,
  Bot,
  FileJson,
  Settings,
  MessageSquare,
  Brain,
  Database,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";

// Tipos de workflows
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  isActive: boolean;
  executions: number;
  lastRun: string | null;
}

// Templates de workflows pré-configurados
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'prompt-to-gpt',
    name: 'Prompts → GPT → Notion',
    description: 'Quando um prompt é detectado, processa com GPT e salva no Notion',
    trigger: 'prompt_detected',
    actions: ['process_gpt', 'save_notion'],
    isActive: false,
    executions: 0,
    lastRun: null,
  },
  {
    id: 'tutorial-to-obsidian',
    name: 'Tutoriais → Obsidian',
    description: 'Exporta tutoriais automaticamente para o vault do Obsidian',
    trigger: 'tutorial_detected',
    actions: ['format_markdown', 'save_obsidian'],
    isActive: false,
    executions: 0,
    lastRun: null,
  },
  {
    id: 'healthcare-alert',
    name: 'Healthcare → WhatsApp Alert',
    description: 'Notifica via WhatsApp quando conteúdo de saúde relevante é encontrado',
    trigger: 'healthcare_detected',
    actions: ['filter_relevance', 'send_whatsapp'],
    isActive: false,
    executions: 0,
    lastRun: null,
  },
  {
    id: 'daily-digest',
    name: 'Resumo Diário → Email',
    description: 'Envia um resumo diário dos melhores conteúdos por email',
    trigger: 'schedule_daily',
    actions: ['aggregate_content', 'generate_summary', 'send_email'],
    isActive: false,
    executions: 0,
    lastRun: null,
  },
  {
    id: 'auto-classify',
    name: 'Auto-Classificar com IA',
    description: 'Classifica automaticamente todas as novas mensagens com IA',
    trigger: 'new_message',
    actions: ['classify_ai', 'update_tags'],
    isActive: true,
    executions: 58,
    lastRun: '2024-12-18T07:30:00',
  },
  {
    id: 'workflow-to-notion',
    name: 'Workflows → Notion',
    description: 'Salva workflows detectados automaticamente no Notion',
    trigger: 'workflow_detected',
    actions: ['extract_steps', 'save_notion'],
    isActive: false,
    executions: 0,
    lastRun: null,
  },
];

// Conexões disponíveis
const CONNECTIONS = [
  {
    id: 'openai',
    name: 'OpenAI / GPT',
    icon: Brain,
    color: 'bg-emerald-500',
    description: 'Processar texto com GPT-4, classificar, resumir',
    status: 'configured',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: Database,
    color: 'bg-gray-700',
    description: 'Salvar em databases, criar páginas',
    status: 'not_configured',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    icon: FileText,
    color: 'bg-purple-600',
    description: 'Exportar para vault local ou remoto',
    status: 'not_configured',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageSquare,
    color: 'bg-green-500',
    description: 'Enviar notificações e alertas',
    status: 'configured',
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    icon: Send,
    color: 'bg-blue-500',
    description: 'Responder automaticamente, enviar mensagens',
    status: 'configured',
  },
  {
    id: 'email',
    name: 'Email (SMTP)',
    icon: Mail,
    color: 'bg-red-500',
    description: 'Enviar relatórios e notificações',
    status: 'not_configured',
  },
];

// Triggers disponíveis
const TRIGGERS = [
  { id: 'new_message', name: 'Nova Mensagem', icon: MessageSquare, description: 'Quando uma nova mensagem é coletada' },
  { id: 'prompt_detected', name: 'Prompt Detectado', icon: Sparkles, description: 'Quando a IA detecta um prompt' },
  { id: 'tutorial_detected', name: 'Tutorial Detectado', icon: FileText, description: 'Quando a IA detecta um tutorial' },
  { id: 'workflow_detected', name: 'Workflow Detectado', icon: Workflow, description: 'Quando a IA detecta um workflow/automação' },
  { id: 'healthcare_detected', name: 'Healthcare Detectado', icon: Zap, description: 'Conteúdo relevante para saúde (score ≥ 4)' },
  { id: 'schedule_daily', name: 'Agendado (Diário)', icon: Clock, description: 'Executa uma vez por dia' },
];

// Ações disponíveis
const ACTIONS = [
  { id: 'classify_ai', name: 'Classificar com IA', icon: Brain, description: 'Usa GPT para classificar o conteúdo' },
  { id: 'process_gpt', name: 'Processar com GPT', icon: Brain, description: 'Envia para GPT e obtém resposta' },
  { id: 'save_notion', name: 'Salvar no Notion', icon: Database, description: 'Cria página no database do Notion' },
  { id: 'save_obsidian', name: 'Salvar no Obsidian', icon: FileText, description: 'Exporta como markdown para Obsidian' },
  { id: 'send_whatsapp', name: 'Enviar WhatsApp', icon: MessageSquare, description: 'Envia mensagem via WhatsApp' },
  { id: 'send_telegram', name: 'Enviar Telegram', icon: Send, description: 'Envia mensagem via Telegram Bot' },
  { id: 'send_email', name: 'Enviar Email', icon: Mail, description: 'Envia email com o conteúdo' },
  { id: 'update_tags', name: 'Atualizar Tags', icon: Zap, description: 'Atualiza tags da mensagem' },
  { id: 'filter_relevance', name: 'Filtrar Relevância', icon: Sparkles, description: 'Filtra por score de relevância' },
  { id: 'generate_summary', name: 'Gerar Resumo', icon: Brain, description: 'Gera resumo do conteúdo com IA' },
  { id: 'aggregate_content', name: 'Agregar Conteúdo', icon: Database, description: 'Agrupa conteúdos do período' },
  { id: 'format_markdown', name: 'Formatar Markdown', icon: FileText, description: 'Converte para formato Markdown' },
  { id: 'extract_steps', name: 'Extrair Passos', icon: Workflow, description: 'Extrai passos do workflow' },
];

export default function Workflows() {
  const { user, loading } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>(WORKFLOW_TEMPLATES);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: '',
    actions: [] as string[],
  });

  const toggleWorkflow = (id: string) => {
    setWorkflows(prev => prev.map(w => {
      if (w.id === id) {
        const newStatus = !w.isActive;
        toast.success(newStatus ? 'Workflow Ativado' : 'Workflow Pausado');
        return { ...w, isActive: newStatus };
      }
      return w;
    }));
  };

  const runWorkflow = (workflow: WorkflowTemplate) => {
    toast.info(`Executando ${workflow.name}...`);
    setTimeout(() => {
      setWorkflows(prev => prev.map(w => {
        if (w.id === workflow.id) {
          return { ...w, executions: w.executions + 1, lastRun: new Date().toISOString() };
        }
        return w;
      }));
      toast.success(`${workflow.name} executado com sucesso!`);
    }, 2000);
  };

  const addAction = (actionId: string) => {
    if (!newWorkflow.actions.includes(actionId)) {
      setNewWorkflow(prev => ({ ...prev, actions: [...prev.actions, actionId] }));
    }
  };

  const removeAction = (actionId: string) => {
    setNewWorkflow(prev => ({ ...prev, actions: prev.actions.filter(a => a !== actionId) }));
  };

  const createWorkflow = () => {
    if (!newWorkflow.name || !newWorkflow.trigger || newWorkflow.actions.length === 0) {
      toast.error('Preencha nome, trigger e pelo menos uma ação.');
      return;
    }

    const workflow: WorkflowTemplate = {
      id: `custom-${Date.now()}`,
      name: newWorkflow.name,
      description: newWorkflow.description,
      trigger: newWorkflow.trigger,
      actions: newWorkflow.actions,
      isActive: false,
      executions: 0,
      lastRun: null,
    };

    setWorkflows(prev => [...prev, workflow]);
    setIsCreating(false);
    setNewWorkflow({ name: '', description: '', trigger: '', actions: [] });
    toast.success(`${workflow.name} criado com sucesso!`);
  };

  const copyWebhookUrl = (workflowId: string) => {
    const url = `${window.location.origin}/api/webhooks/${workflowId}`;
    navigator.clipboard.writeText(url);
    toast.success('Webhook URL copiada!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Workflow className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  Workflows
                </h1>
                <p className="text-sm text-muted-foreground">
                  Automatize fluxos com triggers e ações
                </p>
              </div>
            </div>
            <Button onClick={() => setIsCreating(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Workflow
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="workflows" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="connections">Conexões</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* Tab: Workflows */}
          <TabsContent value="workflows" className="space-y-6">
            {/* Criar novo workflow */}
            {isCreating && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Criar Novo Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome do Workflow</Label>
                      <Input
                        placeholder="Ex: Prompts para Notion"
                        value={newWorkflow.name}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        placeholder="O que este workflow faz?"
                        value={newWorkflow.description}
                        onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Trigger */}
                  <div className="space-y-2">
                    <Label>Trigger (Quando executar)</Label>
                    <div className="grid gap-2 md:grid-cols-3">
                      {TRIGGERS.map(trigger => (
                        <button
                          key={trigger.id}
                          onClick={() => setNewWorkflow(prev => ({ ...prev, trigger: trigger.id }))}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            newWorkflow.trigger === trigger.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <trigger.icon className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">{trigger.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{trigger.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-2">
                    <Label>Ações (O que fazer) - Clique para adicionar/remover</Label>
                    <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
                      {ACTIONS.map(action => (
                        <button
                          key={action.id}
                          onClick={() => newWorkflow.actions.includes(action.id) ? removeAction(action.id) : addAction(action.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            newWorkflow.actions.includes(action.id)
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-border hover:border-green-500/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <action.icon className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-sm">{action.name}</span>
                            {newWorkflow.actions.includes(action.id) && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {newWorkflow.actions.indexOf(action.id) + 1}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{action.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview do fluxo */}
                  {newWorkflow.trigger && newWorkflow.actions.length > 0 && (
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <Label className="mb-2 block">Preview do Fluxo</Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-primary/10">
                          {TRIGGERS.find(t => t.id === newWorkflow.trigger)?.name}
                        </Badge>
                        {newWorkflow.actions.map((actionId) => (
                          <div key={actionId} className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline" className="bg-green-500/10">
                              {ACTIONS.find(a => a.id === actionId)?.name}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={createWorkflow}>Criar Workflow</Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de workflows */}
            <div className="grid gap-4 md:grid-cols-2">
              {workflows.map(workflow => (
                <Card key={workflow.id} className={workflow.isActive ? 'border-green-500/50' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {workflow.name}
                          {workflow.isActive ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Pausado</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                      <Switch
                        checked={workflow.isActive}
                        onCheckedChange={() => toggleWorkflow(workflow.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Fluxo visual */}
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <Badge variant="outline" className="bg-primary/10">
                        {TRIGGERS.find(t => t.id === workflow.trigger)?.name || workflow.trigger}
                      </Badge>
                      {workflow.actions.map((actionId) => (
                        <div key={actionId} className="flex items-center gap-2">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline" className="bg-green-500/10">
                            {ACTIONS.find(a => a.id === actionId)?.name || actionId}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {workflow.executions} execuções
                      </span>
                      {workflow.lastRun && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Última: {new Date(workflow.lastRun).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runWorkflow(workflow)}
                        disabled={!workflow.isActive}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Executar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyWebhookUrl(workflow.id)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Webhook
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Conexões */}
          <TabsContent value="connections" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CONNECTIONS.map(connection => (
                <Card key={connection.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${connection.color}`}>
                        <connection.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{connection.name}</CardTitle>
                        <Badge
                          variant={connection.status === 'configured' ? 'default' : 'secondary'}
                          className="mt-1"
                        >
                          {connection.status === 'configured' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Configurado</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Não configurado</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{connection.description}</p>
                    <Link href="/integrations">
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Settings className="h-4 w-4" />
                        Configurar
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Integração com N8N
                </CardTitle>
                <CardDescription>
                  Para workflows mais complexos, exporte para N8N
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Os workflows criados aqui podem ser exportados como JSON para importar no N8N,
                  permitindo integrações mais avançadas com centenas de serviços.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" asChild>
                    <a href="/n8n-workflows/prompts-to-notion.json" download>
                      <FileJson className="mr-2 h-4 w-4" />
                      Prompts → Notion
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/n8n-workflows/tutoriais-to-obsidian.json" download>
                      <FileJson className="mr-2 h-4 w-4" />
                      Tutoriais → Obsidian
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Logs */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Logs de Execução
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Atualizar
                  </Button>
                </CardTitle>
                <CardDescription>Histórico das últimas execuções de workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { time: '07:30:15', workflow: 'Auto-Classificar com IA', status: 'success', message: '5 mensagens classificadas' },
                    { time: '07:25:00', workflow: 'Auto-Classificar com IA', status: 'success', message: '3 mensagens classificadas' },
                    { time: '07:20:00', workflow: 'Auto-Classificar com IA', status: 'success', message: '8 mensagens classificadas' },
                    { time: '06:00:00', workflow: 'Resumo Diário → Email', status: 'pending', message: 'Email não configurado' },
                    { time: '05:30:00', workflow: 'Healthcare → WhatsApp Alert', status: 'success', message: '2 alertas enviados' },
                  ].map((log, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                      {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {log.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                      <span className="font-medium">{log.workflow}</span>
                      <span className="text-sm text-muted-foreground ml-auto">{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
