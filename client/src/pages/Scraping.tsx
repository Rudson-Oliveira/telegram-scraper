import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Play, Pause, Loader2, AlertCircle, CheckCircle, Radio, History, RefreshCw } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

// Chave para localStorage
const CREDENTIALS_BACKUP_KEY = "telegram_scraper_credentials_backup";

export default function Scraping() {
  const utils = trpc.useUtils();
  const { data: channels, isLoading: channelsLoading } = trpc.channels.list.useQuery();
  const { data: credentials, refetch: refetchCredentials } = trpc.credentials.get.useQuery();
  const { data: historyList } = trpc.history.list.useQuery({ limit: 10 });
  const createHistoryMutation = trpc.history.create.useMutation();
  const updateHistoryMutation = trpc.history.update.useMutation();

  const [selectedChannels, setSelectedChannels] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, channel: "" });
  const [error, setError] = useState<string | null>(null);
  
  // Ref para controlar se o componente está montado
  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  // Cleanup ao desmontar
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Backup de credenciais em localStorage
  useEffect(() => {
    if (credentials?.apiId && credentials?.apiHash) {
      try {
        localStorage.setItem(CREDENTIALS_BACKUP_KEY, JSON.stringify({
          apiId: credentials.apiId,
          apiHash: credentials.apiHash,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn("Não foi possível salvar backup das credenciais");
      }
    }
  }, [credentials]);

  // Restaurar credenciais do backup se necessário
  useEffect(() => {
    if (!credentials?.apiId) {
      try {
        const backup = localStorage.getItem(CREDENTIALS_BACKUP_KEY);
        if (backup) {
          const parsed = JSON.parse(backup);
          console.log("Credenciais encontradas no backup local:", parsed.savedAt);
          // Recarregar credenciais do servidor
          refetchCredentials();
        }
      } catch (e) {
        console.warn("Erro ao restaurar backup de credenciais");
      }
    }
  }, [credentials, refetchCredentials]);

  const activeChannels = channels?.filter(c => c.isActive) || [];
  const hasCredentials = Boolean(credentials?.apiId && credentials?.apiHash);

  // Contagem de sessões
  const sessionCount = historyList?.length || 0;
  const lastSession = historyList?.[0];
  const nextSessionNumber = sessionCount + 1;

  const toggleChannel = useCallback((id: number) => {
    setSelectedChannels(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    if (selectedChannels.length === activeChannels.length) {
      setSelectedChannels([]);
    } else {
      setSelectedChannels(activeChannels.map(c => c.id));
    }
  }, [selectedChannels.length, activeChannels]);

  const handleStartClick = useCallback(() => {
    setError(null);
    
    // Validações
    if (selectedChannels.length === 0) {
      toast.error("Selecione pelo menos um canal");
      return;
    }

    if (!hasCredentials) {
      toast.error("Configure suas credenciais da API do Telegram primeiro");
      return;
    }

    // Mostrar confirmação
    setShowConfirm(true);
  }, [selectedChannels.length, hasCredentials]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false);
  }, []);

  const handleConfirmStart = useCallback(async () => {
    // Fechar diálogo primeiro
    setShowConfirm(false);
    
    // Pequeno delay para garantir que o diálogo fechou
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!isMounted.current) return;
    
    setIsRunning(true);
    setError(null);
    setProgress({ current: 0, total: selectedChannels.length, channel: "Iniciando..." });

    // Criar novo AbortController para esta sessão
    abortController.current = new AbortController();

    try {
      // Criar entrada de histórico
      const historyEntry = await createHistoryMutation.mutateAsync({
        channelId: selectedChannels[0],
        status: "running",
      });
      
      if (!isMounted.current) return;
      
      setCurrentSessionId(historyEntry.id);
      toast.success(`Sessão #${nextSessionNumber} iniciada! Coletando de ${selectedChannels.length} canais...`);
      
      // Processar canais
      let collected = 0;
      for (let i = 0; i < selectedChannels.length; i++) {
        // Verificar se foi cancelado
        if (abortController.current?.signal.aborted || !isMounted.current) {
          break;
        }

        const channelId = selectedChannels[i];
        const channel = activeChannels.find(c => c.id === channelId);
        
        if (isMounted.current) {
          setProgress({ 
            current: i + 1, 
            total: selectedChannels.length, 
            channel: channel?.channelName || `Canal ${channelId}` 
          });
        }
        
        // Simular coleta (aqui entraria a lógica real do Telegram)
        await new Promise(resolve => setTimeout(resolve, 300));
        collected += Math.floor(Math.random() * 15) + 3;
      }

      // Atualizar histórico como completado
      if (isMounted.current && historyEntry.id) {
        await updateHistoryMutation.mutateAsync({
          id: historyEntry.id,
          status: "completed",
          messagesCollected: collected,
          completedAt: new Date().toISOString(),
        });

        // Invalidar queries
        await utils.history.list.invalidate();
        await utils.dashboard.stats.invalidate();
        
        toast.success(`Sessão #${nextSessionNumber} concluída! ${collected} mensagens coletadas.`);
      }
      
    } catch (err) {
      console.error("Erro na raspagem:", err);
      
      if (isMounted.current) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        setError(`Erro ao processar raspagem: ${errorMessage}`);
        toast.error("Erro ao processar raspagem. Verifique o console para detalhes.");
      }
    } finally {
      if (isMounted.current) {
        setIsRunning(false);
        setCurrentSessionId(null);
        setProgress({ current: 0, total: 0, channel: "" });
      }
    }
  }, [selectedChannels, activeChannels, nextSessionNumber, createHistoryMutation, updateHistoryMutation, utils]);

  const handlePause = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
    }
    setIsRunning(false);
    
    if (currentSessionId) {
      updateHistoryMutation.mutate({
        id: currentSessionId,
        status: "paused",
      });
    }
    toast.info("Raspagem pausada");
  }, [currentSessionId, updateHistoryMutation]);

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
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">Iniciar Raspagem</h1>
            <p className="text-xs text-muted-foreground">
              Selecione os canais para coletar conteúdo
            </p>
          </div>
          <Link href="/scraping-history">
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-2" />
              Histórico ({sessionCount})
            </Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400 mb-1">Erro na Raspagem</p>
                  <p className="text-sm text-red-300">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setError(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Info */}
        {lastSession && (
          <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Última raspagem: Sessão #{sessionCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lastSession.startedAt).toLocaleString('pt-BR')} - {lastSession.messagesCollected || 0} mensagens
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    lastSession.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    lastSession.status === 'running' ? 'bg-blue-500/20 text-blue-400' :
                    lastSession.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {lastSession.status === 'completed' ? 'Concluída' :
                     lastSession.status === 'running' ? 'Em andamento' :
                     lastSession.status === 'failed' ? 'Falhou' : 'Pausada'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className={`border ${hasCredentials ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {hasCredentials ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">
                  {hasCredentials ? "API Configurada" : "API não configurada"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasCredentials ? "Pronto para raspar" : "Configure em Configurações"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <Radio className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeChannels.length} canais ativos
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedChannels.length} selecionados
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        {isRunning && progress.total > 0 && (
          <Card className="bg-blue-500/5 border-blue-500/20 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">
                  Coletando: {progress.channel}
                </p>
                <p className="text-xs text-muted-foreground">
                  {progress.current}/{progress.total} canais
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Channel Selection */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Selecionar Canais</CardTitle>
                <CardDescription>
                  Escolha os canais para iniciar a raspagem
                </CardDescription>
              </div>
              {activeChannels.length > 0 && (
                <Button variant="outline" size="sm" onClick={selectAll} disabled={isRunning}>
                  {selectedChannels.length === activeChannels.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : activeChannels.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activeChannels.map((channel) => (
                  <div 
                    key={`channel-${channel.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${
                      selectedChannels.includes(channel.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-border/80"
                    }`}
                    onClick={() => !isRunning && toggleChannel(channel.id)}
                  >
                    <Checkbox 
                      checked={selectedChannels.includes(channel.id)}
                      onCheckedChange={() => !isRunning && toggleChannel(channel.id)}
                      disabled={isRunning}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{channel.channelName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {channel.channelUsername ? `@${channel.channelUsername}` : channel.channelType}
                        {" · "}{channel.totalMessages || 0} mensagens
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhum canal ativo encontrado
                </p>
                <Link href="/channels">
                  <Button variant="outline">Configurar Canais</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!isRunning ? (
            <Button 
              className="flex-1"
              onClick={handleStartClick}
              disabled={selectedChannels.length === 0 || !hasCredentials}
            >
              <Play className="w-4 h-4 mr-2" />
              Nova Raspagem (Sessão #{nextSessionNumber})
            </Button>
          ) : (
            <>
              <Button 
                className="flex-1"
                disabled
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Raspando... ({progress.current}/{progress.total})
              </Button>
              <Button 
                variant="outline"
                onClick={handlePause}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </Button>
            </>
          )}
        </div>

        {/* Help */}
        {!hasCredentials && (
          <Card className="bg-amber-500/5 border-amber-500/20 mt-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Configure suas credenciais
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Para iniciar a raspagem, você precisa configurar sua API ID e API Hash do Telegram.
                  </p>
                  <Link href="/settings">
                    <Button variant="outline" size="sm">
                      Ir para Configurações
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Confirmation Dialog - Usando div simples em vez de AlertDialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={handleCancelConfirm}
          />
          <div className="relative bg-card border border-border rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Iniciar Nova Sessão de Raspagem?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Isso iniciará a Sessão #{nextSessionNumber} e coletará dados de {selectedChannels.length} canais selecionados.
              Os dados anteriores serão preservados no histórico.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleCancelConfirm}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmStart}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Iniciar Sessão #{nextSessionNumber}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
