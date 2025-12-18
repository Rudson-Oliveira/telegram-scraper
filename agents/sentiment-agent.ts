/**
 * AGENTE 5: Analisador de Sentimento
 * 
 * Função: Identificar urgência/prioridade das mensagens
 * Tecnologia: Gemini API para análise de sentimento
 * Output: Score de urgência (0-10) e classificação de sentimento
 * 
 * Este agente analisa o tom e urgência das mensagens
 * para priorização de conteúdo
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
  classification?: string;
  urgency_score?: number;
  sentiment?: string;
}

interface SentimentAnalysis {
  urgency_score: number; // 0-10
  sentiment: 'positivo' | 'neutro' | 'negativo' | 'urgente' | 'informativo';
  priority: 'baixa' | 'média' | 'alta' | 'crítica';
  reasoning: string;
  keywords: string[];
}

export class SentimentAgent {
  private genAI: GoogleGenerativeAI;
  private supabase: ReturnType<typeof createClient>;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );
  }

  /**
   * Analisa o sentimento e urgência de uma mensagem
   */
  async analyzeSentiment(message: Message): Promise<SentimentAnalysis> {
    const prompt = `Você é um analisador de sentimento e urgência para mensagens de canais do Telegram sobre IA e tecnologia.

Analise a seguinte mensagem e determine:
1. Score de urgência (0-10): Quão urgente/importante é esta mensagem?
   - 0-2: Informação casual, não urgente
   - 3-5: Informação relevante, importância média
   - 6-8: Informação importante, requer atenção
   - 9-10: Crítico, requer ação imediata

2. Sentimento geral:
   - positivo: Notícias boas, oportunidades, celebrações
   - neutro: Informações factuais, tutoriais
   - negativo: Problemas, críticas, avisos
   - urgente: Requer ação imediata
   - informativo: Compartilhamento de conhecimento

3. Prioridade: baixa, média, alta, crítica

4. Palavras-chave que indicam urgência/importância

Mensagem:
---
${message.content}
---

Canal: ${message.channel}
${message.classification ? `Classificação: ${message.classification}` : ''}

Contexto adicional:
- Mensagens com datas limite = alta urgência
- Anúncios de ferramentas novas = alta relevância
- Tutoriais = média prioridade, informativo
- Discussões gerais = baixa prioridade

Responda APENAS em formato JSON:
{
  "urgency_score": número de 0 a 10,
  "sentiment": "positivo/neutro/negativo/urgente/informativo",
  "priority": "baixa/média/alta/crítica",
  "reasoning": "breve explicação",
  "keywords": ["palavra1", "palavra2"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from Gemini');
      }
      
      const analysis = JSON.parse(jsonMatch[0]) as SentimentAnalysis;
      
      // Validações
      analysis.urgency_score = Math.max(0, Math.min(10, analysis.urgency_score));
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        urgency_score: 5,
        sentiment: 'neutro',
        priority: 'média',
        reasoning: 'Erro na análise',
        keywords: [],
      };
    }
  }

  /**
   * Busca mensagens sem análise de sentimento
   */
  async getUnanalyzedMessages(limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .is('urgency_score', null)
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
   * Salva a análise no banco de dados
   */
  async saveSentimentAnalysis(
    messageId: string,
    analysis: SentimentAnalysis
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          urgency_score: analysis.urgency_score,
          sentiment: analysis.sentiment,
          priority: analysis.priority,
          sentiment_reasoning: analysis.reasoning,
          sentiment_keywords: analysis.keywords,
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) {
        console.error('Error saving sentiment analysis:', error);
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
    console.log('💭 [Sentiment Agent] Iniciando análise de sentimento...');
    
    const messages = await this.getUnanalyzedMessages(batchSize);
    console.log(`📊 Encontradas ${messages.length} mensagens para analisar`);

    if (messages.length === 0) {
      console.log('✅ Nenhuma mensagem pendente de análise!');
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
      console.log(`\n🔍 Analisando mensagem: ${message.id.substring(0, 8)}...`);
      console.log(`   Canal: ${message.channel}`);
      console.log(`   Conteúdo: ${message.content.substring(0, 80)}...`);

      const analysis = await this.analyzeSentiment(message);
      console.log(`   ✓ Urgência: ${analysis.urgency_score}/10`);
      console.log(`   ✓ Sentimento: ${analysis.sentiment}`);
      console.log(`   ✓ Prioridade: ${analysis.priority}`);
      console.log(`   ✓ Motivo: ${analysis.reasoning}`);

      const saved = await this.saveSentimentAnalysis(message.id, analysis);

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

    console.log('\n✅ Análise de sentimento concluída!');
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
   * Obtém mensagens de alta prioridade
   */
  async getHighPriorityMessages(limit: number = 20): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .gte('urgency_score', 7)
        .order('urgency_score', { ascending: false })
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching high priority messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error connecting to Supabase:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas de sentimento
   */
  async getStats(): Promise<{
    total_analyzed: number;
    by_sentiment: Record<string, number>;
    by_priority: Record<string, number>;
    avg_urgency: number;
    high_priority_count: number;
  }> {
    try {
      const { data } = await this.supabase
        .from('messages')
        .select('urgency_score, sentiment, priority')
        .not('urgency_score', 'is', null);

      if (!data || data.length === 0) {
        return {
          total_analyzed: 0,
          by_sentiment: {},
          by_priority: {},
          avg_urgency: 0,
          high_priority_count: 0,
        };
      }

      const bySentiment: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      let totalUrgency = 0;
      let highPriority = 0;

      data.forEach((msg: any) => {
        if (msg.sentiment) {
          bySentiment[msg.sentiment] = (bySentiment[msg.sentiment] || 0) + 1;
        }
        if (msg.priority) {
          byPriority[msg.priority] = (byPriority[msg.priority] || 0) + 1;
        }
        if (msg.urgency_score) {
          totalUrgency += msg.urgency_score;
          if (msg.urgency_score >= 7) {
            highPriority++;
          }
        }
      });

      return {
        total_analyzed: data.length,
        by_sentiment: bySentiment,
        by_priority: byPriority,
        avg_urgency: totalUrgency / data.length,
        high_priority_count: highPriority,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_analyzed: 0,
        by_sentiment: {},
        by_priority: {},
        avg_urgency: 0,
        high_priority_count: 0,
      };
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new SentimentAgent();

  if (process.argv.includes('--high-priority')) {
    // Mostrar mensagens de alta prioridade
    agent.getHighPriorityMessages(20).then((messages) => {
      console.log('\n🚨 Mensagens de Alta Prioridade (Urgência ≥ 7):');
      messages.forEach((msg, idx) => {
        console.log(`\n${idx + 1}. [${msg.urgency_score}/10] ${msg.channel}`);
        console.log(`   ${msg.content.substring(0, 100)}...`);
        console.log(`   Prioridade: ${msg.priority} | Sentimento: ${msg.sentiment}`);
      });
      process.exit(0);
    });
  } else {
    // Processar lote normal
    agent.processBatch(50).then(async (result) => {
      console.log('\n📊 Resultado da execução:');
      console.log(JSON.stringify(result, null, 2));

      console.log('\n📈 Estatísticas de sentimento:');
      const stats = await agent.getStats();
      console.log(`\nTotal analisado: ${stats.total_analyzed}`);
      console.log(`Urgência média: ${stats.avg_urgency.toFixed(2)}/10`);
      console.log(`Alta prioridade: ${stats.high_priority_count}`);
      
      console.log('\nPor Sentimento:');
      console.table(stats.by_sentiment);
      
      console.log('\nPor Prioridade:');
      console.table(stats.by_priority);

      process.exit(0);
    }).catch((error) => {
      console.error('❌ Erro ao executar agente:', error);
      process.exit(1);
    });
  }
}

export default SentimentAgent;
