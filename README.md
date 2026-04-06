# FastLine — Sistema de Gestão de Despesas via LINE + AI

**Desenvolvido por Ricardo Yukio**

Sistema multi-tenant de automação contábil com IA conversacional. Usuários enviam recibos via LINE e a IA extrai os dados, classifica e consolida no dashboard administrativo.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind + ShadCN |
| Backend | Next.js API Routes (serverless) |
| Database | Firebase Realtime Database (RTDB) |
| Auth | Firebase Authentication |
| Messaging | LINE Messaging API v9 |
| AI | Google Gemini (gemini-2.5-flash → 2.0-flash → 2.0-flash-lite) |
| Deploy | Firebase App Hosting (auto-deploy via GitHub push) |

---

## Arquitetura de IA — Motor Principal

O motor da aplicação é o arquivo `src/ai/line-ai-manager.ts`. Toda interação do usuário LINE passa por ele.

### Fluxo de processamento de mensagem

```
Usuário envia texto
        ↓
detectIntent(text)           ← zero tokens, regex local
        ↓
┌── intent fixo? ──────────────────────────────────────────┐
│  report / costcenter / balance / help → resposta direta  │
│  invite / pending / approve → elevated only              │
│  set_lang / set_instructions / view_settings → self-cfg  │
└──────────────────────────────────────────────────────────┘
        ↓ unknown
loadMemory() + loadBehavior()
        ↓
buildPrompt(systemPrompt + userContext + history)
        ↓
callGemini()                 ← fallback: 2.5→2.0→2.0-lite
        ↓
saveMemory()
        ↓
resposta ao usuário
```

### Como adicionar uma nova funcionalidade

1. Adicionar keyword ao `detectIntent()` em `line-ai-manager.ts`
2. Criar handler `async function handleXxx(...): Promise<string>`
3. Adicionar entrada no objeto `I18N` com `ja / pt / en`
4. Chamar o handler no `handleLineTextMessage()` com verificação de `autonomyLevel` se necessário

```typescript
// 1. Intent
const someMatch = t.match(/nova funcionalidade|new feature/i);
if (someMatch) return { intent: 'new_feature', arg: someMatch[1] };

// 2. Handler
async function handleNewFeature(ctx, arg, lang): Promise<string> { ... }

// 3. I18N
newFeature: {
  ja: (arg: string) => `結果: ${arg}`,
  pt: (arg: string) => `Resultado: ${arg}`,
  en: (arg: string) => `Result: ${arg}`,
}

// 4. Chamar
if (intent === 'new_feature') return { text: await handleNewFeature(ctx, arg, lang) };
```

---

## Configuração da IA

### Nível empresa (dashboard → Configurações → AI)

```
owner/{ownerId}/aiConfig/
  lineAiEnabled: boolean
  dashboardAiEnabled: boolean
  systemPrompt: string          ← personalidade base da empresa
```

### Nível usuário (dashboard → Usuários → editar usuário)

```
owner_data/{ownerId}/lineUsers/{userId}/aiContext/
  behavior/
    autonomyLevel: 'standard' | 'elevated' | 'developer'
    customInstructions: string  ← substitui systemPrompt da empresa
    preferredLang: 'auto' | 'ja' | 'pt' | 'en'
    notes: string               ← memo do admin, IA usa como contexto
  preferences/
    lastPaymentType: 'company' | 'reimbursement'
    favoriteCcId: string
    interactionCount: number
  history: [{ role, text, ts }]
  summary: string               ← resumo comprimido pelo Gemini
```

### Hierarquia do systemPrompt

```
1. behavior.customInstructions  → vence tudo (por usuário)
2. aiConfig.systemPrompt        → configuração da empresa
3. defaultPrompt                → fallback do sistema
```

### Prompt padrão do sistema (fallback)

```
You are FastLine AI Assistant — smart, friendly, creative.
- Reply in the same language the user writes in
- Expense questions → professional
- General questions → natural and creative
- Adapt response length to the question
```

---

## Comandos LINE por nível de acesso

### Todos os usuários (status 2)

| Comando | Resultado |
|---|---|
| `レポート` / `relatório` / `report` | Resumo mensal do próprio usuário |
| `センター` / `centro` / `center` | Lista de CCs atribuídos |
| `残高` / `saldo` / `budget` | Saldo orçamentário por CC |
| `ヘルプ` / `help` / `ajuda` | Menu de comandos |
| `言語: 日本語` / `idioma: português` | Fixa idioma das respostas |
| `minhas instruções: ...` | Define personalidade da IA para si |
| `設定確認` / `minhas configurações` | Mostra configurações atuais |
| 📸 Foto de recibo | Extração automática + seleção de CC |

### Usuários elevados (`autonomyLevel: elevated`)

| Comando | Resultado |
|---|---|
| `招待コード: [nome]` / `convite: [nome]` | Gera hash de convite + salva no RTDB |
| `承認待ち` / `pendentes` | Lista usuários aguardando aprovação |
| `承認: [nome]` / `aprovar: [nome]` | Aprova usuário |
| `全社レポート` / `relatório geral` | Relatório de toda a empresa |

---

## Estrutura RTDB

```
owner/
  {ownerId}/
    aiConfig/
      lineAiEnabled, dashboardAiEnabled, systemPrompt

owner_data/
  {ownerId}/
    lineUsers/{userId}/
      status (0=novo, 1=pendente, 2=ativo)
      aiContext/behavior, preferences, history, summary
    expenses/{expenseId}/
      type, amount, description, date, category
      costcenterId, costcenterName, projectId
      imageUrl, registrationNumber, ntaStatus
      paymentType, status, senderName, userId
    projects/{projectId}/
      costcenters/{ccId}/
        assignedLineUserIds[]
    invites/{inviteId}/
      hash, inviteName, used, createdBy

line_api_pool/
  {key}/
    ownerId, lineBasicId, lineChannelAccessToken, lineChannelSecret

ai_usage_global/{YYYY-MM}/
  input, output, total, requests

owner_data/{ownerId}/
  ai_usage/{YYYY-MM}/
    input, output, total, requests
```

---

## Webhook LINE

**Endpoint:** `POST /api/line/webhook/{webhookId}`

O `webhookId` mapeia para `ownerId` via `getOwnerCredentials()`.

### Fluxo de eventos

```
follow     → mensagem de boas-vindas (welcomeMessage ou padrão)
message    → roteamento por status do usuário:
  status 0/1 → instrução de hash / aguardando aprovação
  status 2   → imagem → processExpense()
             → texto  → handleLineTextMessage() ou processExpense()
postback   → setcc / setpayment / cancel
```

---

## Validação NTA (インボイス制度)

O AI extrai `registrationNumber` (T + 13 dígitos) do recibo.
Se encontrado, `processExpenseNtaCheck()` valida na API da NTA em background.

```
src/lib/nta-service.ts → validateRegistrationNumber()
API: https://web-api.invoice-kohyo.nta.go.jp/1/num
```

Resultado salvo em `expenses/{id}/ntaStatus`: `verified | not_found | failed`

---

## Deploy

Push para `main` → Firebase App Hosting detecta → build automático (~3-5 min).

```bash
git add . && git commit -m "..." && git push
```

---

© FastLine — Ricardo Yukio
