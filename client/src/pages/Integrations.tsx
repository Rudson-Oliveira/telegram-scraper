import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "wouter";
import { 
  ArrowLeft, Plus, Settings, MessageSquare, Mail, Send, Bot, 
  Globe, CheckCircle, XCircle, Loader2, RefreshCw, Download,
  Trash2, Copy, Shield, Zap, Share2, Brain, ShoppingCart, 
  TrendingUp, Facebook, Instagram, Linkedin, Twitter, ExternalLink
} from "lucide-react";

type IntegrationType = "whatsapp" | "telegram" | "email" | "slack" | "discord" | "custom" | "social" | "ai" | "funnel" | "sales";
type IntegrationStatus = "active" | "standby" | "inactive" | "error";

interface Integration {
  id: number;
  name: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  priority: number;
  credentials: Record<string, unknown> | null;
  isDefault: boolean;
  lastTestedAt?: string | Date | null;
  lastTestResult?: "success" | "failed" | "pending" | null;
}

const INTEGRATION_TEMPLATES: Record<IntegrationType, Array<{ provider: string; name: string; fields: string[] }>> = {
  whatsapp: [
    { provider: "twilio", name: "Twilio", fields: ["accountSid", "authToken", "phoneNumber", "apiKey", "apiSecret"] },
    { provider: "evolution", name: "Evolution API", fields: ["baseUrl", "apiKey", "instanceName"] },
    { provider: "baileys", name: "Baileys (Self-hosted)", fields: ["baseUrl", "sessionId"] },
    { provider: "zapi", name: "Z-API", fields: ["instanceId", "token", "securityToken"] },
    { provider: "wabusiness", name: "WhatsApp Business API", fields: ["phoneNumberId", "accessToken", "businessId", "webhookToken"] },
  ],
  telegram: [
    { provider: "bot", name: "Bot API", fields: ["botToken", "botUsername"] },
    { provider: "userbot", name: "User API (MTProto)", fields: ["apiId", "apiHash", "phoneNumber"] },
  ],
  email: [
    { provider: "gmail", name: "Gmail", fields: ["email", "appPassword"] },
    { provider: "outlook", name: "Outlook", fields: ["email", "password", "clientId"] },
    { provider: "smtp", name: "SMTP Customizado", fields: ["smtpHost", "smtpPort", "email", "password", "useTls"] },
  ],
  slack: [
    { provider: "webhook", name: "Webhook", fields: ["webhookUrl"] },
    { provider: "bot", name: "Bot Token", fields: ["botToken", "signingSecret"] },
  ],
  discord: [
    { provider: "webhook", name: "Webhook", fields: ["webhookUrl"] },
    { provider: "bot", name: "Bot Token", fields: ["botToken"] },
  ],
  custom: [
    { provider: "rest", name: "REST API", fields: ["baseUrl", "apiKey", "authType"] },
  ],
  social: [
    { provider: "facebook", name: "Facebook", fields: ["accessToken", "appId", "appSecret", "pageId"] },
    { provider: "instagram", name: "Instagram", fields: ["accessToken", "businessAccountId", "appId"] },
    { provider: "linkedin", name: "LinkedIn", fields: ["accessToken", "clientId", "clientSecret", "organizationId"] },
    { provider: "twitter", name: "X (Twitter)", fields: ["apiKey", "apiSecret", "bearerToken", "accessToken", "accessTokenSecret"] },
    { provider: "meta", name: "Meta API (Unificado)", fields: ["accessToken", "appId", "appSecret", "webhookVerifyToken"] },
  ],
  ai: [
    { provider: "openai", name: "OpenAI / GPT", fields: ["apiKey", "organizationId", "defaultModel"] },
    { provider: "anthropic", name: "Anthropic / Claude", fields: ["apiKey", "defaultModel"] },
    { provider: "google", name: "Google / Gemini", fields: ["apiKey", "projectId"] },
    { provider: "typingmind", name: "TypingMind (Multi-LLM)", fields: ["openaiKey", "claudeKey", "geminiKey"] },
  ],
  funnel: [
    { provider: "default", name: "Funil Padrão", fields: ["stages", "defaultChannel", "autoTagging"] },
    { provider: "whatsapp", name: "Funil WhatsApp", fields: ["phoneNumber", "welcomeMessage", "qualifyQuestions"] },
    { provider: "telegram", name: "Funil Telegram", fields: ["botToken", "welcomeMessage", "qualifyQuestions"] },
  ],
  sales: [
    { provider: "wabusiness", name: "WhatsApp Business", fields: ["phoneNumberId", "accessToken", "catalogId"] },
    { provider: "insta_shop", name: "Instagram Shopping", fields: ["accessToken", "businessAccountId", "catalogId"] },
    { provider: "fb_marketplace", name: "Facebook Marketplace", fields: ["accessToken", "pageId", "catalogId"] },
    { provider: "mercadolivre", name: "Mercado Livre", fields: ["accessToken", "sellerId", "clientId", "clientSecret"] },
  ],
};

