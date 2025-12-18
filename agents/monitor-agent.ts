/**
 * AGENTE 4: Monitor
 * 
 * Função: Verificar novas mensagens e disparar automações
 * Tecnologia: Cron job / scheduled task
 * Ação: Disparar raspagem automática e pipeline de processamento
 * Intervalo padrão: A cada 6 horas
 * 
 * Este agente coordena a execução de todos os outros agentes
 */

import * as cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import config from '../automations/config';
import ClassifierAgent from './classifier-agent';
import ContentExtractorAgent from './extractor-agent';
import RouterAgent from './router-agent';
import SentimentAgent from './sentiment-agent';

interface MonitorStats {
  lastRun: string;
  nextRun: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  messagesProcessed: number;
}

interface PipelineResult {
  stage: string;
  success: boolean;
  processed: number;
  duration: number;
  error?: string;
}

export class MonitorAgent {
  private supabase: ReturnType<typeof createClient>;
  private classifier: ClassifierAgent;
  private extractor: ContentExtractorAgent;
  private router: RouterAgent;
  private sentiment: SentimentAgent;
  private cronJob?: cron.ScheduledTask;
  private stats: MonitorStats;
  private isRunning: boolean = false;
  private intervalHours: number;

  constructor(intervalHours: number = 6) {
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    this.classifier = new ClassifierAgent({ batchSize: 50 });
    this.extractor = new ContentExtractorAgent(500);
    this.router = new RouterAgent();
    this.sentiment = new SentimentAgent();

    this.intervalHours = intervalHours;

    this.stats = {
      lastRun: 'Nunca',
      nextRun: 'Não agendado',
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      messagesProcessed: 0,
    };
  }

  /**
   * Verifica se há novas mensagens no banco
   */
  async checkForNewMessages(): Promise<{
    total: number;
    unclassified: number;
    needsSummary: number;
    needsRouting: number;
  }> {
    try {
      const { data: all } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true });

      const { data: unclassified } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('classification', null);

      const { data: needsSummary } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .is('summary', null);

      const { data: needsRouting } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .not('classification', 'is', null)
        .or('synced_to_notion.is.null,exported_to_obsidian.is.null');

