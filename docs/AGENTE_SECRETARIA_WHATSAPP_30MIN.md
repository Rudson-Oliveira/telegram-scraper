# Agente Secretária WhatsApp - Guia de Implementação (30min)

> **Autor:** Sistema Telegram Scraper - Hospitalar Saúde  
> **Versão:** 1.0  
> **Data:** Dezembro 2024  
> **ROI Estimado:** R$ 25.000/ano

---

## Visão Geral

Este guia ensina como criar um **agente de IA** que funciona como secretária virtual do hospital via WhatsApp. O agente:

- Faz triagem inicial de pacientes (classifica urgência)
- Agenda consultas automaticamente
- Responde dúvidas frequentes 24/7
- Escala para humano quando necessário
- Registra todos os atendimentos
- Alerta emergências em tempo real

**Tempo total de implementação:** 30 minutos

---

## Pré-requisitos

Antes de começar, você precisa ter:

1. **Conta N8N** (self-hosted ou cloud)
   - Site: https://n8n.io
   - Plano gratuito disponível

2. **API Key do Claude (Anthropic)**
   - Site: https://console.anthropic.com
   - Custo: ~$0.003 por atendimento

3. **Conta WhatsApp Business + API**
   - Opção 1: Z-API (https://z-api.io) - mais fácil
   - Opção 2: Evolution API (self-hosted)
   - Opção 3: Twilio (https://twilio.com)

4. **Google Sheets** (opcional, para registro)
   - Conta Google gratuita

---

## Passo 1: Obter API Key do Claude (5 min)

### 1.1 Criar conta na Anthropic

Acesse o console da Anthropic:

```
https://console.anthropic.com/
```

### 1.2 Criar API Key

1. Faça login ou crie uma conta
2. Vá em **API Keys** no menu lateral
3. Clique em **Create Key**
4. Dê um nome: `secretaria-hospital`
5. Copie a key gerada

A key tem este formato:

```
sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**IMPORTANTE:** Guarde esta key em local seguro. Ela não será mostrada novamente.

### 1.3 Adicionar créditos (se necessário)

- Acesse **Billing** no menu
- Adicione um cartão de crédito
- Recomendado: $10 para começar (dura ~3.000 atendimentos)

---

## Passo 2: Configurar WhatsApp API (10 min)

### Opção A: Z-API (Recomendado para iniciantes)

#### 2.1 Criar conta

```
https://z-api.io
```

1. Clique em **Criar Conta Grátis**
2. Preencha seus dados
3. Confirme o e-mail

#### 2.2 Criar instância

1. No painel, clique em **Criar Instância**
2. Escolha um nome: `hospital-secretaria`
3. Clique em **Criar**

#### 2.3 Conectar WhatsApp

1. Aparecerá um **QR Code**
2. Abra o WhatsApp no celular
3. Vá em **Configurações > Dispositivos Conectados**
4. Clique em **Conectar Dispositivo**
5. Escaneie o QR Code

#### 2.4 Copiar credenciais

Após conectar, copie:

- **Instance ID:** `XXXXXXXXXXXXXXXXXX`
- **Token:** `YYYYYYYYYYYYYYYYYYYY`

Sua URL de API será:

```
https://api.z-api.io/instances/INSTANCE_ID/token/TOKEN/send-text
```

### Opção B: Twilio

#### 2.1 Criar conta

```
https://www.twilio.com/try-twilio
```

#### 2.2 Ativar WhatsApp Sandbox

1. Vá em **Messaging > Try it out > Send a WhatsApp message**
2. Siga as instruções para conectar seu número

#### 2.3 Copiar credenciais

- **Account SID:** `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Auth Token:** `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **WhatsApp Number:** `+14155238886` (sandbox)

---

## Passo 3: Importar Workflow no N8N (5 min)

### 3.1 Baixar o arquivo JSON

Copie o conteúdo abaixo e salve como `agente-secretaria-whatsapp.json`:

```json
{
  "name": "Agente Secretária WhatsApp - Hospital",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-webhook",
        "responseMode": "responseNode"
      },
      "id": "webhook-1",
      "name": "Webhook WhatsApp",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.body.type}}",
              "operation": "equals",
              "value2": "text"
            }
          ]
        }
      },
      "id": "if-1",
      "name": "É Mensagem de Texto?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "Você é a secretária virtual do Hospital. Suas funções:\n\n1. TRIAGEM INICIAL:\n- Pergunte os sintomas do paciente\n- Classifique urgência: EMERGÊNCIA (vermelho), URGENTE (laranja), NORMAL (verde)\n- Se EMERGÊNCIA: oriente ir ao PS imediatamente\n\n2. AGENDAMENTO:\n- Consulte disponibilidade\n- Confirme data/hora com paciente\n- Envie confirmação\n\n3. INFORMAÇÕES:\n- Horários de funcionamento\n- Endereço e como chegar\n- Documentos necessários\n- Convênios aceitos\n\n4. ESCALAÇÃO:\n- Se não souber responder: \"Vou transferir para um atendente humano\"\n- Se emergência médica: \"Ligue 192 (SAMU) ou vá ao PS mais próximo\"\n\nSempre seja empático, profissional e objetivo.\nNUNCA forneça diagnósticos médicos.\nSempre confirme informações importantes."
            },
            {
              "role": "user",
              "content": "={{$json.body.text}}"
            }
          ]
        },
        "options": {
          "temperature": 0.7,
          "maxTokens": 500
        }
      },
      "id": "anthropic-1",
      "name": "Claude - Secretária IA",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "typeVersion": 1,
      "position": [650, 200]
    },
    {
      "parameters": {
        "functionCode": "const resposta = $input.first().json.message.content;\nconst telefone = $('Webhook WhatsApp').first().json.body.from;\n\nlet urgencia = 'NORMAL';\nif (resposta.includes('EMERGÊNCIA') || resposta.includes('192') || resposta.includes('SAMU')) {\n  urgencia = 'EMERGENCIA';\n} else if (resposta.includes('URGENTE') || resposta.includes('hoje')) {\n  urgencia = 'URGENTE';\n}\n\nlet intencao = 'INFORMACAO';\nif (resposta.includes('agend') || resposta.includes('marcar') || resposta.includes('consulta')) {\n  intencao = 'AGENDAMENTO';\n} else if (resposta.includes('transfer') || resposta.includes('humano')) {\n  intencao = 'ESCALACAO';\n}\n\nreturn {\n  telefone,\n  resposta,\n  urgencia,\n  intencao,\n  timestamp: new Date().toISOString()\n};"
      },
      "id": "code-1",
      "name": "Processar Resposta",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [850, 200]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.urgencia}}",
              "operation": "equals",
              "value2": "EMERGENCIA"
            }
          ]
        }
      },
      "id": "if-2",
      "name": "É Emergência?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1050, 200]
    },
    {
      "parameters": {
        "url": "https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text",
        "method": "POST",
        "body": {
          "phone": "={{$json.telefone}}",
          "message": "={{$json.resposta}}"
        }
      },
      "id": "http-1",
      "name": "Enviar WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [1250, 300]
    },
    {
      "parameters": {
        "channel": "#alertas-emergencia",
        "text": "🚨 *ALERTA DE EMERGÊNCIA*\n\nPaciente: {{$json.telefone}}\nHorário: {{$json.timestamp}}\n\nAção: Contato imediato necessário"
      },
      "id": "slack-1",
      "name": "Alerta Slack Emergência",
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2,
      "position": [1250, 100]
    },
    {
      "parameters": {
        "operation": "append",
        "documentId": "SEU_SHEET_ID",
        "sheetName": "Atendimentos",
        "columns": {
          "mappingMode": "defineBelow",
          "value": {
            "Telefone": "={{$json.telefone}}",
            "Resposta": "={{$json.resposta}}",
            "Urgência": "={{$json.urgencia}}",
            "Intenção": "={{$json.intencao}}",
            "Data/Hora": "={{$json.timestamp}}"
          }
        }
      },
      "id": "sheets-1",
      "name": "Registrar Google Sheets",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [1450, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={\"status\": \"success\", \"message\": \"Processado\"}"
      },
      "id": "respond-1",
      "name": "Responder Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [1650, 300]
    }
  ],
  "connections": {
    "Webhook WhatsApp": {
      "main": [[{"node": "É Mensagem de Texto?", "type": "main", "index": 0}]]
    },
    "É Mensagem de Texto?": {
      "main": [[{"node": "Claude - Secretária IA", "type": "main", "index": 0}]]
    },
    "Claude - Secretária IA": {
      "main": [[{"node": "Processar Resposta", "type": "main", "index": 0}]]
    },
    "Processar Resposta": {
      "main": [[{"node": "É Emergência?", "type": "main", "index": 0}]]
    },
    "É Emergência?": {
      "main": [
        [{"node": "Alerta Slack Emergência", "type": "main", "index": 0}, {"node": "Enviar WhatsApp", "type": "main", "index": 0}],
        [{"node": "Enviar WhatsApp", "type": "main", "index": 0}]
      ]
    },
    "Enviar WhatsApp": {
      "main": [[{"node": "Registrar Google Sheets", "type": "main", "index": 0}]]
    },
    "Registrar Google Sheets": {
      "main": [[{"node": "Responder Webhook", "type": "main", "index": 0}]]
    }
  },
  "settings": {"executionOrder": "v1"}
}
```

### 3.2 Importar no N8N

1. Abra seu N8N
2. Clique em **Workflows** no menu
3. Clique em **Import from File**
4. Selecione o arquivo `agente-secretaria-whatsapp.json`
5. Clique em **Import**

### 3.3 Configurar credenciais

#### Anthropic (Claude)

1. Clique no nó **"Claude - Secretária IA"**
2. Em **Credentials**, clique em **Create New**
3. Preencha:
   - **Name:** `Anthropic API`
   - **API Key:** Cole sua key `sk-ant-...`
4. Clique em **Save**

#### WhatsApp (Z-API)

1. Clique no nó **"Enviar WhatsApp"**
2. Edite a URL substituindo:

```
https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/send-text
```

Por:

```
https://api.z-api.io/instances/SEU_INSTANCE_ID_REAL/token/SEU_TOKEN_REAL/send-text
```

#### Google Sheets (opcional)

1. Clique no nó **"Registrar Google Sheets"**
2. Em **Credentials**, clique em **Create New**
3. Conecte sua conta Google
4. Crie uma planilha no Google Sheets com as colunas:
   - Telefone | Resposta | Urgência | Intenção | Data/Hora
5. Copie o ID da planilha (da URL)
6. Substitua `SEU_SHEET_ID` pelo ID real

---

## Passo 4: Personalizar o Prompt (5 min)

### 4.1 Editar informações do hospital

Clique no nó **"Claude - Secretária IA"** e edite o prompt do sistema:

```
Você é a secretária virtual do [NOME DO SEU HOSPITAL].

