# Telegram Scraper - Guia de Configuração

## Visão Geral

Este sistema permite raspar e organizar conteúdo do Telegram (mensagens, imagens, vídeos, prompts) de canais e grupos, armazenando tudo em um banco de dados MySQL para consulta posterior.

---

## Passo 1: Obter Credenciais da API do Telegram

### 1.1 Acessar o Portal do Telegram

1. Abra o navegador e acesse: **https://my.telegram.org**
2. Digite seu número de telefone com código do país: `+55 35 99835 2323`
3. O Telegram enviará um código de verificação para seu app
4. Digite o código recebido

### 1.2 Criar Aplicação API

1. Após login, clique em **"API development tools"**
2. Preencha o formulário:
   - **App title**: `Telegram Scraper` (ou qualquer nome)
   - **Short name**: `tgscraper` (sem espaços)
   - **URL**: deixe em branco
   - **Platform**: `Desktop`
   - **Description**: `Sistema de raspagem de conteúdo`
3. Clique em **"Create application"**

### 1.3 Copiar Credenciais

Após criar, você verá:
- **api_id**: Um número (ex: `12345678`)
- **api_hash**: Uma string alfanumérica (ex: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

**IMPORTANTE**: Guarde essas credenciais em local seguro!

---

## Passo 2: Configurar no Sistema

### 2.1 Acessar Configurações

1. Acesse o sistema Telegram Scraper
2. Clique no ícone de **Configurações** (engrenagem) no canto superior direito
3. Ou acesse diretamente: `/settings`

### 2.2 Inserir Credenciais

1. Cole o **API ID** no campo correspondente
2. Cole o **API Hash** no campo correspondente
3. (Opcional) Insira seu número de telefone: `+5535998352323`
4. Clique em **"Salvar Configurações"**

---

## Passo 3: Adicionar Canais do Telegram

### 3.1 Canais Pré-configurados (INEMA.vip)

1. Acesse **"Canais do Telegram"** no menu
2. Clique no botão **"Canais INEMA"** (com ícone de estrela)
3. Os canais do INEMA.vip serão adicionados automaticamente

### 3.2 Adicionar Canais Manualmente

1. Clique em **"Adicionar Canal"**
2. Preencha:
   - **Nome**: Nome de exibição do canal
   - **Username**: @username do canal (sem o @)
   - **Tipo**: Canal, Grupo ou Supergrupo
   - **Descrição**: (opcional)
3. Clique em **"Adicionar"**

### 3.3 Exemplos de Canais

| Nome | Username | Tipo |
|------|----------|------|
| INEMA VIP | inema_vip | Canal |
| Automações IA | automacoes_ia | Grupo |
| Prompts GPT | prompts_gpt | Canal |

---

## Passo 4: Iniciar Raspagem

### 4.1 Via Interface

1. Acesse **"Iniciar Raspagem"** no menu
2. Selecione os canais desejados
3. Configure o limite de mensagens (padrão: 100)
4. Clique em **"Iniciar Coleta"**

### 4.2 Via Script Python (Avançado)

```bash
cd /home/ubuntu/telegram-scraper/scripts

python3 telegram_scraper.py \
  --api-id SEU_API_ID \
  --api-hash SEU_API_HASH \
  --channels @canal1 @canal2 \
  --limit 500 \
  --format both
```

---

## Passo 5: Integração com N8N/Make

### 5.1 Endpoints Disponíveis

Base URL: `https://seu-dominio.com/api/webhooks`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/messages` | GET | Lista mensagens coletadas |
| `/channels` | GET | Lista canais configurados |
| `/stats` | GET | Estatísticas do dashboard |
| `/scrape` | POST | Inicia nova raspagem |
| `/prompts` | GET | Lista apenas prompts/IA |
| `/export` | GET | Exporta dados (JSON/CSV) |

### 5.2 Autenticação

Todas as requisições precisam dos headers:
```
X-API-Key: sua-api-key
X-User-Id: seu-user-id
```

### 5.3 Exemplo N8N

```json
{
  "nodes": [
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://seu-dominio.com/api/webhooks/prompts",
        "method": "GET",
        "headers": {
          "X-API-Key": "{{$credentials.apiKey}}",
          "X-User-Id": "{{$credentials.userId}}"
        }
      }
    }
  ]
}
```

### 5.4 Exemplo Make (Integromat)

1. Adicione módulo **HTTP > Make a request**
2. Configure:
   - URL: `https://seu-dominio.com/api/webhooks/messages`
   - Method: GET
   - Headers: X-API-Key, X-User-Id

---

## Passo 6: Visualizar e Exportar Dados

### 6.1 Base de Conhecimento

- Acesse **"Base de Conhecimento"** no menu
- Use os filtros para buscar por:
  - Tipo de conteúdo (texto, imagem, vídeo, prompt)
  - Canal específico
  - Período de tempo
  - Palavras-chave

### 6.2 Exportação

1. Acesse **"Exportar Dados"**
2. Selecione o formato (JSON ou CSV)
3. Aplique filtros se necessário
4. Clique em **"Exportar"**

---

## Solução de Problemas

### Erro: "Credenciais inválidas"
- Verifique se copiou o API ID e Hash corretamente
- O API ID deve conter apenas números
- O API Hash deve ter pelo menos 32 caracteres

### Erro: "Canal não encontrado"
- Verifique se o username está correto
- Certifique-se de que o canal é público
- Para canais privados, você precisa ser membro

### Erro: "Limite de requisições"
- O Telegram tem limites de rate
- Aguarde alguns minutos e tente novamente
- Reduza o número de mensagens por raspagem

---

## Suporte

Para dúvidas ou problemas:
- INEMA.vip: https://inema.vip
- Telegram: @RudsonOliveira

---

*Documentação gerada automaticamente pelo Manus AI*
*Autorizado por Rudson Oliveira*
