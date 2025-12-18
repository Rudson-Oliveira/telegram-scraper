/**
 * AGENTE 1: Classificador IA
 * 
 * Função: Categorizar mensagens automaticamente usando Gemini 2.0 Flash
 * Tecnologia: Gemini API
 * Trigger: Novas mensagens no banco
 * 
 * Este agente encapsula a funcionalidade de classificação
 * e pode ser executado de forma independente ou como parte de um pipeline
 */

import MessageClassifier from '../automations/classifier';
import config from '../automations/config';

export interface ClassifierAgentConfig {
  batchSize?: number;
  autoRun?: boolean;
  intervalMinutes?: number;
}

export class ClassifierAgent {
  private classifier: MessageClassifier;
  private config: ClassifierAgentConfig;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(agentConfig: ClassifierAgentConfig = {}) {
    this.classifier = new MessageClassifier();
    this.config = {
      batchSize: agentConfig.batchSize || 50,
      autoRun: agentConfig.autoRun || false,
      intervalMinutes: agentConfig.intervalMinutes || 30,
    };
  }

  /**
   * Executa uma única rodada de classificação
   */
  async run(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    timestamp: string;
  }> {
    console.log('🤖 [Classificador Agent] Iniciando...');
    const startTime = Date.now();

    try {
      const result = await this.classifier.processBatch(this.config.batchSize!);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ [Classificador Agent] Concluído em ${duration}s`);

      return {
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [Classificador Agent] Erro:', error);
      throw error;
    }
  }

  /**
   * Inicia execução contínua do agente
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ [Classificador Agent] Já está em execução');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 [Classificador Agent] Iniciado com intervalo de ${this.config.intervalMinutes} minutos`);

    // Executa imediatamente
    this.run().catch(console.error);

    // Configura execução periódica
    this.intervalId = setInterval(() => {
      this.run().catch(console.error);
    }, this.config.intervalMinutes! * 60 * 1000);
  }

  /**
   * Para a execução contínua do agente
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ [Classificador Agent] Não está em execução');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.isRunning = false;
    console.log('🛑 [Classificador Agent] Parado');
  }

  /**
   * Verifica o status do agente
   */
  getStatus(): {
    running: boolean;
    config: ClassifierAgentConfig;
  } {
    return {
      running: this.isRunning,
      config: this.config,
    };
  }

  /**
   * Obtém estatísticas de classificação
   */
  async getStats(): Promise<Record<string, number>> {
    return await this.classifier.getStats();
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new ClassifierAgent({
    batchSize: 50,
    autoRun: process.argv.includes('--watch'),
    intervalMinutes: 30,
  });

  if (process.argv.includes('--watch')) {
    // Modo contínuo
    agent.start();

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando agente...');
      agent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Encerrando agente...');
      agent.stop();
      process.exit(0);
    });
  } else {
    // Modo single-run
    agent.run().then(async (result) => {
      console.log('\n📊 Resultado da execução:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📈 Estatísticas:');
      const stats = await agent.getStats();
      console.table(stats);

      process.exit(0);
    }).catch((error) => {
      console.error('❌ Erro ao executar agente:', error);
      process.exit(1);
    });
  }
}

export default ClassifierAgent;
