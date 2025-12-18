import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  Activity, 
  TrendingUp, 
  Zap, 
  Target, 
  DollarSign, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Building2,
  Brain,
  RefreshCw,
  ArrowLeft,
  Star,
  Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function HospitalDashboard() {
  const { user, loading: authLoading } = useAuth();
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.hospital.getStats.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const { data: opportunities, isLoading: oppsLoading } = trpc.hospital.getOpportunities.useQuery(
    { limit: 10 },
    { enabled: !!user }
  );

  const processAdaptation = trpc.hospital.processAdaptation.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.processed} mensagens adaptadas com sucesso!`);
      refetchStats();
    },
    onError: () => {
      toast.error("Erro ao processar adaptações");
    }
  });

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const scoreColors: Record<number, string> = {
    5: "bg-green-500",
    4: "bg-emerald-500",
    3: "bg-yellow-500",
    2: "bg-orange-500",
    1: "bg-red-500",
    0: "bg-gray-500"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-400" />
                  Hospitalar Saúde
                </h1>
                <p className="text-slate-400 text-sm">Sistema de Adaptação INEMA → Hospital</p>
              </div>
            </div>
            <Button 
              onClick={() => processAdaptation.mutate({ limit: 20 })}
              disabled={processAdaptation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processAdaptation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Processar Adaptações
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Conteúdo Adaptado
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
              <p className="text-xs text-slate-400 mt-1">
                Total de adaptações realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Oportunidades Rápidas
              </CardTitle>
              <Zap className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{stats?.highPriority || 0}</div>
              <p className="text-xs text-slate-400 mt-1">
                Score ≥ 4 (implementação imediata)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Score Médio
              </CardTitle>
              <Target className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {stats?.total ? (stats.highPriority / stats.total * 5).toFixed(1) : '0.0'}/5
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Qualidade do conteúdo coletado
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Taxa de Sucesso
              </CardTitle>
              <Target className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {stats?.total ? Math.round((stats.highPriority / stats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Conteúdo com alta aplicabilidade
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Distribuição por Score */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-400" />
              Distribuição por Score de Usabilidade
            </CardTitle>
            <CardDescription className="text-slate-400">
              Classificação do conteúdo adaptado por nível de aplicabilidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[5, 4, 3, 2, 1, 0].map((score) => {
                const count = (stats?.byScore as unknown as any[])?.find((s: any) => s.usabilityScore === score)?.count || 0;
                const percentage = stats?.total ? (count / stats.total) * 100 : 0;
                const labels = [
                  "Não aplicável",
                  "Conceito interessante",
                  "Requer adaptação",
                  "Implementação em 1 mês",
                  "Implementação em 1 semana",
                  "Implementação imediata"
                ];
                
                return (
                  <div key={score} className="flex items-center gap-4">
                    <div className="w-8 text-center">
                      <Badge className={`${scoreColors[score]} text-white`}>
                        {score}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-slate-300">{labels[score]}</span>
                        <span className="text-sm text-slate-400">{count} itens</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Oportunidades Rápidas */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              Oportunidades Rápidas (Score ≥ 4)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Conteúdo pronto para implementação imediata no hospital
            </CardDescription>
          </CardHeader>
          <CardContent>
            {oppsLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : !opportunities || (opportunities as any[])?.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma oportunidade de alta prioridade encontrada.</p>
                <p className="text-sm mt-2">Clique em "Processar Adaptações" para analisar mais conteúdo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {((opportunities || []) as any[]).map((opp: any) => (
                  <div 
                    key={opp.id} 
                    className="p-4 rounded-lg bg-slate-700/50 border border-slate-600 hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${scoreColors[opp.usabilityScore]} text-white`}>
                            Score {opp.usabilityScore}
                          </Badge>
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            Prioridade: {opp.usabilityScore >= 4 ? 'Alta' : opp.usabilityScore >= 3 ? 'Média' : 'Baixa'}
                          </Badge>
                          {opp.lgpdCompliant && (
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              LGPD ✓
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-white mb-1">{opp.adaptedTitle}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2">{opp.adaptedDescription}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {opp.implementationTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {(opp.targetDepartments as string[])?.slice(0, 3).join(", ")}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="ml-4">
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
