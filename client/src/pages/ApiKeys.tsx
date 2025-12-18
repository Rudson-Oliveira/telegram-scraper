import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Shield, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ApiKeys() {
  const { user, loading: authLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeys, isLoading, refetch } = trpc.apiKeys.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createMutation = trpc.apiKeys.create.useMutation({
    onSuccess: (data) => {
      setNewlyCreatedKey(data.apiKey);
      setShowCreateForm(false);
      setNewKeyName("");
      setNewKeyPermissions(["read"]);
      setExpiresInDays("");
      refetch();
      toast.success("API Key criada com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao criar API Key: ${error.message}`);
    },
  });

  const revokeMutation = trpc.apiKeys.revoke.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API Key revogada");
    },
  });

  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API Key excluída");
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Nome da API Key é obrigatório");
      return;
    }
    createMutation.mutate({
      name: newKeyName,
      permissions: newKeyPermissions as ("read" | "write" | "admin")[],
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência");
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            <span className="text-foreground font-medium">API Keys</span>
          </div>
          <Link href="/">
            <Button variant="outline">Voltar ao Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">API REST Pública</h3>
                <p className="text-muted-foreground mb-4">
                  Use API Keys para integrar o Telegram Scraper com N8N, Make, Zapier e outras ferramentas de automação.
                </p>
                <div className="bg-card/50 rounded-lg p-4 font-mono text-sm">
                  <p className="text-muted-foreground mb-2">Endpoint base:</p>
                  <code className="text-blue-400">{window.location.origin}/api/v1</code>
                  <p className="text-muted-foreground mt-4 mb-2">Autenticação:</p>
                  <code className="text-green-400">Header: X-API-Key: sua_api_key</code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Newly Created Key Alert */}
        {newlyCreatedKey && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-400 mb-2">Nova API Key Criada</h3>
                  <p className="text-muted-foreground mb-4">
                    Copie esta chave agora. Ela não será mostrada novamente.
                  </p>
                  <div className="flex items-center gap-2 bg-card rounded-lg p-3">
                    <code className="flex-1 font-mono text-sm break-all">
                      {showKey ? newlyCreatedKey : "•".repeat(48)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(newlyCreatedKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setNewlyCreatedKey(null)}
                  >
                    Entendi, já copiei
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Form */}
        {showCreateForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Nova API Key</CardTitle>
              <CardDescription>
                Crie uma nova chave de API para integração externa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da API Key</Label>
                <Input
                  placeholder="Ex: N8N Integration"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Permissões</Label>
                <Select
                  value={newKeyPermissions[0]}
                  onValueChange={(value) => setNewKeyPermissions([value])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Leitura (read)</SelectItem>
                    <SelectItem value="write">Leitura e Escrita (write)</SelectItem>
                    <SelectItem value="admin">Administrador (admin)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Expiração (dias)</Label>
                <Input
                  type="number"
                  placeholder="Deixe vazio para não expirar"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Criando..." : "Criar API Key"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova API Key
          </Button>
        )}

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Suas API Keys
            </CardTitle>
            <CardDescription>
              Gerencie suas chaves de API para integrações externas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeys && apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.keyName}</span>
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive ? "Ativa" : "Revogada"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Criada em {new Date(key.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        {key.lastUsedAt && (
                          <span>
                            Último uso: {new Date(key.lastUsedAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {key.expiresAt && (
                          <span className="text-yellow-400">
                            Expira em {new Date(key.expiresAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {key.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeMutation.mutate({ id: key.id })}
                        >
                          Revogar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: key.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma API Key criada ainda</p>
                <p className="text-sm">Crie uma para começar a integrar com outras ferramentas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Documentação da API</CardTitle>
            <CardDescription>
              Endpoints disponíveis para integração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-mono text-sm">
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">GET</Badge>
                  <code>/api/v1/messages</code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Lista mensagens com filtros (type, channel_id, classification, search)
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">GET</Badge>
                  <code>/api/v1/channels</code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Lista todos os canais configurados
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">GET</Badge>
                  <code>/api/v1/stats</code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Estatísticas gerais (total de mensagens, canais, prompts)
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">GET</Badge>
                  <code>/api/v1/export</code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Exporta dados em JSON ou CSV (format=json|csv)
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500">GET</Badge>
                  <code>/api/v1/health</code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Health check (não requer autenticação)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