const FIELD_LABELS: Record<string, string> = {
  accountSid: "Account SID",
  authToken: "Auth Token",
  phoneNumber: "Phone Number",
  apiKey: "API Key",
  apiSecret: "API Secret",
  botToken: "Bot Token",
  botUsername: "Bot Username",
  apiId: "API ID",
  apiHash: "API Hash",
  email: "Email",
  password: "Password",
  appPassword: "App Password",
  smtpHost: "SMTP Host",
  smtpPort: "SMTP Port",
  webhookUrl: "Webhook URL",
  baseUrl: "Base URL",
  instanceId: "Instance ID",
  instanceName: "Instance Name",
  token: "Token",
  securityToken: "Security Token",
  sessionId: "Session ID",
  clientId: "Client ID",
  clientSecret: "Client Secret",
  signingSecret: "Signing Secret",
  useTls: "Use TLS",
  authType: "Auth Type",
  accessToken: "Access Token",
  appId: "App ID",
  appSecret: "App Secret",
  pageId: "Page ID",
  businessAccountId: "Business Account ID",
  organizationId: "Organization ID",
  bearerToken: "Bearer Token",
  accessTokenSecret: "Access Token Secret",
  webhookVerifyToken: "Webhook Verify Token",
  defaultModel: "Default Model",
  projectId: "Project ID",
  openaiKey: "OpenAI API Key",
  claudeKey: "Claude API Key",
  geminiKey: "Gemini API Key",
  stages: "Etapas do Funil",
  defaultChannel: "Canal Padrão",
  autoTagging: "Tags Automáticas",
  welcomeMessage: "Mensagem de Boas-vindas",
  qualifyQuestions: "Perguntas de Qualificação",
  phoneNumberId: "Phone Number ID",
  businessId: "Business ID",
  webhookToken: "Webhook Token",
  catalogId: "Catalog ID",
  sellerId: "Seller ID",
};

const TYPE_ICONS: Record<IntegrationType, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-5 w-5 text-green-500" />,
  telegram: <Send className="h-5 w-5 text-blue-500" />,
  email: <Mail className="h-5 w-5 text-yellow-500" />,
  slack: <Zap className="h-5 w-5 text-purple-500" />,
  discord: <Bot className="h-5 w-5 text-indigo-500" />,
  custom: <Globe className="h-5 w-5 text-gray-500" />,
  social: <Share2 className="h-5 w-5 text-pink-500" />,
  ai: <Brain className="h-5 w-5 text-cyan-500" />,
  funnel: <TrendingUp className="h-5 w-5 text-orange-500" />,
  sales: <ShoppingCart className="h-5 w-5 text-emerald-500" />,
};

const TYPE_LABELS: Record<IntegrationType, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  email: "Email",
  slack: "Slack",
  discord: "Discord",
  custom: "Custom",
  social: "Redes Sociais",
  ai: "IA / LLM",
  funnel: "Funil",
  sales: "Vendas",
};

const STATUS_BADGES: Record<IntegrationStatus, { color: string; label: string }> = {
  active: { color: "bg-green-500", label: "🟢 Ativo" },
  standby: { color: "bg-yellow-500", label: "🟡 Reserva" },
  inactive: { color: "bg-gray-500", label: "⚫ Inativo" },
  error: { color: "bg-red-500", label: "🔴 Erro" },
};

const ALL_TYPES: IntegrationType[] = ["whatsapp", "telegram", "email", "social", "ai", "funnel", "sales", "slack", "discord", "custom"];

