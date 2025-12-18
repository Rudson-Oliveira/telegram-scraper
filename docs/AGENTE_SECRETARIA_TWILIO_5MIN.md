# Agente Secretária WhatsApp - Implementação em 5 Minutos

> **TEMPLATE - Substitua os placeholders pelas suas credenciais Twilio!**

---

## Suas Credenciais Twilio (PREENCHA COM SEUS DADOS)

```env
# Obtenha em https://console.twilio.com
TWILIO_ACCOUNT_SID=SEU_ACCOUNT_SID_AQUI
TWILIO_AUTH_TOKEN=SEU_AUTH_TOKEN_AQUI
TWILIO_PHONE_NUMBER=+55XXXXXXXXXXX
TWILIO_API_KEY=SEU_API_KEY_AQUI
TWILIO_API_SECRET=SEU_API_SECRET_AQUI
```

---

## PASSO 1: Importar Workflow no N8N (2 min)

### 1.1 Copie este JSON completo:

> **IMPORTANTE**: Substitua `SEU_ACCOUNT_SID_AQUI` pelo seu Account SID real do Twilio

```json
{
  "name": "Agente Secretária WhatsApp - Twilio",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp-twilio",
        "responseMode": "responseNode"
      },
      "name": "Webhook WhatsApp",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [{"value1": "={{$json.Body}}", "operation": "isNotEmpty"}]
        }
      },
      "name": "Tem Mensagem?",
      "type": "n8n-nodes-base.if",
      "position": [450, 300]
    },
    {
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": {
          "values": [
            {
              "role": "system",
              "content": "Você é a secretária virtual da sua empresa. Personalize esta mensagem com seus dados.\n\nFUNÇÕES:\n1. Triagem: pergunte sintomas, classifique urgência\n2. Agendamento: confirme data/hora\n3. Informações: horários, serviços\n4. Escalação: transfira para humano se necessário\n\nREGRAS:\n- Seja empático e profissional\n- NUNCA dê diagnósticos médicos\n- Emergências: oriente ligar 192"
            },
            {"role": "user", "content": "={{$json.Body}}"}
          ]
        }
      },
      "name": "Claude IA",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "position": [650, 200]
    },
    {
      "parameters": {
        "functionCode": "const resposta = $input.first().json.message.content;\nconst telefone = $('Webhook WhatsApp').first().json.From;\nreturn { resposta, twilioTo: telefone, timestamp: new Date().toISOString() };"
      },
      "name": "Processar",
      "type": "n8n-nodes-base.code",
      "position": [850, 200]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.twilio.com/2010-04-01/Accounts/SEU_ACCOUNT_SID_AQUI/Messages.json",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpBasicAuth",
        "sendBody": true,
        "contentType": "form-urlencoded",
        "bodyParameters": {
          "parameters": [
            {"name": "From", "value": "whatsapp:+55XXXXXXXXXXX"},
            {"name": "To", "value": "={{$json.twilioTo}}"},
            {"name": "Body", "value": "={{$json.resposta}}"}
          ]
        }
      },
      "name": "Enviar WhatsApp",
      "type": "n8n-nodes-base.httpRequest",
      "position": [1050, 200],
      "credentials": {"httpBasicAuth": {"id": "twilio", "name": "Twilio"}}
    },
    {
      "parameters": {"respondWith": "text", "responseBody": "OK"},
      "name": "Responder Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1250, 200]
    }
  ],
  "connections": {
    "Webhook WhatsApp": {"main": [[{"node": "Tem Mensagem?", "type": "main", "index": 0}]]},
    "Tem Mensagem?": {"main": [[{"node": "Claude IA", "type": "main", "index": 0}]]},
    "Claude IA": {"main": [[{"node": "Processar", "type": "main", "index": 0}]]},
    "Processar": {"main": [[{"node": "Enviar WhatsApp", "type": "main", "index": 0}]]},
    "Enviar WhatsApp": {"main": [[{"node": "Responder Webhook", "type": "main", "index": 0}]]}
  }
}
```

### 1.2 No N8N:
1. Clique em **"Import from JSON"**
2. Cole o JSON acima
3. Clique **"Import"**

---

## PASSO 2: Configurar Credenciais (2 min)

### 2.1 Criar credencial HTTP Basic Auth:
1. Vá em **Credentials** → **New**
2. Selecione **HTTP Basic Auth**
3. Nome: `Twilio`
4. Username: `SEU_ACCOUNT_SID_AQUI`
5. Password: `SEU_AUTH_TOKEN_AQUI`
6. Salvar

### 2.2 Criar credencial Anthropic:
1. Vá em **Credentials** → **New**
2. Selecione **Anthropic**
3. Cole sua API Key da Anthropic
4. Salvar

---

## PASSO 3: Configurar Webhook no Twilio (1 min)

1. Acesse: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Em **Sandbox Settings**, configure:
   - **When a message comes in**: `https://SEU_N8N.com/webhook/whatsapp-twilio`
   - Método: **POST**
3. Salvar

---

## PASSO 4: Testar! 🎉

1. Envie uma mensagem para seu número Twilio WhatsApp
2. O agente IA deve responder automaticamente!

---

## Solução de Problemas

| Problema | Solução |
|----------|---------|
| Webhook não recebe | Verifique URL no Twilio Console |
| Erro 401 | Credenciais Twilio incorretas |
| IA não responde | Verifique API Key Anthropic |
| Mensagem não enviada | Verifique número From/To |

---

## Checklist Final

- [ ] Workflow importado no N8N
- [ ] Credencial Twilio configurada (HTTP Basic Auth)
- [ ] Credencial Anthropic configurada
- [ ] Webhook configurado no Twilio Console
- [ ] Workflow ativado (botão verde)
- [ ] Teste realizado com sucesso

---

**Tempo total: ~5 minutos** ⏱️

**ROI Estimado: R$ 25.000/ano** 💰
