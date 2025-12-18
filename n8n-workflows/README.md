# Workflows N8N - Telegram Scraper INEMA

Este diretório contém templates de workflows N8N prontos para importar e integrar com o Telegram Scraper.

## Workflows Disponíveis

### 3. telegram-scraper-notion-tools.json
**Monitoramento de Ferramentas IA → Notion**

Este workflow monitora os canais do Telegram em busca de novas ferramentas de IA e adiciona automaticamente a um database no Notion.

**Funcionalidades:**
- Execução automática a cada 2 horas
- Detecção inteligente de URLs de ferramentas (.ai, .io, .app)
- Categorização automática em 10 categorias
- Deduplicacção automática
- Criação de páginas no Notion com metadados

**Categorias detectadas:**
| Categoria | Exemplos |
|-----------|----------|
| llm | ChatGPT, Claude, Gemini, Perplexity |
| imagem | Midjourney, DALL-E, Leonardo, Ideogram |
| video | HeyGen, Runway, Pika, Kling |
| audio | Suno, ElevenLabs, Udio |
| automacao | N8N, Make, Zapier |
| agentes | CrewAI, AutoGPT, LangChain |
| codigo | Cursor, Copilot, V0, Bolt |
| pesquisa | Perplexity, Phind, Consensus |
| produtividade | Notion AI, Otter, Fireflies |
| design | Figma AI, Framer, Relume |

**Estrutura do Database Notion:**
- Nome (Title)
- URL (URL)
- Descrição (Text)
- Categoria (Select)
- Fonte (Select)
- Data Descoberta (Date)
- Status (Select): Para Testar, Testando, Aprovado, Descartado

---

### 1. telegram-scraper-prompts.json
**Coleta e Filtragem de Prompts**

Este workflow coleta prompts do Telegram Scraper, categoriza automaticamente e salva em arquivos Markdown organizados por categoria.

**Funcionalidades:**
- Execução automática a cada 1 hora
- Categorização automática: LLM, Imagem, Automação, Agentes, Áudio, Vídeo
- Geração de arquivos Markdown com frontmatter YAML
- Organização em pastas por categoria

**Categorias detectadas:**
| Categoria | Palavras-chave |
|-----------|----------------|
| llm | gpt, claude, gemini |
| imagem | midjourney, dall-e, stable diffusion |
| automacao | n8n, make, workflow |
| agentes | agent, crewai, autogpt |
| audio | suno, udio, música |
| video | heygen, d-id, avatar |

---

### 2. telegram-scraper-obsidian.json
**Sincronização com Obsidian**

Este workflow sincroniza automaticamente os dados coletados com seu vault do Obsidian usando o plugin Local REST API.

**Funcionalidades:**
- Execução automática a cada 6 horas
- Agrupamento por categoria
- Criação automática de estrutura de pastas
- Formatação Markdown otimizada para Obsidian

**Estrutura de pastas criada:**
```
INEMA/
├── prompts/
├── automacoes/
├── ferramentas/
├── links/
└── outros/
```

---

## Como Importar no N8N

1. Abra seu N8N
2. Clique em **Workflows** → **Import from File**
3. Selecione o arquivo JSON desejado
4. Configure as variáveis de ambiente

---

## Configuração

### Variáveis de Ambiente Necessárias

No N8N, vá em **Settings** → **Variables** e adicione:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `TELEGRAM_SCRAPER_URL` | `https://sua-url.manus.space` | URL do seu Telegram Scraper |

### Para o Workflow Obsidian

1. **Instale o plugin Local REST API no Obsidian:**
   - Abra Obsidian → Settings → Community Plugins
   - Busque por "Local REST API"
   - Instale e ative

2. **Configure o plugin:**
   - Porta padrão: 27123
   - Gere uma API Key

3. **Configure credenciais no N8N:**
   - Vá em Credentials → New Credential
   - Tipo: Header Auth
   - Header Name: `Authorization`
   - Header Value: `Bearer SUA_API_KEY`

---

## Endpoints do Telegram Scraper

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/webhooks/messages` | GET | Todas as mensagens |
| `/api/webhooks/messages?type=prompt` | GET | Apenas prompts |
| `/api/webhooks/messages?type=image` | GET | Apenas imagens |
| `/api/webhooks/messages?channelId=1` | GET | Por canal específico |
| `/api/webhooks/channels` | GET | Lista de canais |
| `/api/webhooks/export` | GET | Exportação completa |

---

## Personalização

### Ajustar Intervalo de Execução

No nó "Agendamento", você pode alterar:
- `hoursInterval`: Intervalo em horas
- `minutesInterval`: Intervalo em minutos
- Ou usar expressão cron para agendamentos específicos

### Adicionar Novas Categorias

No nó "Processar Prompts" (Code), adicione novas condições:

```javascript
if (contentLower.includes('sua-palavra-chave')) {
  category = 'sua-categoria';
}
```

### Integrar com Outros Serviços

Você pode adicionar nós para:
- **Google Drive**: Salvar arquivos na nuvem
- **Notion**: Criar páginas automaticamente
- **Slack/Discord**: Notificar sobre novos prompts
- **Airtable**: Criar banco de dados de prompts

---

## Suporte

Criado para integração com o Telegram Scraper INEMA VIP.
Desenvolvido por Manus AI para Rudson Oliveira.
