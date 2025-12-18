import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Key, Loader2, Save, Shield, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const { data: credentials, isLoading } = trpc.credentials.get.useQuery();
  const saveMutation = trpc.credentials.save.useMutation();

  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (credentials) {
      setApiId(credentials.apiId || "");
      setApiHash(credentials.apiHash || "");
      setPhoneNumber(credentials.phoneNumber || "");
    }
  }, [credentials]);

  const handleSave = async () => {
    if (!apiId || !apiHash) {
      toast.error("API ID e API Hash são obrigatórios");
      return;
    }

    try {
      await saveMutation.mutateAsync({ apiId, apiHash, phoneNumber });
      toast.success("Credenciais salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar credenciais");
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
            <h1 className="text-lg font-semibold text-foreground">Configurações</h1>
            <p className="text-xs text-muted-foreground">API do Telegram</p>
          </div>
        </div>
      </header>

      <main className="container py-8 max-w-2xl">
        {/* API Credentials Card */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">Credenciais da API do Telegram</CardTitle>
                <CardDescription>
                  Configure suas credenciais para acessar a API do Telegram
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiId">API ID</Label>
                  <Input
                    id="apiId"
                    type="text"
                    placeholder="Seu API ID do Telegram"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Obtido em my.telegram.org após criar uma aplicação
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiHash">API Hash</Label>
                  <Input
                    id="apiHash"
                    type="password"
                    placeholder="Seu API Hash do Telegram"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mantenha este valor em segredo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Número de Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+55 11 99999-9999"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-input border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número associado à sua conta do Telegram
                  </p>
                </div>

                <Button 
                  onClick={handleSave} 
                  className="w-full"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Credenciais
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-foreground">Como obter as credenciais?</CardTitle>
                <CardDescription>
                  Siga os passos abaixo para configurar sua API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">1</span>
                <p className="text-sm text-muted-foreground">
                  Acesse <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">my.telegram.org</a> e faça login com seu número de telefone
                </p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">2</span>
                <p className="text-sm text-muted-foreground">
                  Clique em "API development tools"
                </p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">3</span>
                <p className="text-sm text-muted-foreground">
                  Crie uma nova aplicação preenchendo os campos obrigatórios
                </p>
              </div>
              <div className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">4</span>
                <p className="text-sm text-muted-foreground">
                  Copie o "api_id" e "api_hash" gerados e cole nos campos acima
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href="https://my.telegram.org" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Acessar my.telegram.org
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* User Info */}
        <Card className="bg-card border-border mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{user?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/api/oauth/logout"}>
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
