# 🤖 Tutorial: Agente Secretária WhatsApp em 30 Minutos

## 📋 Visão Geral

Este tutorial ensina como criar um agente de IA que funciona como secretária virtual do hospital via WhatsApp.

### O que o agente faz:
- ✅ Triagem inicial de pacientes (classifica urgência)
- ✅ Agendamento de consultas
- ✅ Responde dúvidas frequentes
- ✅ Escala para humano quando necessário
- ✅ Registra todos os atendimentos
- ✅ Alerta emergências em tempo real

### Requisitos:
- N8N (self-hosted ou cloud)
- API Key do Claude (Anthropic)
- Conta WhatsApp Business + API (Z-API, Evolution ou similar)
- Google Sheets (opcional, para registro)

---

## ⏱️ PARTE 1: Preparação (5 min)

### 1.1 Obter API Key do Claude

1. Acesse: https://console.anthropic.com/
2. Faça login ou crie conta
3. Vá em **API Keys** → **Create Key**
4. Copie e guarde a key (começa com `sk-ant-...`)

**Custo estimado:** ~$0.003 por atendimento (muito barato!)

### 1.2 Configurar WhatsApp API

**Opção A: Z-API (mais fácil)**
1. Acesse: https://z-api.io
2. Crie conta gratuita
3. Clique em **Criar Instância**
4. Escaneie o QR Code com seu WhatsApp
5. Copie: `Instance ID` e `Token`

**Opção B: Evolution API (self-hosted)**
1. Instale via Docker:
```bash
docker run -d --name evolution \
  -p 8080:8080 \
  atendai/evolution-api
```
2. Acesse: http://localhost:8080
3. Crie instância e escaneie QR Code

---

## ⏱️ PARTE 2: Importar Workflow (5 min)

### 2.1 Baixar o Workflow

O arquivo está em:
```
/n8n-workflows/agente-secretaria-whatsapp.json
```

### 2.2 Importar no N8N

1. Abra seu N8N
2. Menu → **Workflows** → **Import from File**
3. Selecione `agente-secretaria-whatsapp.json`
4. Clique **Import**

Você verá este fluxo:
```
[Webhook] → [Filtro] → [Claude IA] → [Processar] → [Emergência?]
                                                    ↓         ↓
                                              [Alerta]   [WhatsApp]
                                                              ↓
                                                        [Sheets]
```

---

## ⏱️ PARTE 3: Configurar Credenciais (10 min)

### 3.1 Configurar Claude (Anthropic)

1. No N8N, clique no nó **"Claude - Secretária IA"**
2. Em **Credentials**, clique **Create New**
3. Nome: `Anthropic API`
4. API Key: cole sua key `sk-ant-...`
5. Clique **Save**

### 3.2 Configurar WhatsApp

1. Clique no nó **"Enviar WhatsApp"**
2. Edite a URL:
```
https://api.z-api.io/instances/SEU_INSTANCE_ID/token/SEU_TOKEN/send-text
```
3. Substitua:
   - `SEU_INSTANCE_ID` → ID da sua instância
   - `SEU_TOKEN` → Token da sua instância

### 3.3 Configurar Slack (opcional)

1. Clique no nó **"Alerta Slack Emergência"**
2. Crie credential do Slack
3. Selecione o canal de alertas

### 3.4 Configurar Google Sheets (opcional)

1. Clique no nó **"Registrar Google Sheets"**
2. Crie credential do Google
3. Crie planilha com colunas:
   - Telefone | Resposta | Urgência | Intenção | Data/Hora
4. Copie o ID da planilha (da URL)
5. Substitua `SEU_SHEET_ID`

---

## ⏱️ PARTE 4: Personalizar o Agente (5 min)

### 4.1 Editar o Prompt do Agente

Clique no nó **"Claude - Secretária IA"** e edite o prompt:

