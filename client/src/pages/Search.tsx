import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Search as SearchIcon, Bot, Sparkles, Brain, Zap, Image, Music, Code, Users, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

// Categorias de canais INEMA
const CATEGORIES = [
  { id: "all", name: "Todos", icon: Sparkles, color: "bg-primary" },
  { id: "ia", name: "Inteligência Artificial", icon: Brain, color: "bg-purple-500" },
  { id: "automacao", name: "Automação", icon: Zap, color: "bg-green-500" },
  { id: "desenvolvimento", name: "Desenvolvimento", icon: Code, color: "bg-yellow-500" },
  { id: "marketing", name: "Marketing", icon: Users, color: "bg-red-500" },
  { id: "ferramentas", name: "Ferramentas", icon: Sparkles, color: "bg-indigo-500" },
];

// Grupos de IA priorizados
const IA_PRIORITY_GROUPS = [
  { name: "INEMA.LLMs", description: "Large Language Models - GPT, Claude, Gemini", priority: 1 },
  { name: "INEMA.IA", description: "Inteligência Artificial geral", priority: 2 },
  { name: "INEMA.AGENTES", description: "Agentes autônomos e automação com IA", priority: 3 },
  { name: "INEMA.IMAGENS", description: "Geração de imagens - Midjourney, DALL-E, Stable Diffusion", priority: 4 },
  { name: "INEMA.AVATARES", description: "Avatares e vídeos com IA - HeyGen, D-ID", priority: 5 },
  { name: "INEMA.MUSICAL", description: "Música e áudio com IA - Suno, Udio", priority: 6 },
  { name: "INEMA.VISION", description: "Visão computacional e análise de imagens", priority: 7 },
  { name: "INEMA.TIA", description: "Tecnologia e IA avançada", priority: 8 },
];

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [copiedBot, setCopiedBot] = useState(false);
  
  const { data: channels } = trpc.channels.list.useQuery();
  const { data: inemaChannels } = trpc.scraping.getInemaChannels.useQuery();

  const handleBotSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Digite algo para pesquisar");
      return;
    }
    
    // Abrir o bot do INEMA com a pesquisa
    const botUrl = `https://t.me/inemaautobot?start=search_${encodeURIComponent(searchQuery)}`;
    window.open(botUrl, "_blank");
    toast.success("Abrindo @inemaautobot no Telegram...");
  };

  const copyBotUsername = () => {
    navigator.clipboard.writeText("@inemaautobot");
    setCopiedBot(true);
    toast.success("Username copiado!");
    setTimeout(() => setCopiedBot(false), 2000);
  };

  const filteredChannels = inemaChannels?.filter((channel: any) => {
    if (selectedCategory === "all") return true;
    return channel.category === selectedCategory;
  }) || [];

  const iaChannels = inemaChannels?.filter((channel: any) => 
    channel.category === "ia"
  ) || [];

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
              <h1 className="text-lg font-semibold text-foreground">Pesquisa Inteligente</h1>
              <p className="text-xs text-muted-foreground">Pesquise com @inemaautobot e por categoria</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Integração com @inemaautobot */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-foreground">@inemaautobot</CardTitle>
                <CardDescription>
                  Use o bot oficial do INEMA para pesquisar conteúdo antes de raspar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua pesquisa (ex: automação whatsapp, prompt gpt...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-input border-border flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleBotSearch()}
              />
              <Button onClick={handleBotSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <SearchIcon className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Ou acesse diretamente:</span>
              <Button variant="outline" size="sm" onClick={copyBotUsername}>
                {copiedBot ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                @inemaautobot
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://t.me/inemaautobot" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir no Telegram
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Raspagem por Categoria */}
        <Tabs defaultValue="priority" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="priority">Prioridade IA</TabsTrigger>
            <TabsTrigger value="categories">Por Categoria</TabsTrigger>
            <TabsTrigger value="all">Todos os Canais</TabsTrigger>
          </TabsList>

          {/* Tab: Prioridade IA */}
          <TabsContent value="priority" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Brain className="w-5 h-5 text-purple-400" />
                  Grupos de IA - Ordem de Prioridade
                </CardTitle>
                <CardDescription>
                  Recomendamos raspar estes grupos primeiro para construir sua base de prompts e automações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {IA_PRIORITY_GROUPS.map((group, index) => (
                    <div
                      key={group.name}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index < 3 ? "bg-purple-500 text-white" : "bg-muted-foreground/20 text-muted-foreground"
                        }`}>
                          {group.priority}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{group.name}</h4>
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-400">
                            Alta Prioridade
                          </Badge>
                        )}
                        <Link href="/scraping">
                          <Button size="sm" variant="outline">
                            Raspar
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Por Categoria */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {cat.name}
                  </Button>
                );
              })}
            </div>

            <div className="grid gap-3">
              {filteredChannels.map((channel: any) => (
                <Card key={channel.username} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          channel.category === "ia" ? "bg-purple-500/10" :
                          channel.category === "automacao" ? "bg-green-500/10" :
                          channel.category === "desenvolvimento" ? "bg-yellow-500/10" :
                          channel.category === "marketing" ? "bg-red-500/10" :
                          "bg-muted"
                        }`}>
                          {channel.category === "ia" ? <Brain className="w-5 h-5 text-purple-400" /> :
                           channel.category === "automacao" ? <Zap className="w-5 h-5 text-green-400" /> :
                           channel.category === "desenvolvimento" ? <Code className="w-5 h-5 text-yellow-400" /> :
                           <Sparkles className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{channel.name}</h4>
                          <p className="text-sm text-muted-foreground">{channel.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {channel.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tab: Todos os Canais */}
          <TabsContent value="all" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Todos os Canais Disponíveis</CardTitle>
                <CardDescription>
                  {inemaChannels?.length || 0} canais pré-configurados do INEMA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inemaChannels?.map((channel: any) => (
                    <div
                      key={channel.username}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="font-medium text-foreground text-sm">{channel.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{channel.description}</div>
                      <Badge variant="outline" className="mt-2 text-xs capitalize">
                        {channel.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dica do INEMA */}
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Dica do INEMA VIP</h3>
                <p className="text-sm text-muted-foreground">
                  "Use a busca antes de perguntar! Pesquise com palavras-chave específicas no @inemaautobot. 
                  Quanto mais você aplica, compartilha e contribui, mais valor extrai da comunidade."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
