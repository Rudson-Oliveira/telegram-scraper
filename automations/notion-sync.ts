/**
 * AUTOMAÇÃO 2: Sincronizador de Prompts no Notion
 * 
 * Funcionalidades:
 * - Filtra mensagens classificadas como "prompt"
 * - Usa Notion API para criar páginas no Notion
 * - Inclui: título, conteúdo do prompt, data, canal de origem
 * - Evita duplicatas verificando mensagens já sincronizadas
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import config from './config';

interface PromptMessage {
  id: string;
  content: string;
  channel: string;
  date: string;
  author?: string;
  classification: string;
  classification_confidence?: number;
  synced_to_notion?: boolean;
  notion_page_id?: string;
}

export class NotionPromptSync {
  private notion: Client;
  private supabase: ReturnType<typeof createClient>;
  private databaseId: string;

  constructor(databaseId?: string) {
    // Initialize Notion
    this.notion = new Client({
      auth: config.notion.apiKey,
    });

    // Initialize Supabase
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    this.databaseId = databaseId || config.notion.databaseId;

    if (!this.databaseId) {
      console.warn('⚠️ NOTION_DATABASE_ID não configurado. Use setDatabaseId() para definir.');
    }
  }

  /**
   * Define o ID do banco de dados do Notion
   */
  setDatabaseId(databaseId: string): void {
    this.databaseId = databaseId;
  }

  /**
   * Cria ou obtém o banco de dados no Notion
   */
  async ensureDatabase(): Promise<string> {
    if (this.databaseId) {
      return this.databaseId;
    }

    console.log('📋 Criando banco de dados no Notion...');
    
    try {
      // Note: Creating databases requires parent page ID
      // This is a placeholder - user needs to provide database ID
      throw new Error('Database ID not configured. Please set NOTION_DATABASE_ID in .env');
    } catch (error) {
      console.error('❌ Erro ao criar banco de dados:', error);
      throw error;
    }
  }

  /**
   * Busca prompts não sincronizados do Supabase
   */
  async getUnsyncedPrompts(limit: number = 50): Promise<PromptMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('classification', 'prompt')
        .or('synced_to_notion.is.null,synced_to_notion.eq.false')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching prompts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      return [];
    }
  }

  /**
   * Extrai título do prompt (primeiras palavras ou resumo)
   */
  private extractTitle(content: string): string {
    // Remove markdown e formatação
    let title = content.replace(/[#*_~`]/g, '').trim();
    
    // Pega as primeiras 60 caracteres
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    // Se começar com "prompt:" ou similar, remove
    title = title.replace(/^(prompt|example|exemplo):\s*/i, '');
    
    return title || 'Prompt do Telegram';
  }

  /**
   * Cria uma página no Notion para um prompt
   */
  async createNotionPage(prompt: PromptMessage): Promise<string | null> {
    try {
      const title = this.extractTitle(prompt.content);
      const formattedDate = new Date(prompt.date).toISOString();

      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties: {
          // Title property (required)
          'Nome': {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
          // Tags/Category
          'Tags': {
            multi_select: [
              { name: 'Prompt' },
              { name: prompt.channel },
            ],
          },
          // Date
          'Data': {
            date: {
              start: formattedDate,
            },
          },
          // Canal
          'Canal': {
            rich_text: [
              {
                text: {
                  content: prompt.channel,
                },
              },
            ],
          },
          // Autor (if available)
          ...(prompt.author && {
            'Autor': {
              rich_text: [
                {
                  text: {
                    content: prompt.author,
                  },
                },
              ],
            },
          }),
          // Confidence
          ...(prompt.classification_confidence && {
            'Confiança': {
              number: Math.round(prompt.classification_confidence * 100),
            },
          }),
        },
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: '📝 Conteúdo do Prompt',
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: prompt.content,
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'divider',
            divider: {},
          },
          {
            object: 'block',
            type: 'callout',
            callout: {
              icon: {
                emoji: 'ℹ️',
              },
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `Origem: ${prompt.channel} | Data: ${new Date(prompt.date).toLocaleDateString('pt-BR')}`,
                  },
                },
              ],
            },
          },
        ],
      });

      return response.id;
    } catch (error: any) {
      console.error('Error creating Notion page:', error?.body || error);
      return null;
    }
  }

  /**
   * Atualiza o status de sincronização no Supabase
   */
  async updateSyncStatus(
    messageId: string,
    notionPageId: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          synced_to_notion: true,
          notion_page_id: notionPageId,
          synced_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating sync status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating in Supabase:', error);
      return false;
    }
  }

  /**
   * Sincroniza um lote de prompts para o Notion
   */
  async syncBatch(batchSize: number = 50): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    console.log('📚 Iniciando sincronização de prompts para o Notion...');

    if (!this.databaseId) {
      console.error('❌ NOTION_DATABASE_ID não configurado!');
      console.log('   Configure a variável de ambiente ou use setDatabaseId()');
      return { processed: 0, successful: 0, failed: 0 };
    }

    const prompts = await this.getUnsyncedPrompts(batchSize);
    console.log(`📊 Encontrados ${prompts.length} prompts para sincronizar`);

    if (prompts.length === 0) {
      console.log('✅ Nenhum prompt pendente de sincronização!');
      return { processed: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const prompt of prompts) {
      console.log(`\n📝 Sincronizando prompt: ${prompt.id.substring(0, 8)}...`);
      console.log(`   Canal: ${prompt.channel}`);
      console.log(`   Data: ${new Date(prompt.date).toLocaleDateString('pt-BR')}`);

      const notionPageId = await this.createNotionPage(prompt);

      if (notionPageId) {
        console.log(`   ✓ Página criada no Notion: ${notionPageId}`);
        
        const updated = await this.updateSyncStatus(prompt.id, notionPageId);
        
        if (updated) {
          successful++;
          console.log('   ✓ Status atualizado no banco de dados');
        } else {
          console.log('   ⚠️ Página criada mas falha ao atualizar status');
        }
      } else {
        failed++;
        console.log('   ✗ Falha ao criar página no Notion');
      }

      // Rate limiting - evitar sobrecarga da API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✅ Sincronização concluída!');
    console.log(`   Total processado: ${prompts.length}`);
    console.log(`   Sucesso: ${successful}`);
    console.log(`   Falhas: ${failed}`);

    return {
      processed: prompts.length,
      successful,
      failed,
    };
  }

  /**
   * Obtém estatísticas de sincronização
   */
  async getStats(): Promise<{
    total_prompts: number;
    synced: number;
    pending: number;
  }> {
    try {
      const { data: totalData } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('classification', 'prompt');

      const { data: syncedData } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('classification', 'prompt')
        .eq('synced_to_notion', true);

      const total = totalData?.length || 0;
      const synced = syncedData?.length || 0;

      return {
        total_prompts: total,
        synced: synced,
        pending: total - synced,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { total_prompts: 0, synced: 0, pending: 0 };
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const sync = new NotionPromptSync();

  // Check if database ID is provided as argument
  if (process.argv[2]) {
    sync.setDatabaseId(process.argv[2]);
  }

  sync.syncBatch(50).then(async (result) => {
    console.log('\n📈 Estatísticas de sincronização:');
    const stats = await sync.getStats();
    console.log(`   Total de prompts: ${stats.total_prompts}`);
    console.log(`   Sincronizados: ${stats.synced}`);
    console.log(`   Pendentes: ${stats.pending}`);
  }).catch((error) => {
    console.error('❌ Erro ao executar sincronização:', error);
    process.exit(1);
  });
}

export default NotionPromptSync;
