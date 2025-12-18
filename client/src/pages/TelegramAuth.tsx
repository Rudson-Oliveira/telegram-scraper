import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Phone, 
  QrCode, 
  RefreshCw, 
  Send, 
  Shield,
  Wifi,
  WifiOff,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type AuthStep = "phone" | "code" | "password" | "connected";

export default function TelegramAuth() {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("+55");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const testConnection = trpc.telegram.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.connected) {
        setConnectionStatus("connected");
        setStep("connected");
        toast.success("Conectado ao Telegram com sucesso!");
      } else {
        setConnectionStatus("disconnected");
        toast.error("Não foi possível conectar ao Telegram");
      }
    },
    onError: () => {
      setConnectionStatus("disconnected");
      toast.error("Erro ao testar conexão");
    }
  });

  const sendCode = trpc.telegram.sendCode.useMutation({
    onSuccess: () => {
      setStep("code");
      toast.success("Código enviado para seu Telegram!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao enviar código");
    }
  });

  const verifyCode = trpc.telegram.verifyCode.useMutation({
    onSuccess: (data) => {
      if (data.needsPassword) {
        setStep("password");
        toast.info("Digite sua senha de verificação em duas etapas");
      } else {
        setStep("connected");
        setConnectionStatus("connected");
        toast.success("Autenticado com sucesso!");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Código inválido");
    }
  });

  const verifyPassword = trpc.telegram.verifyPassword.useMutation({
    onSuccess: () => {
      setStep("connected");
      setConnectionStatus("connected");
      toast.success("Autenticado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Senha inválida");
    }
  });

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Digite um número de telefone válido");
      return;
    }
    setIsLoading(true);
    await sendCode.mutateAsync({ phone });
    setIsLoading(false);
  };

  const handleVerifyCode = async () => {
    if (!code || code.length < 5) {
      toast.error("Digite o código completo");
      return;
    }
    setIsLoading(true);
    await verifyCode.mutateAsync({ code });
    setIsLoading(false);
  };

  const handleVerifyPassword = async () => {
    if (!password) {
      toast.error("Digite sua senha");
      return;
    }
    setIsLoading(true);
    await verifyPassword.mutateAsync({ password });
    setIsLoading(false);
  };

  const handleTestConnection = async () => {
    setConnectionStatus("connecting");
    await testConnection.mutateAsync();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <p>Faça login para acessar esta página</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-lg font-semibold text-foreground">Autenticação Telegram</h1>
            <p className="text-xs text-muted-foreground">Conecte sua conta para raspagem</p>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* Status de Conexão */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {connectionStatus === "connected" ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-green-500" />
                  </div>
                ) : connectionStatus === "connecting" ? (
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-red-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {connectionStatus === "connected" ? "Conectado" : 
                     connectionStatus === "connecting" ? "Conectando..." : "Desconectado"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {connectionStatus === "connected" ? "Pronto para raspagem" : 
                     connectionStatus === "connecting" ? "Verificando conexão..." : "Configure sua conta"}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="ml-2">Testar</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Passos de Autenticação */}
        {step === "phone" && (
          <Card>
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center">Digite seu Número</CardTitle>
              <CardDescription className="text-center">
                Enviaremos um código de verificação para seu Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+55 35 99835 2323"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Use o formato internacional com código do país
                </p>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSendCode}
                disabled={isLoading || sendCode.isPending}
              >
                {isLoading || sendCode.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Código
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "code" && (
          <Card>
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center">Código de Verificação</CardTitle>
              <CardDescription className="text-center">
                Digite o código enviado para {phone}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="12345"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-2xl text-center tracking-widest"
                  maxLength={6}
                />
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleVerifyCode}
                disabled={isLoading || verifyCode.isPending}
              >
                {isLoading || verifyCode.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Verificar Código
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setStep("phone")}
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "password" && (
          <Card>
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center">Verificação em Duas Etapas</CardTitle>
              <CardDescription className="text-center">
                Digite sua senha de verificação em duas etapas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleVerifyPassword}
                disabled={isLoading || verifyPassword.isPending}
              >
                {isLoading || verifyPassword.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Verificar Senha
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "connected" && (
          <Card className="border-green-500/50">
            <CardHeader>
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-center text-green-500">Conectado!</CardTitle>
              <CardDescription className="text-center">
                Sua conta do Telegram está conectada e pronta para raspagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <p className="text-sm text-green-400">
                  Agora você pode iniciar a raspagem dos canais configurados
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/channels">
                  <Button variant="outline" className="w-full">
                    Ver Canais
                  </Button>
                </Link>
                <Link href="/scraping">
                  <Button className="w-full">
                    Iniciar Raspagem
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Como funciona?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p>Digite seu número de telefone cadastrado no Telegram</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p>Você receberá um código de verificação no app do Telegram</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p>Se tiver verificação em duas etapas, digite sua senha</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
              </div>
              <p>Pronto! Sua conta estará conectada para raspagem automática</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