export default function Integrations() {
  const { user, loading: authLoading } = useAuth();
  const [selectedType, setSelectedType] = useState<IntegrationType>("whatsapp");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({ name: "" });
  const [testingId, setTestingId] = useState<number | null>(null);

  const { data: integrations, refetch } = trpc.integrations.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createMutation = trpc.integrations.create.useMutation({
    onSuccess: () => {
      toast.success("Integração adicionada com sucesso!");
      setIsAddDialogOpen(false);
      setFormData({ name: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  const updateMutation = trpc.integrations.update.useMutation({
    onSuccess: () => {
      toast.success("Integração atualizada!");
      refetch();
    },
  });

  const deleteMutation = trpc.integrations.delete.useMutation({
    onSuccess: () => {
      toast.success("Integração removida!");
      refetch();
    },
  });

  const testMutation = trpc.integrations.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Conexão testada com sucesso!");
      } else {
        toast.error(`Falha no teste: ${result.error}`);
      }
      setTestingId(null);
      refetch();
    },
    onError: () => {
      toast.error("Erro ao testar conexão");
      setTestingId(null);
    },
  });

  const handleAddIntegration = () => {
    const template = INTEGRATION_TEMPLATES[selectedType]?.find(t => t.provider === selectedProvider);
    if (!template) return;

    const credentials: Record<string, string> = {};
    template.fields.forEach(field => {
      if (formData[field]) {
        credentials[field] = formData[field];
      }
    });

    createMutation.mutate({
      name: formData.name || `${template.name} ${(integrations?.filter((i: Integration) => i.type === selectedType).length || 0) + 1}`,
      type: selectedType as "whatsapp" | "telegram" | "email" | "slack" | "discord" | "custom",
      provider: selectedProvider,
      credentials,
      priority: (integrations?.filter((i: Integration) => i.type === selectedType).length || 0) + 1,
    });
  };

  const handleTest = (id: number) => {
    setTestingId(id);
    testMutation.mutate({ id });
  };

  const handleStatusChange = (id: number, status: IntegrationStatus) => {
    updateMutation.mutate({ id, status });
  };

  const handleExportEnv = () => {
    if (!integrations?.length) {
      toast.error("Nenhuma integração para exportar");
      return;
    }

    let envContent = "# ============================================\n";
    envContent += "# CONFIGURAÇÕES DE INTEGRAÇÕES\n";
    envContent += `# Exportado em: ${new Date().toISOString()}\n`;
    envContent += "# ============================================\n\n";

    integrations.forEach((integration: Integration, index: number) => {
      envContent += `# ${integration.name} (${integration.type} - ${integration.provider})\n`;
      const prefix = `${integration.type.toUpperCase()}_${index + 1}_`;
      
      Object.entries(integration.credentials || {}).forEach(([key, value]) => {
        envContent += `${prefix}${key.toUpperCase()}=${value}\n`;
      });
      envContent += "\n";
    });

    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "integrations.env";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo .env exportado!");
  };

  const handleExportJson = () => {
    if (!integrations?.length) {
      toast.error("Nenhuma integração para exportar");
      return;
    }

    const exportData = integrations.map((i: Integration) => ({
      name: i.name,
      type: i.type,
      provider: i.provider,
      status: i.status,
      priority: i.priority,
      credentials: i.credentials,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "integrations.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo JSON exportado!");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Settings className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const groupedIntegrations: Partial<Record<IntegrationType, Integration[]>> = integrations?.reduce((acc: Partial<Record<IntegrationType, Integration[]>>, integration: Integration) => {
    const type = integration.type as IntegrationType;
    if (!acc[type]) acc[type] = [];
    acc[type]!.push(integration);
    return acc;
  }, {} as Partial<Record<IntegrationType, Integration[]>>) || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Configurações de Integrações</h1>
              <p className="text-muted-foreground">Gerencie agentes, APIs, redes sociais e vendas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportEnv}>
              <Download className="mr-2 h-4 w-4" />
              .env
            </Button>
            <Button variant="outline" onClick={handleExportJson}>
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>

        {/* TypingMind Quick Link */}
        <Card className="mb-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-cyan-500" />
                <div>
                  <p className="font-medium">TypingMind - Multi-LLM Interface</p>
                  <p className="text-sm text-muted-foreground">Configure GPT, Claude e Gemini em um só lugar</p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <a href="https://www.typingmind.com/#settings" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir TypingMind
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs por tipo */}
        <Tabs defaultValue="whatsapp" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            {ALL_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2 px-3 py-2">
                {TYPE_ICONS[type]} {TYPE_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          {ALL_TYPES.map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {/* Info especial para IA */}
              {type === "ai" && (
                <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-4">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Dica: Use TypingMind para gerenciar múltiplas IAs</p>
                        <p className="text-sm text-muted-foreground">
                          Configure OpenAI, Claude e Gemini em uma interface unificada. 
                          <a href="https://www.typingmind.com/#settings" target="_blank" rel="noopener noreferrer" className="text-primary ml-1 hover:underline">
                            Acessar configurações →
                          </a>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Info especial para Redes Sociais */}
              {type === "social" && (
                <Card className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-500/30 mb-4">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Share2 className="h-5 w-5 text-pink-500" />
                      <div>
                        <p className="font-medium">Meta API para Facebook e Instagram</p>
                        <p className="text-sm text-muted-foreground">
                          Use a Meta API unificada para gerenciar Facebook e Instagram com um único Access Token.
                          <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary ml-1 hover:underline">
                            Meta for Developers →
                          </a>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista de integrações existentes */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedIntegrations[type]?.sort((a: Integration, b: Integration) => a.priority - b.priority).map((integration: Integration) => (
                  <Card key={integration.id} className={integration.status === "active" ? "border-green-500/50" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {TYPE_ICONS[type]}
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <CardDescription className="text-xs">{integration.provider}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          #{integration.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{STATUS_BADGES[integration.status].label}</span>
                        <Select
                          value={integration.status}
                          onValueChange={(value) => handleStatusChange(integration.id, value as IntegrationStatus)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="standby">Reserva</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {integration.lastTestResult && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {integration.lastTestResult === "success" ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500" />
                          )}
                          Último teste: {integration.lastTestedAt ? new Date(String(integration.lastTestedAt)).toLocaleString() : "Nunca"}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleTest(integration.id)}
                          disabled={testingId === integration.id}
                        >
                          {testingId === integration.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1 h-3 w-3" />
                          )}
                          Testar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const creds = JSON.stringify(integration.credentials, null, 2);
                            navigator.clipboard.writeText(creds);
                            toast.success("Credenciais copiadas!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Remover esta integração?")) {
                              deleteMutation.mutate({ id: integration.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Card de adicionar */}
                <Dialog open={isAddDialogOpen && selectedType === type} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Card 
                      className="border-dashed cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        setSelectedType(type);
                        setSelectedProvider("");
                        setFormData({ name: "" });
                      }}
                    >
                      <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                        <Plus className="h-8 w-8 mb-2" />
                        <p className="font-medium">Adicionar {TYPE_LABELS[type]}</p>
                        <p className="text-xs">Clique para configurar</p>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {TYPE_ICONS[type]}
                        Adicionar {TYPE_LABELS[type]}
                      </DialogTitle>
                      <DialogDescription>
                        Configure uma nova integração
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label>Provedor</Label>
                        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o provedor" />
                          </SelectTrigger>
                          <SelectContent>
                            {INTEGRATION_TEMPLATES[type]?.map((template) => (
                              <SelectItem key={template.provider} value={template.provider}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedProvider && (
                        <>
                          <div>
                            <Label>Nome da Integração</Label>
                            <Input
                              placeholder={`Ex: ${TYPE_LABELS[type]} Principal`}
                              value={formData.name || ""}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                          </div>

                          {INTEGRATION_TEMPLATES[type]
                            ?.find(t => t.provider === selectedProvider)
                            ?.fields.map((field) => (
                              <div key={field}>
                                <Label>{FIELD_LABELS[field] || field}</Label>
                                <Input
                                  type={field.toLowerCase().includes("password") || field.toLowerCase().includes("secret") || field.toLowerCase().includes("token") || field.toLowerCase().includes("key") ? "password" : "text"}
                                  placeholder={FIELD_LABELS[field] || field}
                                  value={formData[field] || ""}
                                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                />
                              </div>
                            ))}
                        </>
                      )}
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleAddIntegration}
                        disabled={!selectedProvider || createMutation.isPending}
                      >
                        {createMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Info de revezamento */}
              {(groupedIntegrations[type]?.length || 0) > 1 && (
                <Card className="bg-muted/50">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Sistema de Revezamento Ativo</p>
                        <p className="text-sm text-muted-foreground">
                          {groupedIntegrations[type]?.filter((i: Integration) => i.status === "active").length || 0} ativos, 
                          {" "}{groupedIntegrations[type]?.filter((i: Integration) => i.status === "standby").length || 0} em reserva.
                          O sistema alternará automaticamente entre os agentes conforme a carga e disponibilidade.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Resumo */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resumo das Integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
              {ALL_TYPES.map((type) => (
                <div key={type} className="text-center">
                  <div className="flex justify-center mb-2">{TYPE_ICONS[type]}</div>
                  <p className="text-2xl font-bold">{groupedIntegrations[type]?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[type]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
