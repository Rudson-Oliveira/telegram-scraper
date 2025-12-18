/**
 * AGENTE 2: Extrator de Conteúdo
 * 
 * Função: Resumir mensagens longas (>500 caracteres) usando IA
 * Tecnologia: Gemini API
 * Output: Resumo de 2-3 frases
 * 
 * Este agente processa mensagens longas e cria resumos concisos
 * para facilitar a leitura e organização
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import config from '../automations/config';

interface Message {
  id: string;
  content: string;
  channel: string;
  date: string;
  author?: string;
  summary?: string;
  needs_summary?: boolean;
}

interface ExtractionResult {
  summary: string;
  keyPoints: string[];
  wordCount: number;
}

export class ContentExtractorAgent {
  private genAI: GoogleGenerativeAI;
  private supabase: ReturnType<typeof createClient>;
  private model: any;
  private minLength: number;

  constructor(minLength: number = 500) {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
    this.minLength = minLength;
  }

  /**
   * Extrai resumo e pontos-chave de uma mensagem
   */
  async extractContent(message: Message): Promise<ExtractionResult> {
    const prompt = `Você é um especialista em resumir conteúdo técnico sobre IA e tecnologia.

Analise a seguinte mensagem do Telegram e crie:
1. Um resumo conciso de 2-3 frases
2. Lista de 3-5 pontos-chave mais importantes

Mensagem:
---
${message.content}
---

Canal: ${message.channel}
${message.author ? `Autor: ${message.author}` : ''}

Responda APENAS em formato JSON:
{
  "summary": "resumo de 2-3 frases aqui",
  "keyPoints": ["ponto 1", "ponto 2", "ponto 3"],
  "wordCount": número de palavras do texto original
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from Gemini');
      }
      
      const extraction = JSON.parse(jsonMatch[0]) as ExtractionResult;
      return extraction;
    } catch (error) {
      console.error('Error extracting content:', error);
      return {
        summary: message.content.substring(0, 200) + '...',
        keyPoints: [],
        wordCount: message.content.split(/\s+/).length,
      };
    }
  }

  /**
   * Busca mensagens longas que precisam de resumo
   */
  async getLongMessages(limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .is('summary', null)
        .order('date', { ascending: false })
        .limit(limit * 2); // Pega mais para filtrar localmente

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      // Filtra apenas mensagens longas
      const longMessages = (data || []).filter(
        (msg: Message) => msg.content.length >= this.minLength
      ).slice(0, limit);

      return longMessages;
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      return [];
    }
  }

  /**
   * Salva o resumo no banco de dados
   */
  async saveSummary(
    messageId: string,
    extraction: ExtractionResult
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          summary: extraction.summary,
          key_points: extraction.keyPoints,
          word_count: extraction.wordCount,
          summarized_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error saving summary:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating in Supabase:', error);
      return false;
    }
  }

  /**
   * Processa um lote de mensagens
   */
  async processBatch(batchSize: number = 50): Promise<{
    processed: number;
    successful: number;
    failed: number;
    timestamp: string;
  }> {
    console.log(`📝 [Extractor Agent] Iniciando extração de conteúdo (min ${this.minLength} caracteres)...`);
    
    const messages = await this.getLongMessages(batchSize);
    console.log(`📊 Encontradas ${messages.length} mensagens longas sem resumo`);

    if (messages.length === 0) {
      console.log('✅ Nenhuma mensagem longa pendente!');
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      };
    }

    let successful = 0;
    let failed = 0;

    for (const message of messages) {
      console.log(`\n📄 Processando mensagem: ${message.id.substring(0, 8)}...`);
      console.log(`   Canal: ${message.channel}`);
      console.log(`   Tamanho: ${message.content.length} caracteres`);

      const extraction = await this.extractContent(message);
      console.log(`   ✓ Resumo: ${extraction.summary.substring(0, 100)}...`);
      console.log(`   ✓ Pontos-chave: ${extraction.keyPoints.length}`);

      const saved = await this.saveSummary(message.id, extraction);

      if (saved) {
        successful++;
        console.log('   ✓ Salvo no banco de dados');
      } else {
        failed++;
        console.log('   ✗ Falha ao salvar no banco de dados');
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ Extração concluída!');
    console.log(`   Total processado: ${messages.length}`);
    console.log(`   Sucesso: ${successful}`);
    console.log(`   Falhas: ${failed}`);

    return {
      processed: messages.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Obtém estatísticas
   */
  async getStats(): Promise<{
    total_messages: number;
    with_summary: number;
    pending: number;
    avg_length: number;
  }> {
    try {
      const { data: allData } = await this.supabase
        .from('messages')
        .select('content, summary');

      if (!allData) {
        return {
          total_messages: 0,
          with_summary: 0,
          pending: 0,
          avg_length: 0,
        };
      }

      const longMessages = allData.filter(
        (msg: any) => msg.content.length >= this.minLength
      );
      const withSummary = longMessages.filter((msg: any) => msg.summary);
      const avgLength = longMessages.reduce(
        (sum: number, msg: any) => sum + msg.content.length,
        0
      ) / (longMessages.length || 1);

      return {
        total_messages: longMessages.length,
        with_summary: withSummary.length,
        pending: longMessages.length - withSummary.length,
        avg_length: Math.round(avgLength),
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_messages: 0,
        with_summary: 0,
        pending: 0,
        avg_length: 0,
      };
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const minLength = parseInt(process.argv[2] || '500', 10);
  const agent = new ContentExtractorAgent(minLength);

  agent.processBatch(50).then(async (result) => {
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

export default ContentExtractorAgent;
