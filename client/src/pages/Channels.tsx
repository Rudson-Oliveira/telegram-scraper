import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Loader2, Trash2, Edit, Hash, Users, Radio, MoreVertical, Sparkles, Download } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function Channels() {
  const { data: channels, isLoading, refetch } = trpc.channels.list.useQuery();
  const createMutation = trpc.channels.create.useMutation();
  const deleteMutation = trpc.channels.delete.useMutation();
  const toggleMutation = trpc.channels.toggleActive.useMutation();
  const { data: inemaChannels } = trpc.scraping.getInemaChannels.useQuery();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelUsername, setChannelUsername] = useState("");
  const [channelType, setChannelType] = useState<"channel" | "group" | "supergroup">("channel");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!channelName) {
      toast.error("Nome do canal é obrigatório");
      return;
    }

    try {
      await createMutation.mutateAsync({
        channelName,
        channelUsername: channelUsername || undefined,
        channelType,
        description: description || undefined,
      });
      toast.success("Canal adicionado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      toast.error("Erro ao adicionar canal");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Canal removido");
      refetch();
    } catch (error) {
      toast.error("Erro ao remover canal");
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    try {
      await toggleMutation.mutateAsync({ id, isActive });
      refetch();
    } catch (error) {
      toast.error("Erro ao atualizar canal");
    }
  };

  const handleAddInemaChannels = async () => {
    if (!inemaChannels) return;
    
    let added = 0;
    for (const channel of inemaChannels) {
      try {
        await createMutation.mutateAsync({
          channelName: channel.name,
          channelUsername: channel.username,
          channelType: channel.type,
          description: `[${(channel as any).category?.toUpperCase() || 'GERAL'}] ${channel.description}`,
        });
        added++;
      } catch (error) {
        // Canal já existe ou erro
      }
    }
    
    if (added > 0) {
      toast.success(`${added} canais do INEMA adicionados! (20 grupos INEMA + 4 grupos pessoais)`);
      refetch();
    } else {
      toast.info("Canais do INEMA já estão configurados");
    }
  };

  const resetForm = () => {
    setChannelName("");
    setChannelUsername("");
    setChannelType("channel");
    setDescription("");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "channel": return <Radio className="w-4 h-4" />;
      case "group": return <Users className="w-4 h-4" />;
      case "supergroup": return <Hash className="w-4 h-4" />;
      default: return <Radio className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "channel": return "Canal";
      case "group": return "Grupo";
      case "supergroup": return "Supergrupo";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Canais do Telegram</h1>
              <p className="text-xs text-muted-foreground">Gerencie os canais para raspagem</p>
            </div>
          </div>

          <Button variant="outline" onClick={handleAddInemaChannels} className="mr-2">
            <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
            Canais INEMA
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Canal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Adicionar Canal</DialogTitle>
                <DialogDescription>
                  Configure um novo canal ou grupo do Telegram para raspagem
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Canal *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: INEMA VIP"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username (opcional)</Label>
                  <Input
                    id="username"
                    placeholder="@username ou t.me/username"
                    value={channelUsername}
                    onChange={(e) => setChannelUsername(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={channelType} onValueChange={(v: any) => setChannelType(v)}>
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="channel">Canal</SelectItem>
                      <SelectItem value="group">Grupo</SelectItem>
                      <SelectItem value="supergroup">Supergrupo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Descrição (opcional)</Label>
                  <Input
                    id="desc"
                    placeholder="Descrição do canal"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Canal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : channels && channels.length > 0 ? (
          <div className="grid gap-4">
            {channels.map((channel) => (
              <Card key={channel.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        channel.isActive ? "bg-primary/10" : "bg-muted"
                      }`}>
                        {getTypeIcon(channel.channelType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{channel.channelName}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            channel.isActive 
                              ? "bg-green-500/10 text-green-500" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {channel.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {channel.channelUsername && (
                            <span>@{channel.channelUsername}</span>
                          )}
                          <span>{getTypeLabel(channel.channelType)}</span>
                          <span>{channel.messageCount || 0} mensagens</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={channel.isActive}
                        onCheckedChange={(checked) => handleToggle(channel.id, checked)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.info("Funcionalidade em breve")}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(channel.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                <Radio className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum canal configurado</h3>
              <p className="text-muted-foreground mb-6">
                Adicione canais e grupos do Telegram para começar a coletar conteúdo
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Canal
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
