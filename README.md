# Telegram Scraper - Base de Conhecimento INEMA.VIP

Sistema de raspagem do Telegram para coleta e armazenamento de mensagens de canais e grupos como base de conhecimento, com interface para configuração de API e gerenciamento de dados coletados.

## 🎯 Visão Geral

Sistema completo para:
- Raspagem automática de canais do Telegram (INEMA.VIP)
- Classificação por IA em 11 categorias
- Adaptação automática para contexto hospitalar
- Integração com N8N/Make via API REST
- Dashboard com métricas de ROI

## 📊 Status Atual

| Métrica | Valor |
|---------|-------|
| Canais Configurados | 24 |
| Mensagens Coletadas | 58 |
| Adaptações Hospitalares | 15 |
| ROI Potencial | R$ 170.000/ano |
| Testes Automatizados | 17 passando |

## 🚀 Funcionalidades

### Raspagem
- ✅ 24 canais INEMA pré-configurados
- ✅ Worker automático a cada 30 minutos
- ✅ Deduplicação inteligente (SHA-256)
- ✅ Classificação automática por IA

### API REST
- ✅ Autenticação por API Key
- ✅ Endpoints: /health, /messages, /channels, /stats, /export
- ✅ Filtros avançados (tipo, canal, classificação, busca)

### Workflows N8N
- ✅ Agente Secretária WhatsApp (Twilio)
- ✅ Coleta de Prompts
- ✅ Sincronização Obsidian
- ✅ Ferramentas para Notion

### Dashboard Hospitalar
- ✅ Métricas de ROI
- ✅ Top 5 oportunidades (score >= 4)
- ✅ Distribuição por score de usabilidade

## 📁 Estrutura do Projeto

```
telegram-scraper/
├── client/                 # Frontend React
├── server/                 # Backend Node.js + tRPC
├── drizzle/               # Schema do banco de dados
├── n8n-workflows/         # Workflows JSON prontos
│   ├── agente-secretaria-whatsapp-twilio.json
│   ├── telegram-scraper-prompts.json
│   ├── telegram-scraper-obsidian.json
│   └── telegram-scraper-notion-tools.json
├── docs/                  # Documentação e tutoriais
│   ├── AGENTE_SECRETARIA_TWILIO_5MIN.md
│   ├── AGENTE_SECRETARIA_WHATSAPP_30MIN.md
│   ├── TOP5_AUTOMACOES_COPIAR_COLAR.md
│   └── GUIA_RAPIDO_5_PASSOS.md
└── todo.md               # Lista de tarefas
```

## 🔧 Instalação

```bash
# Clonar repositório
git clone https://github.com/Rudson-Oliveira/telegram-scraper.git
cd telegram-scraper

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Iniciar servidor de desenvolvimento
pnpm dev
```

## 📖 Documentação

- [Guia Rápido: 5 Passos](docs/GUIA_RAPIDO_5_PASSOS.md)
- [Tutorial: Secretária WhatsApp em 5 min](docs/AGENTE_SECRETARIA_TWILIO_5MIN.md)
- [Tutorial: Secretária WhatsApp em 30 min](docs/AGENTE_SECRETARIA_WHATSAPP_30MIN.md)
- [Top 5 Automações Hospitalares](docs/TOP5_AUTOMACOES_COPIAR_COLAR.md)

## 📜 Histórico de Versões

### v3.0.0 (2024-12-18)
- ✅ Workflows N8N com credenciais Twilio
- ✅ Tutorial rápido de 5 minutos
- ✅ Arquivo .env pronto para copiar
- ✅ Documentação completa em MD e PDF

### v2.5.0 (2024-12-18)
- ✅ Dashboard hospitalar com ROI
- ✅ 15 adaptações para contexto hospitalar
- ✅ Top 5 oportunidades com score >= 4
- ✅ 58 mensagens coletadas do Telegram Web

### v2.0.0 (2024-12-17)
- ✅ API REST completa com autenticação
- ✅ Worker automático de raspagem
- ✅ Classificação por IA (11 categorias)
- ✅ Deduplicação inteligente

### v1.0.0 (2024-12-17)
- ✅ Dashboard principal
- ✅ 24 canais INEMA configurados
- ✅ Exportação JSON/CSV
- ✅ Sistema de busca e filtros

## 🔐 Segurança

**IMPORTANTE:** Nunca commite credenciais reais no repositório!

Arquivos protegidos pelo .gitignore:
- `.env` e variantes
- `TWILIO_ENV_PRONTO.env`
- Arquivos `*.session`
- Diretório `secrets/`

## 👤 Autor

**Rudson Oliveira** - CEO Telefonia Hospitalar Soluções
- WhatsApp: +55 35 99835-2323
- GitHub: [@Rudson-Oliveira](https://github.com/Rudson-Oliveira)

## 📄 Licença

Este projeto é privado e de uso exclusivo da Telefonia Hospitalar Soluções.
