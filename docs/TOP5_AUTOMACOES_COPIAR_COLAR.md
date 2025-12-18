# 🏆 TOP 5 AUTOMAÇÕES HOSPITALARES (Score ≥ 4)

> **Copie e cole direto no N8N ou Make!**

---

## 1️⃣ ANÁLISE DE CONTRATOS MÉDICOS COM IA

**Score:** ⭐⭐⭐⭐⭐ 5/5 | **ROI:** R$ 30.000/ano | **Tempo:** 1 mês

### Descrição
Sistema multi-agente que analisa contratos médicos automaticamente, extrai cláusulas críticas, identifica riscos e sugere alterações.

### Código N8N (Copiar/Colar)

```json
{
  "nodes": [
    {
      "name": "Upload Contrato",
      "type": "n8n-nodes-base.webhook",
      "parameters": {"path": "contrato", "httpMethod": "POST"}
    },
    {
      "name": "OCR Extração",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.ocr.space/parse/image",
        "method": "POST",
        "body": {"base64Image": "={{$json.file}}"}
      }
    },
    {
      "name": "Agente Extrator",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [{"role": "user", "content": "Extraia do contrato: partes, objeto, valor, prazo, cláusulas de rescisão, penalidades. Texto: {{$json.text}}"}]
      }
    },
    {
      "name": "Agente Analista",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [{"role": "user", "content": "Analise riscos jurídicos, cláusulas abusivas e conformidade com LGPD/CFM. Dados: {{$json.extracao}}"}]
      }
    },
    {
      "name": "Gerar PDF",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.pdfshift.io/v3/convert/pdf",
        "method": "POST",
        "body": {"source": "={{$json.relatorio}}"}
      }
    }
  ]
}
```

### Prompt do Agente Extrator
```
Você é um especialista em análise de contratos médicos.

EXTRAIA do contrato:
1. Partes envolvidas (nomes, CNPJs)
2. Objeto do contrato
3. Valor e forma de pagamento
4. Prazo de vigência
5. Cláusulas de rescisão
6. Multas e penalidades
7. Obrigações de cada parte
8. Cláusulas de confidencialidade

Retorne em JSON estruturado.
```

---

## 2️⃣ AGENTE VIRTUAL HOSPITALAR 24/7

**Score:** ⭐⭐⭐⭐⭐ 5/5 | **ROI:** R$ 25.000/ano | **Tempo:** 2 semanas

### Descrição
Chatbot que atende pacientes 24h via WhatsApp: triagem, agendamentos, dúvidas e escalação.

### Código N8N (Copiar/Colar)

```json
{
  "nodes": [
    {
      "name": "Webhook WhatsApp",
      "type": "n8n-nodes-base.webhook",
      "parameters": {"path": "whatsapp", "httpMethod": "POST"}
    },
    {
      "name": "Secretária IA",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [
          {"role": "system", "content": "Você é a secretária virtual do hospital. Faça triagem, agende consultas, responda dúvidas. NUNCA dê diagnósticos. Em emergências: oriente ligar 192."},
          {"role": "user", "content": "={{$json.body.text}}"}
        ]
      }
    },
    {
      "name": "Enviar Resposta",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.z-api.io/instances/{{$env.ZAPI_INSTANCE}}/token/{{$env.ZAPI_TOKEN}}/send-text",
        "method": "POST",
        "body": {"phone": "={{$json.body.from}}", "message": "={{$json.resposta}}"}
      }
    }
  ]
}
```

### Prompt da Secretária
```
Você é a secretária virtual do Hospital [NOME].

FUNÇÕES:
1. Triagem: pergunte sintomas, classifique urgência (verde/laranja/vermelho)
2. Agendamento: consulte disponibilidade, confirme data/hora
3. Informações: horários, endereço, convênios, documentos
4. Escalação: "Vou transferir para um atendente humano"

REGRAS:
- Seja empática e profissional
- NUNCA forneça diagnósticos
- Emergências: "Ligue 192 (SAMU) ou vá ao PS"
- Confirme informações importantes

DADOS DO HOSPITAL:
- Endereço: [SEU ENDEREÇO]
- Telefone: [SEU TELEFONE]
- Horário: Seg-Sex 7h-19h
- Convênios: Unimed, Bradesco, SulAmérica
```

---

## 3️⃣ INTEGRAÇÃO WHATSAPP + PRONTUÁRIO

**Score:** ⭐⭐⭐⭐⭐ 5/5 | **ROI:** R$ 20.000/ano | **Tempo:** 3 semanas

### Descrição
Consulta prontuário do paciente e responde automaticamente via WhatsApp com informações personalizadas.