      return {
        total: all?.length || 0,
        unclassified: unclassified?.length || 0,
        needsSummary: needsSummary?.length || 0,
        needsRouting: needsRouting?.length || 0,
      };
    } catch (error) {
      console.error('Error checking for new messages:', error);
      return {
        total: 0,
        unclassified: 0,
        needsSummary: 0,
        needsRouting: 0,
      };
    }
  }

  /**
   * Executa o pipeline completo de processamento
   */
  async runPipeline(): Promise<{
    success: boolean;
    results: PipelineResult[];
    totalProcessed: number;
    totalDuration: number;
  }> {
    console.log('\n🔍 [Monitor Agent] ===== INICIANDO PIPELINE =====');
    const pipelineStart = Date.now();
    const results: PipelineResult[] = [];
    let totalProcessed = 0;

    // Verificar status inicial
    const status = await this.checkForNewMessages();
    console.log('\n📊 Status do banco:');
    console.log(`   Total de mensagens: ${status.total}`);
    console.log(`   Não classificadas: ${status.unclassified}`);
    console.log(`   Sem resumo: ${status.needsSummary}`);
    console.log(`   Pendente roteamento: ${status.needsRouting}`);

    // Stage 1: Classificação
    if (status.unclassified > 0) {
      console.log('\n🤖 [Stage 1] Classificação de mensagens...');
      const start = Date.now();
      try {
        const result = await this.classifier.run();
        results.push({
          stage: 'Classificação',
          success: true,
          processed: result.processed,
          duration: Date.now() - start,
        });
        totalProcessed += result.processed;
        console.log(`   ✓ Classificadas: ${result.successful}/${result.processed}`);
      } catch (error: any) {
        results.push({
          stage: 'Classificação',
          success: false,
          processed: 0,
          duration: Date.now() - start,
          error: error.message,
        });
        console.error('   ✗ Erro na classificação:', error);
      }
    } else {
      console.log('\n✓ [Stage 1] Nenhuma mensagem para classificar');
    }

    // Stage 2: Análise de Sentimento
    console.log('\n💭 [Stage 2] Análise de sentimento...');
    const sentimentStart = Date.now();
    try {
      const result = await this.sentiment.processBatch(50);
      results.push({
        stage: 'Sentimento',
        success: true,
        processed: result.processed,
        duration: Date.now() - sentimentStart,
      });
      totalProcessed += result.processed;
      console.log(`   ✓ Analisadas: ${result.successful}/${result.processed}`);
    } catch (error: any) {
      results.push({
        stage: 'Sentimento',
        success: false,
        processed: 0,
        duration: Date.now() - sentimentStart,
        error: error.message,
      });
      console.error('   ✗ Erro na análise de sentimento:', error);
    }

    // Stage 3: Extração de Conteúdo
    if (status.needsSummary > 0) {
      console.log('\n📝 [Stage 3] Extração de conteúdo...');
      const extractStart = Date.now();
      try {
        const result = await this.extractor.processBatch(30);
        results.push({
          stage: 'Extração',
          success: true,
          processed: result.processed,
          duration: Date.now() - extractStart,
        });
        totalProcessed += result.processed;
        console.log(`   ✓ Resumidas: ${result.successful}/${result.processed}`);
      } catch (error: any) {
        results.push({
          stage: 'Extração',
          success: false,
          processed: 0,
          duration: Date.now() - extractStart,
          error: error.message,
        });
        console.error('   ✗ Erro na extração:', error);
      }
    } else {
      console.log('\n✓ [Stage 3] Nenhuma mensagem longa para resumir');
    }

    // Stage 4: Roteamento
    if (status.needsRouting > 0) {
      console.log('\n🔀 [Stage 4] Roteamento de conteúdo...');
      const routeStart = Date.now();
      try {
        const result = await this.router.processBatch(100);
        results.push({
          stage: 'Roteamento',
          success: true,
          processed: result.processed,
          duration: Date.now() - routeStart,
        });
        totalProcessed += result.processed;
        console.log(`   ✓ Para Notion: ${result.stats.toNotion}`);
        console.log(`   ✓ Para Obsidian: ${result.stats.toObsidian}`);
      } catch (error: any) {
        results.push({
          stage: 'Roteamento',
          success: false,
          processed: 0,
          duration: Date.now() - routeStart,
          error: error.message,
        });
        console.error('   ✗ Erro no roteamento:', error);
      }
    } else {
      console.log('\n✓ [Stage 4] Nenhuma mensagem para rotear');
    }

    const totalDuration = Date.now() - pipelineStart;
    const success = results.every(r => r.success);

    console.log('\n✅ [Monitor Agent] ===== PIPELINE CONCLUÍDO =====');
    console.log(`   Duração total: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Mensagens processadas: ${totalProcessed}`);
    console.log(`   Sucesso: ${success ? 'Sim' : 'Não'}`);

    return {
      success,
      results,
      totalProcessed,
      totalDuration,
    };
  }

  /**
   * Executa uma única verificação e processamento
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ [Monitor Agent] Pipeline já em execução, aguardando...');
      return;
    }

    this.isRunning = true;
    this.stats.totalRuns++;
    this.stats.lastRun = new Date().toISOString();

    try {
      const result = await this.runPipeline();
      
      if (result.success) {
        this.stats.successfulRuns++;
      } else {
        this.stats.failedRuns++;
      }

      this.stats.messagesProcessed += result.totalProcessed;
    } catch (error) {
      console.error('❌ [Monitor Agent] Erro crítico no pipeline:', error);
      this.stats.failedRuns++;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicia o monitoramento contínuo
   */
  start(): void {
    if (this.cronJob) {
      console.log('⚠️ [Monitor Agent] Já está em execução');
      return;
    }

    // Cron expression: a cada X horas
    const cronExpression = `0 */${this.intervalHours} * * *`;
    
    console.log(`🚀 [Monitor Agent] Iniciado`);
    console.log(`   Intervalo: A cada ${this.intervalHours} horas`);
    console.log(`   Cron: ${cronExpression}`);

    // Executa imediatamente
    this.run();

    // Agenda execuções futuras
    this.cronJob = cron.schedule(cronExpression, () => {
      console.log(`\n⏰ [Monitor Agent] Executando verificação agendada...`);
      this.run();
    });

    // Calcula próxima execução
    const next = new Date();
    next.setHours(next.getHours() + this.intervalHours);
    this.stats.nextRun = next.toISOString();
  }

  /**
   * Para o monitoramento
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = undefined;
      console.log('🛑 [Monitor Agent] Parado');
    } else {
      console.log('⚠️ [Monitor Agent] Não está em execução');
    }
  }

  /**
   * Obtém estatísticas do monitor
   */
  getStats(): MonitorStats {
    return { ...this.stats };
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const intervalHours = parseInt(process.argv[2] || '6', 10);
  const agent = new MonitorAgent(intervalHours);

  if (process.argv.includes('--daemon')) {
    // Modo daemon (contínuo)
    agent.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando monitor...');
      agent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Encerrando monitor...');
      agent.stop();
      process.exit(0);
    });

    // Mantém o processo rodando
    process.stdin.resume();
  } else {
    // Modo single-run
    agent.run().then(() => {
      console.log('\n📈 Estatísticas do monitor:');
      console.table(agent.getStats());
      process.exit(0);
    }).catch((error) => {
      console.error('❌ Erro ao executar monitor:', error);
      process.exit(1);
    });
  }
}

export default MonitorAgent;
