/**
 * AUTOMAÇÃO 3: Exportador de Tutoriais para Obsidian
 * 
 * Funcionalidades:
 * - Filtra mensagens classificadas como "tutorial"
 * - Gera arquivos markdown formatados para Obsidian
 * - Organiza por canal e data
 * - Inclui metadados, tags e links internos
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import config from './config';

interface TutorialMessage {
  id: string;
  content: string;
  channel: string;
  date: string;
  author?: string;
  classification: string;
  classification_confidence?: number;
  exported_to_obsidian?: boolean;
}

export class ObsidianTutorialExporter {
  private supabase: ReturnType<typeof createClient>;
  private vaultPath: string;

  constructor(vaultPath?: string) {
    // Initialize Supabase
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    this.vaultPath = vaultPath || config.obsidian.vaultPath;
  }

  /**
   * Busca tutoriais não exportados do Supabase
   */
  async getUnexportedTutorials(limit: number = 50): Promise<TutorialMessage[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('classification', 'tutorial')
        .or('exported_to_obsidian.is.null,exported_to_obsidian.eq.false')
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching tutorials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      return [];
    }
  }

  /**
   * Sanitiza nome de arquivo
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9\s\-\_]/gi, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  /**
   * Extrai título do tutorial
   */
  private extractTitle(content: string): string {
    // Procura por título markdown
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Pega a primeira linha significativa
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      let title = lines[0].replace(/[#*_~`]/g, '').trim();
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      return title;
    }

    return 'Tutorial do Telegram';
  }

  /**
   * Gera conteúdo markdown para Obsidian
   */
  private generateMarkdown(tutorial: TutorialMessage): string {
    const title = this.extractTitle(tutorial.content);
    const date = new Date(tutorial.date);
    const formattedDate = date.toISOString().split('T')[0];
    const confidence = tutorial.classification_confidence
      ? Math.round(tutorial.classification_confidence * 100)
      : 0;

    // Frontmatter YAML
    const frontmatter = `---
title: "${title}"
date: ${formattedDate}
canal: ${tutorial.channel}
autor: ${tutorial.author || 'Desconhecido'}
tags:
  - tutorial
  - telegram
  - ${this.sanitizeFilename(tutorial.channel)}
tipo: tutorial
confianca: ${confidence}
id: ${tutorial.id}
---

`;

    // Conteúdo principal
    const content = `# ${title}

> 📚 Tutorial extraído do canal **${tutorial.channel}**  
> 📅 Data: ${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR')}  
> ${tutorial.author ? `👤 Autor: ${tutorial.author}` : ''}

---

## Conteúdo

${tutorial.content}

---

## Metadados

- **Canal de Origem**: [[${tutorial.channel}]]
- **Data de Captura**: ${formattedDate}
- **Classificação**: Tutorial (${confidence}% confiança)
- **ID da Mensagem**: \`${tutorial.id}\`

## Tags Relacionadas

#tutorial #${this.sanitizeFilename(tutorial.channel)} #telegram

---

*Exportado automaticamente do sistema de raspagem do Telegram*
`;

    return frontmatter + content;
  }

  /**
   * Cria estrutura de diretórios por canal e data
   */
  private async ensureDirectoryStructure(
    channel: string,
    date: Date
  ): Promise<string> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const dirPath = path.join(
      this.vaultPath,
      'Tutoriais',
      this.sanitizeFilename(channel),
      String(year),
      month
    );

    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * Exporta um tutorial para arquivo markdown
   */
  async exportTutorial(tutorial: TutorialMessage): Promise<string | null> {
    try {
      const title = this.extractTitle(tutorial.content);
      const date = new Date(tutorial.date);
      const dirPath = await this.ensureDirectoryStructure(tutorial.channel, date);
      
      // Nome do arquivo: YYYY-MM-DD-titulo.md
      const filename = `${date.toISOString().split('T')[0]}-${this.sanitizeFilename(title)}.md`;
      const filePath = path.join(dirPath, filename);

      // Gera conteúdo markdown
      const markdown = this.generateMarkdown(tutorial);

      // Escreve arquivo
      await fs.writeFile(filePath, markdown, 'utf-8');

      return filePath;
    } catch (error) {
      console.error('Error exporting tutorial:', error);
      return null;
    }
  }

  /**
   * Atualiza o status de exportação no Supabase
   */
  async updateExportStatus(
    messageId: string,
    filePath: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          exported_to_obsidian: true,
          obsidian_file_path: filePath,
          exported_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating export status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating in Supabase:', error);
      return false;
    }
  }

  /**
   * Cria arquivo índice com todos os tutoriais
   */
  async createIndex(): Promise<void> {
    try {
      const { data: tutorials } = await this.supabase
        .from('messages')
        .select('*')
        .eq('classification', 'tutorial')
        .eq('exported_to_obsidian', true)
        .order('date', { ascending: false });

      if (!tutorials || tutorials.length === 0) {
        return;
      }

      // Agrupa por canal
      const byChannel: Record<string, TutorialMessage[]> = {};
      tutorials.forEach((tutorial: TutorialMessage) => {
        if (!byChannel[tutorial.channel]) {
          byChannel[tutorial.channel] = [];
        }
        byChannel[tutorial.channel].push(tutorial);
      });

      // Gera markdown do índice
      let indexContent = `---
title: "Índice de Tutoriais"
date: ${new Date().toISOString().split('T')[0]}
tags:
  - indice
  - tutoriais
---

# 📚 Índice de Tutoriais

> Última atualização: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

## Estatísticas

- **Total de tutoriais**: ${tutorials.length}
- **Canais**: ${Object.keys(byChannel).length}

---

`;

      // Adiciona seção por canal
      for (const [channel, channelTutorials] of Object.entries(byChannel)) {
        indexContent += `## ${channel} (${channelTutorials.length} tutoriais)\n\n`;
        
        channelTutorials.forEach((tutorial) => {
          const title = this.extractTitle(tutorial.content);
          const date = new Date(tutorial.date).toLocaleDateString('pt-BR');
          const filename = this.sanitizeFilename(title);
          indexContent += `- [[${filename}|${title}]] - ${date}\n`;
        });
        
        indexContent += '\n';
      }

      // Escreve arquivo índice
      const indexPath = path.join(this.vaultPath, 'Tutoriais', 'INDICE.md');
      await fs.writeFile(indexPath, indexContent, 'utf-8');
      
      console.log(`📑 Índice criado: ${indexPath}`);
    } catch (error) {
      console.error('Error creating index:', error);
    }
  }

  /**
   * Exporta um lote de tutoriais
   */
  async exportBatch(batchSize: number = 50): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    console.log('📖 Iniciando exportação de tutoriais para Obsidian...');
    console.log(`📂 Vault: ${this.vaultPath}`);

    const tutorials = await this.getUnexportedTutorials(batchSize);
    console.log(`📊 Encontrados ${tutorials.length} tutoriais para exportar`);

    if (tutorials.length === 0) {
      console.log('✅ Nenhum tutorial pendente de exportação!');
      return { processed: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const tutorial of tutorials) {
      console.log(`\n📝 Exportando tutorial: ${tutorial.id.substring(0, 8)}...`);
      console.log(`   Canal: ${tutorial.channel}`);
      console.log(`   Data: ${new Date(tutorial.date).toLocaleDateString('pt-BR')}`);

      const filePath = await this.exportTutorial(tutorial);

      if (filePath) {
        console.log(`   ✓ Arquivo criado: ${filePath}`);
        
        const updated = await this.updateExportStatus(tutorial.id, filePath);
        
        if (updated) {
          successful++;
          console.log('   ✓ Status atualizado no banco de dados');
        } else {
          console.log('   ⚠️ Arquivo criado mas falha ao atualizar status');
        }
      } else {
        failed++;
        console.log('   ✗ Falha ao exportar tutorial');
      }
    }

    // Cria índice atualizado
    console.log('\n📑 Atualizando índice...');
    await this.createIndex();

    console.log('\n✅ Exportação concluída!');
    console.log(`   Total processado: ${tutorials.length}`);
    console.log(`   Sucesso: ${successful}`);
    console.log(`   Falhas: ${failed}`);

    return {
      processed: tutorials.length,
      successful,
      failed,
    };
  }

  /**
   * Obtém estatísticas de exportação
   */
  async getStats(): Promise<{
    total_tutorials: number;
    exported: number;
    pending: number;
  }> {
    try {
      const { data: totalData } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('classification', 'tutorial');

      const { data: exportedData } = await this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('classification', 'tutorial')
        .eq('exported_to_obsidian', true);

      const total = totalData?.length || 0;
      const exported = exportedData?.length || 0;

      return {
        total_tutorials: total,
        exported: exported,
        pending: total - exported,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return { total_tutorials: 0, exported: 0, pending: 0 };
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const exporter = new ObsidianTutorialExporter();

  exporter.exportBatch(50).then(async (result) => {
    console.log('\n📈 Estatísticas de exportação:');
    const stats = await exporter.getStats();
    console.log(`   Total de tutoriais: ${stats.total_tutorials}`);
    console.log(`   Exportados: ${stats.exported}`);
    console.log(`   Pendentes: ${stats.pending}`);
  }).catch((error) => {
    console.error('❌ Erro ao executar exportação:', error);
    process.exit(1);
  });
}

export default ObsidianTutorialExporter;
