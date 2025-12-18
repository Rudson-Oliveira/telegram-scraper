import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, FileJson, FileSpreadsheet, Loader2, Workflow, BookOpen, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const WORKFLOWS = [
  {
    id: "agente-secretaria",
    name: "Agente Secretária WhatsApp",
    description: "Chatbot IA para atendimento 24/7 via WhatsApp. Triagem, agendamentos e escalação.",
    score: 5,
    time: "30 min",
    file: "agente-secretaria-whatsapp.json",
    tags: ["WhatsApp", "IA", "Atendimento"]
  },
  {
    id: "prompts",
    name: "Coleta de Prompts",
    description: "Monitora canais e categoriza prompts automaticamente em 6 categorias.",
    score: 4,
    time: "15 min",
    file: "telegram-scraper-prompts.json",
    tags: ["Telegram", "Prompts", "Categorização"]
  },
  {
    id: "obsidian",
    name: "Sincronização Obsidian",
    description: "Sincroniza mensagens do Telegram com sua base de conhecimento no Obsidian.",
    score: 3,
    time: "20 min",
    file: "telegram-scraper-obsidian.json",
    tags: ["Obsidian", "PKM", "Markdown"]
  },
  {
    id: "notion",
    name: "Ferramentas para Notion",
    description: "Detecta ferramentas de IA mencionadas e adiciona ao Notion automaticamente.",
    score: 4,
    time: "25 min",
    file: "telegram-scraper-notion-tools.json",
    tags: ["Notion", "Ferramentas", "IA"]
  }
];

const DOCS = [
  {
    id: "guia-rapido",
    name: "Guia Rápido: 5 Passos",
    description: "Como copiar/colar sua primeira automação em 10 minutos.",
    file: "GUIA_RAPIDO_5_PASSOS.md"
  },
  {
    id: "tutorial-secretaria",
    name: "Tutorial: Secretária WhatsApp",
    description: "Tutorial completo de 30 minutos para configurar o agente.",
    file: "TUTORIAL_SECRETARIA_WHATSAPP_30MIN.md"
  },
  {
    id: "top5-automacoes",
    name: "Top 5 Automações Hospitalares",
    description: "As 5 melhores automações com código pronto para copiar.",
    file: "TOP5_AUTOMACOES_COPIAR_COLAR.md"
  }
];

export default function Export() {
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [channelId, setChannelId] = useState<string>("all");
  const [messageType, setMessageType] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: channels } = trpc.channels.list.useQuery();
  const { data: stats } = trpc.messages.stats.useQuery();
  const exportMutation = trpc.messages.export.useMutation();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        format,
        channelId: channelId !== "all" ? parseInt(channelId) : undefined,
        messageType: messageType !== "all" ? messageType : undefined,
      });

      // Create and download file
      const blob = new Blob([result.data], { 
        type: format === "json" ? "application/json" : "text/csv" 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Exportação concluída!");
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  const handleCopyWorkflow = async (workflowId: string) => {
    // In a real implementation, this would fetch the workflow content
    const workflow = WORKFLOWS.find(w => w.id === workflowId);
    if (workflow) {
      try {
        // Simulated workflow content - in production, fetch from API
        const content = JSON.stringify({ name: workflow.name, description: workflow.description }, null, 2);
        await navigator.clipboard.writeText(content);
        setCopiedId(workflowId);
        toast.success(`Workflow "${workflow.name}" copiado!`);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        toast.error("Erro ao copiar workflow");
      }
    }
  };

  const handleDownloadWorkflow = (filename: string) => {
    // Open the workflow file in a new tab (would be served from API in production)
    window.open(`/api/workflows/${filename}`, '_blank');
    toast.success("Download iniciado!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Exportar Dados</h1>
            <p className="text-xs text-muted-foreground">
              Exporte dados, workflows e documentação
            </p>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-4xl space-y-8">
        {/* Workflows N8N Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Workflow className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-foreground">Workflows N8N</h2>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
              Copiar/Colar
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Workflows prontos para importar no N8N. Basta baixar o JSON e importar!
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            {WORKFLOWS.map((workflow) => (
              <Card key={workflow.id} className="bg-card border-border hover:border-orange-500/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-foreground">{workflow.name}</h3>
                    <span className="text-xs text-orange-400 font-medium">Score: {workflow.score}/5</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {workflow.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">⏱️ {workflow.time}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCopyWorkflow(workflow.id)}
                      >
                        {copiedId === workflow.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleDownloadWorkflow(workflow.file)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Documentation Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-foreground">Documentação</h2>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
              Tutoriais
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Guias e tutoriais para implementar as automações passo a passo.
          </p>
          
          <div className="space-y-3">
            {DOCS.map((doc) => (
              <Card key={doc.id} className="bg-card border-border hover:border-blue-500/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{doc.name}</h3>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      window.open(`/api/docs/${doc.file}`, '_blank');
                      toast.success("Abrindo documentação...");
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Abrir
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Data Export Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Exportar Dados</h2>
          </div>
          
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Opções de Exportação</CardTitle>
              <CardDescription>
                Configure os filtros e formato de exportação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format Selection */}
              <div className="grid grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all ${
                    format === "json" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-border/80"
                  }`}
                  onClick={() => setFormat("json")}
                >
                  <CardContent className="p-4 text-center">
                    <FileJson className={`w-10 h-10 mx-auto mb-2 ${
                      format === "json" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <p className="font-medium text-foreground">JSON</p>
                    <p className="text-xs text-muted-foreground">Estruturado</p>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-all ${
                    format === "csv" 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-border/80"
                  }`}
                  onClick={() => setFormat("csv")}
                >
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className={`w-10 h-10 mx-auto mb-2 ${
                      format === "csv" ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <p className="font-medium text-foreground">CSV</p>
                    <p className="text-xs text-muted-foreground">Planilha</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={channelId} onValueChange={setChannelId}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione um canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os canais</SelectItem>
                      {channels?.map((ch) => (
                        <SelectItem key={ch.id} value={ch.id.toString()}>
                          {ch.channelName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Conteúdo</Label>
                  <Select value={messageType} onValueChange={setMessageType}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="image">Imagens</SelectItem>
                      <SelectItem value="video">Vídeos</SelectItem>
                      <SelectItem value="prompt">Prompts</SelectItem>
                      <SelectItem value="document">Documentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-2">Resumo da exportação:</p>
                <p className="text-foreground">
                  <span className="font-medium">{stats?.total || 0}</span> itens serão exportados em formato <span className="font-medium uppercase">{format}</span>
                </p>
              </div>

              <Button 
                onClick={handleExport} 
                className="w-full"
                disabled={exportMutation.isPending || !stats?.total}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Exportar Dados
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Info */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-2">Sobre os formatos</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">JSON:</strong> Ideal para integração com outras ferramentas e APIs. Mantém a estrutura completa dos dados.
              </p>
              <p>
                <strong className="text-foreground">CSV:</strong> Perfeito para abrir em Excel, Google Sheets ou outras planilhas. Fácil de visualizar e filtrar.
              </p>
              <p>
                <strong className="text-foreground">Workflows N8N:</strong> Arquivos JSON prontos para importar no N8N. Basta ir em Workflows → Import from File.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