### Código N8N (Copiar/Colar)

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {"path": "prontuario-whatsapp"}
    },
    {
      "name": "Buscar Paciente",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://seu-sistema.com/api/pacientes",
        "method": "GET",
        "qs": {"telefone": "={{$json.from}}"}
      }
    },
    {
      "name": "Buscar Prontuário",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://seu-sistema.com/api/prontuarios/{{$json.paciente_id}}",
        "method": "GET"
      }
    },
    {
      "name": "Gerar Resposta IA",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [
          {"role": "system", "content": "Você é assistente médico. Responda a dúvida do paciente baseado no prontuário. Seja claro e empático. NUNCA altere prescrições."},
          {"role": "user", "content": "Prontuário: {{$json.prontuario}}\n\nDúvida: {{$json.mensagem}}"}
        ]
      }
    }
  ]
}
```

---

## 4️⃣ TRIAGEM DE PACIENTES COM IA

**Score:** ⭐⭐⭐⭐⭐ 5/5 | **ROI:** R$ 15.000/ano | **Tempo:** 2 semanas

### Descrição
Sistema de triagem inicial que coleta sintomas, classifica urgência e direciona para especialidade correta.

### Código N8N (Copiar/Colar)

```json
{
  "nodes": [
    {
      "name": "Receber Sintomas",
      "type": "n8n-nodes-base.webhook",
      "parameters": {"path": "triagem"}
    },
    {
      "name": "Classificar Urgência",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [{"role": "user", "content": "Classifique a urgência (VERMELHO/LARANJA/AMARELO/VERDE/AZUL) baseado nos sintomas: {{$json.sintomas}}. Retorne JSON: {urgencia, especialidade, orientacao}"}],
        "options": {"response_format": {"type": "json_object"}}
      }
    },
    {
      "name": "Encaminhar",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": [
          {"value": "VERMELHO", "output": 0},
          {"value": "LARANJA", "output": 1},
          {"value": "default", "output": 2}
        ]
      }
    }
  ]
}
```

### Prompt de Triagem (Protocolo Manchester)
```
Você é um sistema de triagem hospitalar seguindo o Protocolo de Manchester.

CLASSIFIQUE a urgência baseado nos sintomas:

🔴 VERMELHO (Emergência): Risco de vida imediato
- Parada cardíaca, dificuldade respiratória grave, hemorragia intensa

🟠 LARANJA (Muito Urgente): Risco de vida
- Dor torácica, AVC, trauma grave

🟡 AMARELO (Urgente): Sem risco imediato
- Febre alta, dor moderada, vômitos persistentes

🟢 VERDE (Pouco Urgente): Pode aguardar
- Sintomas leves, consultas de rotina

🔵 AZUL (Não Urgente): Atendimento eletivo
- Renovação de receitas, exames de rotina

Retorne:
{
  "urgencia": "COR",
  "tempo_atendimento": "X minutos",
  "especialidade": "ESPECIALIDADE",
  "orientacao": "ORIENTAÇÃO AO PACIENTE"
}
```

---

## 5️⃣ AUTOMAÇÃO DE RELATÓRIOS DE OCUPAÇÃO

**Score:** ⭐⭐⭐⭐⭐ 5/5 | **ROI:** R$ 8.000/ano | **Tempo:** 1 semana

### Descrição
Gera relatórios diários de ocupação de leitos com previsão de demanda.

### Código N8N (Copiar/Colar)

```json
{
  "nodes": [
    {
      "name": "Agendamento Diário",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {"rule": {"interval": [{"field": "hours", "triggerAtHour": 7}]}}
    },
    {
      "name": "Consultar Ocupação",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://seu-sistema.com/api/leitos/ocupacao",
        "method": "GET"
      }
    },
    {
      "name": "Analisar com IA",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-3-5-sonnet-20241022",
        "messages": [{"role": "user", "content": "Analise a ocupação e gere previsão para próximos 7 dias: {{$json.dados}}"}]
      }
    },
    {
      "name": "Gerar PDF",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.pdfshift.io/v3/convert/pdf",
        "method": "POST"
      }
    },
    {
      "name": "Enviar Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "toEmail": "diretoria@hospital.com.br",
        "subject": "Relatório de Ocupação - {{$today}}",
        "attachments": "={{$json.pdf}}"
      }
    }
  ]
}
```

---

## 📋 RESUMO EXECUTIVO

| # | Automação | Score | ROI/Ano | Tempo | Prioridade |
|---|-----------|-------|---------|-------|------------|
| 1 | Análise de Contratos | 5/5 | R$ 30.000 | 1 mês | 🔥 ALTA |
| 2 | Agente Virtual 24/7 | 5/5 | R$ 25.000 | 2 sem | 🔥 ALTA |
| 3 | WhatsApp + Prontuário | 5/5 | R$ 20.000 | 3 sem | 🔥 ALTA |
| 4 | Triagem com IA | 5/5 | R$ 15.000 | 2 sem | 🔥 ALTA |
| 5 | Relatórios Ocupação | 5/5 | R$ 8.000 | 1 sem | ⚡ MÉDIA |

**ROI TOTAL POTENCIAL: R$ 98.000/ano**

---

## 🚀 PRÓXIMO PASSO

1. Escolha UMA automação para começar
2. Copie o código JSON
3. Importe no N8N
4. Configure as credenciais
5. Teste e ative!

**Recomendação:** Comece pelo **Agente Virtual 24/7** - maior impacto imediato!