```
Você é a secretária virtual do [NOME DO HOSPITAL].

INFORMAÇÕES DO HOSPITAL:
- Nome: [Hospital XYZ]
- Endereço: [Rua ABC, 123]
- Telefone: [35 3333-3333]
- Horário: [Seg-Sex 7h-19h, Sáb 7h-12h]
- Convênios: [Unimed, Bradesco, SulAmérica, Particular]

ESPECIALIDADES:
- Clínica Geral
- Pediatria
- Cardiologia
- Ortopedia
- [adicione as suas]

REGRAS:
1. Seja sempre empática e profissional
2. NUNCA forneça diagnósticos médicos
3. Em emergências, oriente: "Ligue 192 ou vá ao PS"
4. Se não souber, diga: "Vou transferir para um atendente"
```

### 4.2 Ajustar Classificação de Urgência

No nó **"Processar Resposta"**, você pode ajustar as palavras-chave:

```javascript
// Palavras que indicam EMERGÊNCIA
const emergencia = ['dor no peito', 'falta de ar', 'desmaio', 'sangramento'];

// Palavras que indicam URGENTE
const urgente = ['febre alta', 'dor forte', 'vômito', 'diarreia'];
```

---

## ⏱️ PARTE 5: Testar e Ativar (5 min)

### 5.1 Teste Manual

1. Clique em **Execute Workflow**
2. Envie uma requisição de teste:

```bash
curl -X POST https://seu-n8n.com/webhook/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "body": {
      "from": "5535999999999",
      "type": "text",
      "text": "Oi, estou com dor de cabeça há 3 dias"
    }
  }'
```

3. Verifique a resposta no N8N

### 5.2 Teste Real

1. Envie uma mensagem do seu WhatsApp para o número conectado
2. Aguarde a resposta do agente
3. Teste diferentes cenários:
   - "Quero agendar uma consulta"
   - "Qual o horário de funcionamento?"
   - "Estou com dor no peito" (deve alertar emergência)

### 5.3 Ativar em Produção

1. Clique no toggle **Activate** (canto superior direito)
2. Copie a URL do webhook
3. Configure no seu provedor WhatsApp:
   - Z-API: **Configurações** → **Webhook de Recebimento** → Cole URL
   - Evolution: **Instance** → **Webhook** → Cole URL

---

## 📊 Métricas e Monitoramento

### Dashboard de Atendimentos

Acesse sua planilha Google Sheets para ver:
- Total de atendimentos por dia
- Distribuição por urgência
- Intenções mais comuns
- Horários de pico

### Alertas de Emergência

Configure o Slack para receber alertas em tempo real quando:
- Paciente reportar sintomas graves
- Agente não conseguir responder
- Volume de atendimentos aumentar

---

## 🔧 Customizações Avançadas

### Adicionar Agendamento Real

Integre com seu sistema de agendamento:

```javascript
// Nó adicional: Verificar Disponibilidade
const disponibilidade = await $http.get('https://seu-sistema.com/api/agenda');
return disponibilidade.slots;
```

### Adicionar Consulta ao Prontuário

```javascript
// Nó adicional: Buscar Paciente
const paciente = await $http.get(`https://seu-sistema.com/api/pacientes?telefone=${telefone}`);
return paciente.data;
```

### Adicionar Multi-idioma

Modifique o prompt:
```
Detecte o idioma do paciente e responda no mesmo idioma.
Idiomas suportados: Português, Espanhol, Inglês.
```

---

## ✅ Checklist Final

- [ ] API Key do Claude configurada
- [ ] WhatsApp API conectada
- [ ] Prompt personalizado com dados do hospital
- [ ] Teste manual realizado
- [ ] Teste real com WhatsApp realizado
- [ ] Workflow ativado
- [ ] Webhook configurado no provedor
- [ ] Alertas de emergência funcionando
- [ ] Planilha de registro criada

---

## 🎉 Parabéns!

Sua secretária IA está funcionando 24/7!

**ROI Estimado:**
- Economia: R$ 3.000-5.000/mês (1 funcionário)
- Atendimento: 24h/dia, 7 dias/semana
- Capacidade: Ilimitada (múltiplos atendimentos simultâneos)

**Próximos passos:**
1. Monitorar atendimentos por 1 semana
2. Ajustar prompt baseado em feedbacks
3. Adicionar mais especialidades
4. Integrar com sistema de agendamento real
