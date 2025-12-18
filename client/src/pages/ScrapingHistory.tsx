import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, History, MessageSquare, Image, Video, Sparkles, Clock, CheckCircle, XCircle, Pause, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function ScrapingHistory() {
  const { data: historyList, isLoading } = trpc.history.list.useQuery({ limit: 50 });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'running':
        return 'Em andamento';
      case 'failed':
        return 'Falhou';
      case 'paused':
        return 'Pausada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  // Calcular totais
  const totalSessions = historyList?.length || 0;
  const completedSessions = historyList?.filter(h => h.status === 'completed').length || 0;
  const totalMessages = historyList?.reduce((sum, h) => sum + (h.messagesCollected || 0), 0) || 0;
  const totalImages = historyList?.reduce((sum, h) => sum + (h.imagesCollected || 0), 0) || 0;
  const totalVideos = historyList?.reduce((sum, h) => sum + (h.videosCollected || 0), 0) || 0;
  const totalPrompts = historyList?.reduce((sum, h) => sum + (h.promptsCollected || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/scraping">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Histórico de Raspagens</h1>
            <p className="text-xs text-muted-foreground">
              {totalSessions} sessões realizadas
            </p>
          </div>
          <Link href="/scraping">
            <Button>
              Nova Raspagem
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 max-w-4xl">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <History className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Sessões</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Image className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-foreground">{totalImages}</p>
              <p className="text-xs text-muted-foreground">Imagens</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Video className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-foreground">{totalVideos}</p>
              <p className="text-xs text-muted-foreground">Vídeos</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold text-foreground">{totalPrompts}</p>
              <p className="text-xs text-muted-foreground">Prompts</p>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Todas as Sessões</CardTitle>
            <CardDescription>
              Clique em uma sessão para ver os detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : historyList && historyList.length > 0 ? (
              <div className="space-y-3">
                {historyList.map((session, index) => (
                  <div 
                    key={session.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                      #{totalSessions - index}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">
                          Sessão #{totalSessions - index}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(session.status)}`}>
                          {getStatusIcon(session.status)}
                          <span className="ml-1">{getStatusText(session.status)}</span>
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.startedAt).toLocaleString('pt-BR')}
                        {session.completedAt && (
                          <> · Duração: {Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)}s</>
                        )}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-foreground">{session.messagesCollected || 0}</p>
                        <p className="text-xs text-muted-foreground">msgs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{session.imagesCollected || 0}</p>
                        <p className="text-xs text-muted-foreground">imgs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{session.videosCollected || 0}</p>
                        <p className="text-xs text-muted-foreground">vids</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground">{session.promptsCollected || 0}</p>
                        <p className="text-xs text-muted-foreground">prompts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma raspagem realizada ainda
                </p>
                <Link href="/scraping">
                  <Button>Iniciar Primeira Raspagem</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
