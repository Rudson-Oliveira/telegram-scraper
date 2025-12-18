import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Link } from "wouter";
import { ArrowLeft, Video, Image, Loader2, Download, RefreshCw } from "lucide-react";

export default function MediaGenerator() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("video");
  
  // Video state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState<"5" | "10">("5");
  const [videoAspect, setVideoAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [videoModel, setVideoModel] = useState<"kling-v1" | "kling-v1-5" | "kling-v2-master">("kling-v1-5");
  const [videoTaskId, setVideoTaskId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  // Image state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageStyle, setImageStyle] = useState<"realistic" | "artistic" | "cartoon" | "abstract">("realistic");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const generateVideo = trpc.video.generate.useMutation({
    onSuccess: (data) => {
      if (data.taskId) {
        setVideoTaskId(data.taskId);
        toast.success("Vídeo em geração! Aguarde...");
      } else {
        toast.error(data.error || "Erro ao gerar vídeo");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const checkVideoStatus = trpc.video.status.useQuery(
    { taskId: videoTaskId || "" },
    { 
      enabled: !!videoTaskId && !videoUrl,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    }
  );

  // Check if video is ready
  if (checkVideoStatus.data?.status === "succeed" && checkVideoStatus.data.videoUrl) {
    if (!videoUrl) {
      setVideoUrl(checkVideoStatus.data.videoUrl);
      toast.success("Vídeo gerado com sucesso!");
    }
  }

  const generateImage = trpc.image.generate.useMutation({
    onSuccess: (data) => {
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        toast.success("Imagem gerada com sucesso!");
      } else {
        toast.error(data.error || "Erro ao gerar imagem");
      }
    },
    onError: (error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Faça login para acessar o gerador de mídia</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Gerador de Mídia</h1>
            <p className="text-sm text-muted-foreground">Crie vídeos e imagens com IA</p>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Vídeo (Kling AI)
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Imagem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Gerar Vídeo</CardTitle>
                  <CardDescription>Use Kling AI para criar vídeos a partir de texto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Prompt</label>
                    <Textarea
                      placeholder="Descreva o vídeo que deseja criar..."
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Duração</label>
                      <Select value={videoDuration} onValueChange={(v) => setVideoDuration(v as "5" | "10")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 segundos</SelectItem>
                          <SelectItem value="10">10 segundos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Aspecto</label>
                      <Select value={videoAspect} onValueChange={(v) => setVideoAspect(v as "16:9" | "9:16" | "1:1")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="16:9">16:9 (Paisagem)</SelectItem>
                          <SelectItem value="9:16">9:16 (Stories)</SelectItem>
                          <SelectItem value="1:1">1:1 (Quadrado)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Modelo</label>
                      <Select value={videoModel} onValueChange={(v) => setVideoModel(v as typeof videoModel)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kling-v1">V1 (Básico)</SelectItem>
                          <SelectItem value="kling-v1-5">V1.5 (Recomendado)</SelectItem>
                          <SelectItem value="kling-v2-master">V2 (Avançado)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => generateVideo.mutate({
                      prompt: videoPrompt,
                      duration: videoDuration,
                      aspectRatio: videoAspect,
                      model: videoModel,
                    })}
                    disabled={!videoPrompt || generateVideo.isPending}
                  >
                    {generateVideo.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Video className="mr-2 h-4 w-4" />
                        Gerar Vídeo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultado</CardTitle>
                  <CardDescription>
                    {videoTaskId && !videoUrl && (
                      <span className="flex items-center gap-2 text-yellow-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processando... Status: {checkVideoStatus.data?.status || "aguardando"}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {videoUrl ? (
                    <div className="space-y-4">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full rounded-lg"
                      />
                      <Button asChild className="w-full">
                        <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Baixar Vídeo
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">O vídeo aparecerá aqui</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="image" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Gerar Imagem</CardTitle>
                  <CardDescription>Crie imagens com IA a partir de texto</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Prompt</label>
                    <Textarea
                      placeholder="Descreva a imagem que deseja criar..."
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Estilo</label>
                    <Select value={imageStyle} onValueChange={(v) => setImageStyle(v as typeof imageStyle)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realistic">Realista</SelectItem>
                        <SelectItem value="artistic">Artístico</SelectItem>
                        <SelectItem value="cartoon">Cartoon</SelectItem>
                        <SelectItem value="abstract">Abstrato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => generateImage.mutate({
                      prompt: imagePrompt,
                      style: imageStyle,
                    })}
                    disabled={!imagePrompt || generateImage.isPending}
                  >
                    {generateImage.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Image className="mr-2 h-4 w-4" />
                        Gerar Imagem
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resultado</CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedImageUrl ? (
                    <div className="space-y-4">
                      <img
                        src={generatedImageUrl}
                        alt="Imagem gerada"
                        className="w-full rounded-lg"
                      />
                      <Button asChild className="w-full">
                        <a href={generatedImageUrl} download target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" />
                          Baixar Imagem
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">A imagem aparecerá aqui</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
