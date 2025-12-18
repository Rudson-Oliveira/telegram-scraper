import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, Search, Loader2, MessageSquare, Image, Video, 
  Sparkles, FileText, Filter, Calendar, X, ExternalLink
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Messages() {
  const [search, setSearch] = useState("");
  const [messageType, setMessageType] = useState<string>("all");
  const [channelId, setChannelId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  const { data: channels } = trpc.channels.list.useQuery();
  const { data: stats } = trpc.messages.stats.useQuery();
  const { data: messages, isLoading, refetch } = trpc.messages.list.useQuery({
    search: search || undefined,
    messageType: messageType !== "all" ? messageType : undefined,
    channelId: channelId !== "all" ? parseInt(channelId) : undefined,
    isPrompt: activeTab === "prompts" ? true : undefined,
    limit: 100,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <Image className="w-4 h-4 text-green-500" />;
      case "video": return <Video className="w-4 h-4 text-purple-500" />;
      case "prompt": return <Sparkles className="w-4 h-4 text-amber-500" />;
      case "document": return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <MessageSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const clearFilters = () => {
    setSearch("");
    setMessageType("all");
    setChannelId("all");
  };

  const hasFilters = search || messageType !== "all" || channelId !== "all";

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
            <h1 className="text-lg font-semibold text-foreground">Base de Conhecimento</h1>
            <p className="text-xs text-muted-foreground">
              {stats?.total || 0} itens coletados
            </p>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Stats Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Todos ({stats?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="text" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4 mr-1" />
              Texto ({stats?.text || 0})
            </TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Image className="w-4 h-4 mr-1" />
              Imagens ({stats?.images || 0})
            </TabsTrigger>
            <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Video className="w-4 h-4 mr-1" />
              Vídeos ({stats?.videos || 0})
            </TabsTrigger>
            <TabsTrigger value="prompts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-1" />
              Prompts ({stats?.prompts || 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar no conteúdo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>

          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger className="w-[150px] bg-card border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="text">Texto</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="document">Documento</SelectItem>
              <SelectItem value="prompt">Prompt</SelectItem>
            </SelectContent>
          </Select>

          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="w-[180px] bg-card border-border">
              <SelectValue placeholder="Canal" />
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

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Messages List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages && messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((msg) => (
              <Card key={msg.id} className="bg-card border-border hover:border-border/80 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {getTypeIcon(msg.messageType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {msg.messageType}
                        </span>
                        {msg.isPrompt && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                            Prompt
                          </span>
                        )}
                        {msg.senderName && (
                          <span className="text-xs text-muted-foreground">
                            por {msg.senderName}
                          </span>
                        )}
                      </div>
                      
                      {msg.content && (
                        <p className="text-sm text-foreground line-clamp-3 mb-2">
                          {msg.content}
                        </p>
                      )}
                      
                      {msg.caption && !msg.content && (
                        <p className="text-sm text-foreground line-clamp-3 mb-2">
                          {msg.caption}
                        </p>
                      )}

                      {msg.hasMedia && msg.mediaUrl && (
                        <a 
                          href={msg.mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver mídia
                        </a>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {msg.messageDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(msg.messageDate), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                          </span>
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
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                {hasFilters ? "Nenhum resultado encontrado" : "Nenhum conteúdo coletado"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {hasFilters 
                  ? "Tente ajustar os filtros de busca"
                  : "Inicie uma raspagem para coletar conteúdo dos canais configurados"
                }
              </p>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