INFORMAÇÕES DO HOSPITAL:
- Nome: Hospital [SEU NOME]
- Endereço: [SEU ENDEREÇO COMPLETO]
- Telefone: [SEU TELEFONE]
- WhatsApp: [SEU WHATSAPP]
- Horário: Segunda a Sexta 7h-19h, Sábado 7h-12h
- Emergência: 24 horas

CONVÊNIOS ACEITOS:
- Unimed
- Bradesco Saúde
- SulAmérica
- Amil
- Particular

ESPECIALIDADES:
- Clínica Geral
- Pediatria
- Cardiologia
- Ortopedia
- Ginecologia
- [ADICIONE AS SUAS]

DOCUMENTOS NECESSÁRIOS:
- Documento com foto (RG ou CNH)
- Cartão do convênio
- Pedido médico (se exame)

REGRAS DE ATENDIMENTO:
1. Seja sempre empática e profissional
2. NUNCA forneça diagnósticos médicos
3. Em emergências, oriente: "Ligue 192 (SAMU) ou vá ao PS mais próximo"
4. Se não souber responder, diga: "Vou transferir para um atendente humano"
5. Sempre confirme informações importantes antes de finalizar

CLASSIFICAÇÃO DE URGÊNCIA:
🔴 EMERGÊNCIA: Dor no peito, falta de ar, desmaio, sangramento intenso
🟠 URGENTE: Febre alta, dor forte, vômitos persistentes
🟢 NORMAL: Consultas de rotina, dúvidas gerais
```

---

## Passo 5: Testar o Sistema (5 min)

### 5.1 Ativar o workflow

1. No N8N, clique no toggle **Activate** (canto superior direito)
2. O workflow ficará verde quando ativo

### 5.2 Copiar URL do webhook

1. Clique no nó **"Webhook WhatsApp"**
2. Copie a **Webhook URL**

Exemplo:

```
https://seu-n8n.com/webhook/whatsapp-webhook
```

### 5.3 Teste manual via terminal

Abra o terminal e execute:

```bash
curl -X POST https://seu-n8n.com/webhook/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "from": "5535999999999",
      "type": "text",
      "text": "Olá, quero agendar uma consulta de cardiologia"
    }
  }'
