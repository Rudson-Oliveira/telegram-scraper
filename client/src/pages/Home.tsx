import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  MessageSquare, 
  Image, 
  Video, 
  Sparkles, 
  Settings, 
  Play, 
  History, 
  Download,
  Plus,
  Search,
  Loader2,
  Send,
  Bot,
  Brain,
  Zap,
  Key,
  Film,
  Workflow,
  Users,
  TrendingUp,
  Plug
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Send className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Telegram Scraper</h1>
          <p className="text-muted-foreground mb-8">
            Plataforma de raspagem e organização de conteúdo do Telegram. 
            Colete mensagens, imagens, vídeos e prompts para criar sua base de conhecimento.
          </p>
          <Button asChild size="lg" className="w-full">
            <a href={getLoginUrl()}>Entrar para Começar</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Telegram Scraper</h1>
              <p className="text-xs text-muted-foreground">Base de Conhecimento</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Olá, {user?.name || "Usuário"}
            </span>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "-" : stats?.total || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Mensagens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Image className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "-" : stats?.images || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Imagens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Video className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "-" : stats?.videos || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Vídeos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "-" : stats?.prompts || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Prompts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/channels">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-foreground">Canais do Telegram</CardTitle>
                <CardDescription>
                  Configure os canais e grupos para raspagem de conteúdo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stats?.totalChannels || 0} canais configurados
                  </span>
                  <span className="text-sm text-green-500">
                    {stats?.activeChannels || 0} ativos
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/messages">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-2 group-hover:bg-green-500/20 transition-colors">
                  <Search className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle className="text-foreground">Base de Conhecimento</CardTitle>
                <CardDescription>
                  Visualize e pesquise todo o conteúdo coletado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stats?.total || 0} itens coletados
                  </span>
                  <span className="text-sm text-primary">Ver todos →</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/scraping">
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-2 group-hover:bg-purple-500/20 transition-colors">
                  <Play className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle className="text-foreground">Iniciar Raspagem</CardTitle>
                <CardDescription>
                  Controle a coleta de dados dos canais configurados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="secondary">
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Coleta
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Secondary Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/history">
            <Card className="bg-card border-border hover:border-border/80 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Histórico</p>
                  <p className="text-sm text-muted-foreground">Ver raspagens anteriores</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/export">
            <Card className="bg-card border-border hover:border-border/80 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Download className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Exportar Dados</p>
                  <p className="text-sm text-muted-foreground">JSON ou CSV</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/search">
            <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20 hover:border-purple-500/40 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Pesquisa IA</p>
                  <p className="text-sm text-muted-foreground">@inemaautobot + Categorias</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="bg-card border-border hover:border-border/80 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Configurações</p>
                  <p className="text-sm text-muted-foreground">API do Telegram</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* New Features */}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Link href="/worker">
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Worker Automático</p>
                  <p className="text-sm text-muted-foreground">Raspagem em tempo real + Classificação IA</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/api-keys">
            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">API Keys</p>
                  <p className="text-sm text-muted-foreground">Integração com N8N, Make, Zapier</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Advanced Features */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Funcionalidades Avançadas</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/media">
              <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center">
                    <Film className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Gerador de Mídia</p>
                    <p className="text-sm text-muted-foreground">Vídeos (Kling AI) + Imagens</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/workflows">
              <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20 hover:border-orange-500/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                    <Workflow className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Workflows</p>
                    <p className="text-sm text-muted-foreground">Automações + Triggers</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/funnel">
              <Card className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Funil de Vendas</p>
                    <p className="text-sm text-muted-foreground">CRM + Leads + Conversões</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/integrations">
              <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-500/20 hover:border-cyan-500/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Plug className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Integrações</p>
                    <p className="text-sm text-muted-foreground">WhatsApp + Telegram + Email</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
