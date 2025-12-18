/**
 * AUTOMAÇÃO 1: Classificador de Mensagens com IA (Gemini 2.0 Flash)
 * 
 * Funcionalidades:
 * - Lê mensagens raspadas do Supabase
 * - Usa Gemini API para classificar cada mensagem
 * - Categorias: prompt/tutorial/ferramenta/discussão/outro
 * - Salva classificação de volta no banco de dados
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import config from './config';

interface Message {
  id: string;
  content: string;
  channel: string;
  date: string;
  author?: string;
  classification?: string;
  urgency_score?: number;
}

interface ClassificationResult {
  category: 'prompt' | 'tutorial' | 'ferramenta' | 'discussão' | 'outro';
  confidence: number;
  reasoning: string;
}

export class MessageClassifier {
  private genAI: GoogleGenerativeAI;
  private supabase: ReturnType<typeof createClient>;
  private model: any;

  constructor() {
    // Initialize Gemini AI
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });

    // Initialize Supabase
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
  }

  /**
   * Classifica uma mensagem usando Gemini AI
   */
  async classifyMessage(message: Message): Promise<ClassificationResult> {
    const prompt = `Você é um classificador de mensagens de canais do Telegram focados em IA e tecnologia.

Analise a seguinte mensagem e classifique-a em uma das categorias:
- prompt: Prompts para modelos de IA, exemplos de prompting
- tutorial: Tutoriais, guias passo a passo, instruções
- ferramenta: Apresentação de ferramentas, APIs, softwares
- discussão: Discussões, opiniões, debates
- outro: Qualquer outra coisa

Mensagem:
---
${message.content}
---

Canal: ${message.channel}
${message.author ? `Autor: ${message.author}` : ''}

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "category": "uma das categorias acima",
  "confidence": número entre 0 e 1,
  "reasoning": "breve explicação da classificação"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from Gemini');
      }
      
      const classification = JSON.parse(jsonMatch[0]) as ClassificationResult;
      return classification;
    } catch (error) {
      console.error('Error classifying message:', error);
      return {
        category: 'outro',
        confidence: 0,
        reasoning: 'Erro na classificação',
      };
    }
  }

  /**
   * Busca mensagens não classificadas do Supabase
   */
  async getUnclassifiedMessages(limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .is('classification', null)
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
   * Atualiza a classificação da mensagem no Supabase
   */
  async updateMessageClassification(
    messageId: string,
    classification: ClassificationResult
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          classification: classification.category,
          classification_confidence: classification.confidence,
          classification_reasoning: classification.reasoning,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating message in Supabase:', error);
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
  }> {
    console.log('🤖 Iniciando classificação de mensagens...');
    
    const messages = await this.getUnclassifiedMessages(batchSize);
    console.log(`📊 Encontradas ${messages.length} mensagens não classificadas`);

    let successful = 0;
    let failed = 0;

    for (const message of messages) {
      console.log(`\n📝 Classificando mensagem: ${message.id.substring(0, 8)}...`);
      console.log(`   Canal: ${message.channel}`);
      console.log(`   Conteúdo: ${message.content.substring(0, 100)}...`);

      const classification = await this.classifyMessage(message);
      console.log(`   ✓ Categoria: ${classification.category}`);
      console.log(`   ✓ Confiança: ${(classification.confidence * 100).toFixed(1)}%`);

      const updated = await this.updateMessageClassification(
        message.id,
        classification
      );

      if (updated) {
        successful++;
        console.log('   ✓ Atualizado no banco de dados');
      } else {
        failed++;
        console.log('   ✗ Falha ao atualizar no banco de dados');
      }

      // Rate limiting - evitar sobrecarga da API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n✅ Classificação concluída!');
    console.log(`   Total processado: ${messages.length}`);
    console.log(`   Sucesso: ${successful}`);
    console.log(`   Falhas: ${failed}`);

    return {
      processed: messages.length,
      successful,
      failed,
    };
  }

  /**
   * Obtém estatísticas de classificação
   */
  async getStats(): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('classification')
        .not('classification', 'is', null);

      if (error || !data) {
        console.error('Error fetching stats:', error);
        return {};
      }

      const stats: Record<string, number> = {};
      data.forEach((row: any) => {
        const category = row.classification;
        stats[category] = (stats[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {};
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const classifier = new MessageClassifier();
  
  // Processar mensagens
  classifier.processBatch(50).then(async (result) => {
    console.log('\n📈 Estatísticas de classificação:');
    const stats = await classifier.getStats();
    Object.entries(stats).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} mensagens`);
    });
  }).catch((error) => {
    console.error('❌ Erro ao executar classificador:', error);
    process.exit(1);
  });
}

export default MessageClassifier;
