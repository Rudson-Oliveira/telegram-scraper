# 🚀 GUIA RÁPIDO: Copiar/Colar Primeira Automação em 5 Passos

## ⏱️ Tempo Total: 10 minutos

---

## PASSO 1: Baixar o Workflow (1 min)

1. Acesse o dashboard do Telegram Scraper
2. Vá em **Exportar Dados** → **Workflows N8N**
3. Clique em **Download** no workflow desejado
4. Salve o arquivo `.json` no seu computador

**Ou copie direto:**
```
📁 Arquivo: agente-secretaria-whatsapp.json
```

---

## PASSO 2: Importar no N8N (2 min)

1. Abra seu N8N (local ou cloud)
2. Clique em **Workflows** → **Import from File**
3. Selecione o arquivo `.json` baixado
4. Clique em **Import**

✅ O workflow aparecerá na sua lista!

---

## PASSO 3: Configurar Credenciais (3 min)

### 3.1 API do Claude (Anthropic)
1. Acesse: https://console.anthropic.com/
2. Copie sua API Key
3. No N8N: **Settings** → **Credentials** → **Add Credential**
4. Selecione **Anthropic API** → Cole a key

### 3.2 WhatsApp (Z-API ou Evolution)
1. Crie conta em: https://z-api.io ou https://evolution-api.com
2. Gere sua instância e token
3. Substitua no workflow:
   - `SUA_INSTANCIA` → seu ID
   - `SEU_TOKEN` → seu token

### 3.3 Google Sheets (opcional)
1. No N8N: **Credentials** → **Google Sheets API**
2. Conecte sua conta Google
3. Crie uma planilha "Atendimentos"
4. Copie o ID da URL e substitua `SEU_SHEET_ID`

---

## PASSO 4: Testar (2 min)

1. Clique em **Execute Workflow** (botão play)
2. Abra outra aba e envie um POST para o webhook:

```bash
curl -X POST https://seu-n8n.com/webhook/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{"body": {"from": "5535999999999", "type": "text", "text": "Olá, quero agendar uma consulta"}}'
```

3. Verifique se a resposta foi gerada corretamente

---

## PASSO 5: Ativar (2 min)

1. Clique em **Activate** (toggle no canto superior)
2. Copie a URL do webhook
3. Configure no seu provedor WhatsApp:
   - Z-API: Configurações → Webhook → Cole a URL
   - Evolution: Instance → Webhook → Cole a URL

🎉 **PRONTO! Sua secretária IA está funcionando!**

---

## 🆘 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Webhook não recebe | Verifique se o workflow está ATIVO |
| Claude não responde | Verifique a API Key e saldo |
| WhatsApp não envia | Verifique instância e token |
| Erro 401 | Credenciais inválidas |

---

## 📞 Suporte

- Dashboard: https://seu-sistema.manus.space
- API Docs: /api/v1/docs
- Telegram: @RudsonOliveira