```

### 5.4 Verificar resposta

No N8N, vá em **Executions** para ver o resultado do teste.

### 5.5 Teste real via WhatsApp

1. Envie uma mensagem do seu WhatsApp para o número conectado
2. Aguarde a resposta do agente
3. Teste diferentes cenários:
   - "Quero agendar uma consulta"
   - "Qual o horário de funcionamento?"
   - "Estou com dor no peito" (deve alertar emergência)
   - "Vocês aceitam Unimed?"

---

## Passo 6: Configurar Webhook no WhatsApp (5 min)

### Para Z-API

1. Acesse o painel da Z-API
2. Vá em **Configurações** da sua instância
3. Em **Webhook de Recebimento**, cole a URL do N8N:

```
https://seu-n8n.com/webhook/whatsapp-webhook
```

4. Marque os eventos: **Mensagens Recebidas**
5. Clique em **Salvar**

### Para Twilio

1. Acesse o console do Twilio
2. Vá em **Messaging > Settings > WhatsApp Sandbox Settings**
3. Em **When a message comes in**, cole a URL do N8N
4. Selecione **HTTP POST**
5. Clique em **Save**

---

## Solução de Problemas

### Problema: Webhook não recebe mensagens

**Causa:** Workflow não está ativo

**Solução:**
1. Verifique se o toggle está verde (ativo)
2. Verifique se a URL do webhook está correta
3. Teste manualmente com curl

### Problema: Claude não responde

**Causa:** API Key inválida ou sem créditos

**Solução:**
1. Verifique se a API Key está correta
2. Acesse https://console.anthropic.com e verifique saldo
3. Adicione créditos se necessário

### Problema: WhatsApp não envia mensagem

**Causa:** Instância desconectada ou token inválido

**Solução:**
1. Verifique se o WhatsApp está conectado (QR Code)
2. Verifique Instance ID e Token
3. Teste a API diretamente:

```bash
curl -X POST "https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN/send-text" \
  -H "Content-Type: application/json" \
  -d '{"phone": "5535999999999", "message": "Teste"}'
