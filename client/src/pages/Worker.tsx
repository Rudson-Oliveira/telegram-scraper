import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Play, Pause, RefreshCw, Zap, Clock, Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Worker() {
  const { user, loading: authLoading } = useAuth();
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [maxMessages, setMaxMessages] = useState(100);
  const [autoClassify, setAutoClassify] = useState(true);

  const { data: workerStatus, isLoading, refetch } = trpc.worker.status.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  const startMutation = trpc.worker.start.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const stopMutation = trpc.worker.stop.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const classifyMutation = trpc.ai.classifyPending.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleStart = () => {
    startMutation.mutate({
      intervalMinutes,
      maxMessagesPerRun: maxMessages,
      autoClassify,
      priorityCategories: ["INEMA.LLMs", "INEMA.IA", "INEMA.AGENTES", "INEMA.N8N"],
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isRunning = workerStatus?.isRunning || workerStatus?.status === "running";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent cursor-pointer">
                Telegram Scraper
              </span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">Worker Automático</span>
          </div>
          <Link href="/">
            <Button variant="outline">Voltar ao Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Status Card */}
        <Card className={`${isRunning ? "bg-green-500/10 border-green-500/30" : "bg-card"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full ${isRunning ? "bg-green-500/20" : "bg-muted"}`}>
                  {isRunning ? (
                    <Zap className="h-8 w-8 text-green-400 animate-pulse" />
                  ) : (
                    <Pause className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    Worker {isRunning ? "Ativo" : "Parado"}
                  </h2>
                  <p className="text-muted-foreground">
                    {isRunning
                      ? "Coletando mensagens automaticamente"
                      : "Clique em Iniciar para começar a raspagem automática"}
                  </p>
                </div>
              </div>
              <Badge
                variant={isRunning ? "default" : "secondary"}
                className={`text-lg px-4 py-2 ${isRunning ? "bg-green-500" : ""}`}
              >
                {workerStatus?.status || "idle"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <CheckCircle2 className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mensagens Processadas</p>
                  <p className="text-2xl font-bold">{workerStatus?.messagesProcessed || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/20">
                  <AlertCircle className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold">{workerStatus?.errorCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Clock className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Último Heartbeat</p>
                  <p className="text-lg font-medium">
                    {workerStatus?.lastHeartbeat
                      ? new Date(workerStatus.lastHeartbeat).toLocaleTimeString("pt-BR")
                      : "Nunca"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Worker</CardTitle>
              <CardDescription>
                Ajuste os parâmetros da raspagem automática
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Intervalo entre raspagens (minutos)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 30)}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo: 5 minutos, Máximo: 24 horas (1440 min)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Máximo de mensagens por ciclo</Label>
                <Input
                  type="number"
                  min={10}
                  max={500}
                  value={maxMessages}
                  onChange={(e) => setMaxMessages(parseInt(e.target.value) || 100)}
                  disabled={isRunning}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Classificação automática por IA</Label>
                  <p className="text-xs text-muted-foreground">
                    Classifica mensagens automaticamente usando LLM
                  </p>
                </div>
                <Switch
                  checked={autoClassify}
                  onCheckedChange={setAutoClassify}
                  disabled={isRunning}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Controles</CardTitle>
              <CardDescription>
                Inicie, pare ou force ações do worker
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRunning ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending}
                >
                  <Pause className="h-5 w-5 mr-2" />
                  {stopMutation.isPending ? "Parando..." : "Parar Worker"}
                </Button>
              ) : (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                  onClick={handleStart}
                  disabled={startMutation.isPending}
                >
                  <Play className="h-5 w-5 mr-2" />
                  {startMutation.isPending ? "Iniciando..." : "Iniciar Worker"}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Status
              </Button>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-2">Classificação Manual</p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => classifyMutation.mutate({ limit: 20 })}
                  disabled={classifyMutation.isPending}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {classifyMutation.isPending
                    ? "Classificando..."
                    : "Classificar 20 Mensagens Pendentes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Channels */}
        <Card>
          <CardHeader>
            <CardTitle>Canais Prioritários</CardTitle>
            <CardDescription>
              Estes canais são raspados primeiro em cada ciclo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["INEMA.LLMs", "INEMA.IA", "INEMA.AGENTES", "INEMA.N8N", "INEMA.Make", "INEMA.IMAGENS", "INEMA.AVATARES", "INEMA.VISION"].map((channel) => (
                <Badge key={channel} variant="secondary" className="text-sm">
                  {channel}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
