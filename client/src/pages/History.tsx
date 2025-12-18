import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, History as HistoryIcon, CheckCircle, XCircle, Clock, Pause, MessageSquare, Image, Video, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function History() {
  const { data: history, isLoading } = trpc.history.list.useQuery({ limit: 50 });
  const { data: channels } = trpc.channels.list.useQuery();

  const getChannelName = (channelId: number) => {
    const channel = channels?.find(c => c.id === channelId);
    return channel?.channelName || "Canal desconhecido";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed": return <XCircle className="w-5 h-5 text-destructive" />;
      case "running": return <Clock className="w-5 h-5 text-primary animate-pulse" />;
      case "paused": return <Pause className="w-5 h-5 text-amber-500" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Concluído";
      case "failed": return "Falhou";
      case "running": return "Em execução";
      case "paused": return "Pausado";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-500";
      case "failed": return "bg-destructive/10 text-destructive";
      case "running": return "bg-primary/10 text-primary";
      case "paused": return "bg-amber-500/10 text-amber-500";
      default: return "bg-muted text-muted-foreground";
    }
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
            <h1 className="text-lg font-semibold text-foreground">Histórico de Raspagens</h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe todas as coletas realizadas
            </p>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item) => (
              <Card key={item.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        {getStatusIcon(item.status)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">
                            {getChannelName(item.channelId)}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3">
                          Iniciado em {format(new Date(item.startedAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          {item.completedAt && (
                            <> · Finalizado em {format(new Date(item.completedAt), "HH:mm", { locale: ptBR })}</>
                          )}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{item.messagesCollected}</span>
                            <span className="text-muted-foreground">mensagens</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Image className="w-4 h-4 text-green-500" />
                            <span className="text-foreground font-medium">{item.imagesCollected}</span>
                            <span className="text-muted-foreground">imagens</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Video className="w-4 h-4 text-purple-500" />
                            <span className="text-foreground font-medium">{item.videosCollected}</span>
                            <span className="text-muted-foreground">vídeos</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-foreground font-medium">{item.promptsCollected}</span>
                            <span className="text-muted-foreground">prompts</span>
                          </div>
                        </div>

                        {item.errorMessage && (
                          <p className="text-sm text-destructive mt-2">
                            Erro: {item.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <HistoryIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma raspagem realizada</h3>
              <p className="text-muted-foreground mb-6">
                Inicie sua primeira raspagem para ver o histórico aqui
              </p>
              <Link href="/scraping">
                <Button>Iniciar Raspagem</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