```

### Problema: Erro 401 Unauthorized

**Causa:** Credenciais inválidas

**Solução:**
1. Regenere as credenciais no serviço
2. Atualize no N8N
3. Teste novamente

### Problema: Mensagens duplicadas

**Causa:** Webhook sendo chamado múltiplas vezes

**Solução:**
1. Verifique se há apenas um webhook configurado
2. Adicione deduplicação no código:

```javascript
// No nó "Processar Resposta"
const messageId = $json.body.messageId;
// Verificar se já processou este ID
```

---

## Métricas e Monitoramento

### Dashboard de Atendimentos

Acesse sua planilha Google Sheets para ver:

- Total de atendimentos por dia
- Distribuição por urgência (verde/laranja/vermelho)
- Intenções mais comuns (agendamento/informação/escalação)
- Horários de pico

### Alertas de Emergência

Configure o Slack/Discord para receber alertas quando:

- Paciente reportar sintomas graves
- Agente não conseguir responder
- Volume de atendimentos aumentar

### Custo Estimado

| Item | Custo Mensal |
|------|--------------|
| Claude API (~1000 atendimentos) | $3.00 |
| Z-API (plano básico) | R$ 49,90 |
| N8N Cloud (opcional) | $20.00 |
| **Total** | **~R$ 150/mês** |

### ROI Estimado

| Métrica | Valor |
|---------|-------|
| Economia com funcionário | R$ 2.500/mês |
| Atendimentos 24/7 | +40% capacidade |
| Redução tempo espera | -60% |
| **ROI Anual** | **R$ 25.000** |

---

## Próximos Passos

Após implementar o básico, você pode:

1. **Integrar com sistema de agendamento**
   - Conectar com Google Calendar
   - Verificar disponibilidade em tempo real

2. **Adicionar consulta ao prontuário**
   - Integrar com sistema do hospital
   - Responder com informações personalizadas

3. **Implementar multi-idioma**
   - Detectar idioma do paciente
   - Responder em português, espanhol ou inglês

4. **Adicionar análise de sentimento**
   - Detectar pacientes frustrados
   - Escalar automaticamente para humano

---

## Checklist Final

Antes de colocar em produção, verifique:

- [ ] API Key do Claude configurada e com créditos
- [ ] WhatsApp conectado e funcionando
- [ ] Prompt personalizado com dados do hospital
- [ ] Teste manual realizado com sucesso
- [ ] Teste real via WhatsApp realizado
- [ ] Workflow ativado (toggle verde)
- [ ] Webhook configurado no provedor WhatsApp
- [ ] Planilha de registro criada (opcional)
- [ ] Alertas de emergência configurados (opcional)

---

## Suporte

Se precisar de ajuda:

- **Documentação N8N:** https://docs.n8n.io
- **Documentação Anthropic:** https://docs.anthropic.com
- **Documentação Z-API:** https://developer.z-api.io

---

**Parabéns!** Sua secretária IA está pronta para funcionar 24/7!

*Documento gerado pelo Sistema Telegram Scraper - Hospitalar Saúde*
