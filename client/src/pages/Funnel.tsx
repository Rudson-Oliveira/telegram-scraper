import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "wouter";
import { ArrowLeft, Users, TrendingUp, Target, DollarSign, Plus, ChevronRight } from "lucide-react";

export default function Funnel() {
  const { user, loading } = useAuth();
  
  const { data: stages } = trpc.funnel.stages.useQuery();
  const { data: automations } = trpc.funnel.automations.useQuery();

  // Mock data for demonstration
  const mockLeads = [
    { id: 1, name: "João Silva", stage: "qualified", score: 85, source: "telegram" },
    { id: 2, name: "Maria Santos", stage: "contacted", score: 72, source: "inema" },
    { id: 3, name: "Pedro Costa", stage: "lead", score: 45, source: "organic" },
    { id: 4, name: "Ana Oliveira", stage: "proposal", score: 90, source: "referral" },
    { id: 5, name: "Carlos Lima", stage: "negotiation", score: 88, source: "telegram" },
  ];

  const getStageColor = (stageValue: string) => {
    const stage = stages?.find(s => s.value === stageValue);
    return stage?.color || "#6B7280";
  };

  const getStageLabel = (stageValue: string) => {
    const stage = stages?.find(s => s.value === stageValue);
    return stage?.label || stageValue;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Users className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Funil de Vendas</h1>
              <p className="text-sm text-muted-foreground">Gerencie leads e conversões</p>
            </div>
          </div>
          <Button onClick={() => toast.info("Em breve: adicionar lead manualmente")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </header>

      <main className="container py-6">
        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockLeads.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">75%</p>
                  <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Target className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">76</p>
                  <p className="text-sm text-muted-foreground">Score Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Users className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">Leads Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funnel Stages */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pipeline de Vendas</CardTitle>
            <CardDescription>Arraste leads entre os estágios para atualizar o status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-4">
              {stages?.map((stage) => {
                const stageLeads = mockLeads.filter(l => l.stage === stage.value);
                return (
                  <div
                    key={stage.value}
                    className="flex-shrink-0 w-64 bg-muted/50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium text-sm">{stage.label}</span>
                      </div>
                      <Badge variant="secondary">{stageLeads.length}</Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="bg-card p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{lead.name}</span>
                            <Badge
                              variant={lead.score >= 80 ? "default" : lead.score >= 50 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {lead.score}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground capitalize">{lead.source}</p>
                        </div>
                      ))}
                      
                      {stageLeads.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhum lead neste estágio
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Automations */}
        <Card>
          <CardHeader>
            <CardTitle>Automações do Funil</CardTitle>
            <CardDescription>Configure ações automáticas baseadas em eventos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {automations?.map((automation, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{automation.name}</p>
                    <p className="text-sm text-muted-foreground">{automation.description}</p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
