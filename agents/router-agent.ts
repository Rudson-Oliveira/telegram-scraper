/**
 * AGENTE 3: Roteador
 * 
 * Função: Enviar conteúdo para destinos corretos
 * Rotas: Notion (prompts), Obsidian (tutoriais), Supabase (tudo)
 * Lógica: Baseada na classificação das mensagens
 * 
 * Este agente coordena o fluxo de dados entre diferentes sistemas
 */

import NotionPromptSync from '../automations/notion-sync';
import ObsidianTutorialExporter from '../automations/obsidian-export';
import { createClient } from '@supabase/supabase-js';
import config from '../automations/config';

interface RoutingStats {
  toNotion: number;
  toObsidian: number;
  total: number;
  errors: number;
}

interface Message {
  id: string;
  content: string;
  classification: string;
  synced_to_notion?: boolean;
  exported_to_obsidian?: boolean;
}

export class RouterAgent {
  private notionSync: NotionPromptSync;
  private obsidianExporter: ObsidianTutorialExporter;
  private supabase: ReturnType<typeof createClient>;

  constructor(notionDatabaseId?: string, obsidianVaultPath?: string) {
    this.notionSync = new NotionPromptSync(notionDatabaseId);
    this.obsidianExporter = new ObsidianTutorialExporter(obsidianVaultPath);
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
  }

  /**
   * Verifica mensagens que precisam ser roteadas
   */
  async getMessagesToRoute(limit: number = 100): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .not('classification', 'is', null)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      return [];
    }
  }

  /**
   * Determina o destino da mensagem baseado na classificação
   */
  getRoutes(message: Message): {
    toNotion: boolean;
    toObsidian: boolean;
    reason: string;
  } {
    const routes = {
      toNotion: false,
      toObsidian: false,
      reason: '',
    };

    switch (message.classification) {
      case 'prompt':
        routes.toNotion = !message.synced_to_notion;
        routes.reason = 'Prompt → Notion';
        break;

      case 'tutorial':
        routes.toObsidian = !message.exported_to_obsidian;
        routes.reason = 'Tutorial → Obsidian';
        break;

      case 'ferramenta':
        // Ferramentas vão para Notion E Obsidian
        routes.toNotion = !message.synced_to_notion;
        routes.toObsidian = !message.exported_to_obsidian;
        routes.reason = 'Ferramenta → Notion + Obsidian';
        break;

      default:
        routes.reason = `${message.classification} → Apenas Supabase`;
        break;
    }

    return routes;
  }

  /**
   * Roteia uma única mensagem
   */
  async routeMessage(message: Message): Promise<{
    success: boolean;
    routes: string[];
    errors: string[];
  }> {
    const result = {
      success: true,
      routes: [] as string[],
      errors: [] as string[],
    };

    const routing = this.getRoutes(message);

    // Rotear para Notion
    if (routing.toNotion) {
      try {
        const notionPageId = await this.notionSync.createNotionPage(message as any);
        if (notionPageId) {
          await this.notionSync.updateSyncStatus(message.id, notionPageId);
          result.routes.push('Notion');
        } else {
          result.errors.push('Falha ao criar página no Notion');
          result.success = false;
        }
      } catch (error: any) {
        result.errors.push(`Notion: ${error.message}`);
        result.success = false;
      }
    }

    // Rotear para Obsidian
    if (routing.toObsidian) {
      try {
        const filePath = await this.obsidianExporter.exportTutorial(message as any);
        if (filePath) {
          await this.obsidianExporter.updateExportStatus(message.id, filePath);
          result.routes.push('Obsidian');
        } else {
          result.errors.push('Falha ao exportar para Obsidian');
          result.success = false;
        }
      } catch (error: any) {
        result.errors.push(`Obsidian: ${error.message}`);
        result.success = false;
      }
    }

    // Se não teve nenhuma rota, está tudo OK (mensagem já processada ou não requer roteamento)
    if (!routing.toNotion && !routing.toObsidian) {
      result.routes.push('Já processado');
    }

    return result;
  }

  /**
   * Processa um lote de mensagens
   */
  async processBatch(batchSize: number = 100): Promise<{
    processed: number;
    stats: RoutingStats;
    timestamp: string;
  }> {
    console.log('🔀 [Router Agent] Iniciando roteamento de mensagens...');
    
    const messages = await this.getMessagesToRoute(batchSize);
    console.log(`📊 Encontradas ${messages.length} mensagens para avaliar`);

    const stats: RoutingStats = {
      toNotion: 0,
      toObsidian: 0,
      total: 0,
      errors: 0,
    };

    for (const message of messages) {
      console.log(`\n📬 Roteando mensagem: ${message.id.substring(0, 8)}...`);
      console.log(`   Classificação: ${message.classification}`);

      const routing = this.getRoutes(message);
      console.log(`   Destino: ${routing.reason}`);

      const result = await this.routeMessage(message);

      if (result.success) {
        stats.total++;
        
        if (result.routes.includes('Notion')) {
          stats.toNotion++;
          console.log('   ✓ Enviado para Notion');
        }
        
        if (result.routes.includes('Obsidian')) {
          stats.toObsidian++;
          console.log('   ✓ Enviado para Obsidian');
        }

        if (result.routes.includes('Já processado')) {
          console.log('   ✓ Já processado anteriormente');
        }
      } else {
        stats.errors++;
        console.log(`   ✗ Erros: ${result.errors.join(', ')}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Roteamento concluído!');
    console.log(`   Total processado: ${messages.length}`);
    console.log(`   Para Notion: ${stats.toNotion}`);
    console.log(`   Para Obsidian: ${stats.toObsidian}`);
    console.log(`   Erros: ${stats.errors}`);

    return {
      processed: messages.length,
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtém estatísticas gerais de roteamento
   */
  async getStats(): Promise<{
    total_classified: number;
    routed_to_notion: number;
    routed_to_obsidian: number;
    pending_routing: number;
  }> {
    try {
      const { data: classified } = await this.supabase
        .from('messages')
        .select('classification, synced_to_notion, exported_to_obsidian')
        .not('classification', 'is', null);

      if (!classified) {
        return {
          total_classified: 0,
          routed_to_notion: 0,
          routed_to_obsidian: 0,
          pending_routing: 0,
        };
      }

      const routedToNotion = classified.filter(
        (m: any) => (m.classification === 'prompt' || m.classification === 'ferramenta') && m.synced_to_notion
      ).length;

      const routedToObsidian = classified.filter(
        (m: any) => (m.classification === 'tutorial' || m.classification === 'ferramenta') && m.exported_to_obsidian
      ).length;

      const needsNotion = classified.filter(
        (m: any) => (m.classification === 'prompt' || m.classification === 'ferramenta') && !m.synced_to_notion
      ).length;

      const needsObsidian = classified.filter(
        (m: any) => (m.classification === 'tutorial' || m.classification === 'ferramenta') && !m.exported_to_obsidian
      ).length;

      return {
        total_classified: classified.length,
        routed_to_notion: routedToNotion,
        routed_to_obsidian: routedToObsidian,
        pending_routing: needsNotion + needsObsidian,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_classified: 0,
        routed_to_notion: 0,
        routed_to_obsidian: 0,
        pending_routing: 0,
      };
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const notionDbId = process.argv[2];
  const obsidianPath = process.argv[3];
  
  const agent = new RouterAgent(notionDbId, obsidianPath);

  agent.processBatch(100).then(async (result) => {
    console.log('\n📊 Resultado da execução:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n📈 Estatísticas gerais:');
    const stats = await agent.getStats();
    console.table(stats);

    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro ao executar agente:', error);
    process.exit(1);
  });
}

export default RouterAgent;
