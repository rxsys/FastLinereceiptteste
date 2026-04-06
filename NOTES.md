# FastLinereceipt — Notas Técnicas e Recomendações

## Verificação de Duplicidade de Recibos

### Como funciona
Toda vez que um recibo é enviado via LINE bot, a função `findDuplicateExpense` (`src/app/api/line/webhook/[ownerId]/route.ts`) é executada **antes** de salvar o registro.

A função compara:
- **Valor exato** (`amount`)
- **Data do recibo** (tolerância de ±1 dia para fusos horários)
- **Similaridade de descrição** (primeiros 6 caracteres normalizados)

Se detectada duplicidade:
- O recibo é salvo com `status: 'duplicate_pending'` e `duplicateFlag: true`
- O usuário LINE recebe um Flex Message com opções: **Cancelar** ou **Manter ambos para análise**
- O dashboard exibe badge ⚠️ 重複要確認 na linha

### Detecção client-side no dashboard
Além da detecção no webhook, o dashboard realiza uma verificação client-side (`clientDuplicateIds`) comparando todos os recibos filtrados. Isso captura duplicatas que possam ter escapado da detecção server-side (dados históricos, migração, etc.).

### Índices RTDB necessários
O arquivo `database.rules.json` deve conter índice em `expenses` para performance:
```json
"expenses": {
  ".indexOn": ["date", "amount", "userId", "status"]
}
```
Deploy: `firebase deploy --only database --project studio-3353968200-c57b0`

### Recomendações de manutenção
1. **Monitorar regularmente** a aba 収支・明細 filtrando por badge ⚠️ 重複要確認
2. **Ao identificar duplicata**: abrir o dialog de edição e definir status ❌ 否認 no recibo duplicado — ele será excluído automaticamente dos totais
3. **Testar mensalmente** enviando o mesmo recibo duas vezes via LINE para verificar se o alerta é disparado
4. A função `findDuplicateExpense` usa fallback de `limitToLast(500)` se o índice `amount` não estiver disponível — garantir que o índice esteja sempre deployado

---

## Status de Recibos (reviewStatus)

| Status | Label | Comportamento |
|--------|-------|---------------|
| `reviewing` | 🔍 審査中 | Padrão. Contabilizado nos totais. |
| `approved` | ✅ 受取済み | Aceito. Contabilizado nos totais. |
| `rejected` | ❌ 否認 | **Não contabilizado** nos totais. Badge "集計対象外" aparece na lista. |

Ao alterar o status no dashboard → o usuário LINE recebe notificação automática via pushMessage.

---

## Firebase Storage

Regras deployadas em `storage.rules`. Paths permitidos:
- `owners/{ownerId}/expenses/**` — recibos via LINE
- `owners/{ownerId}/wallet/{userId}/**` — anexos da carteira
- `owners/{ownerId}/avatars/**` — avatares

Deploy: `firebase deploy --only storage --project studio-3353968200-c57b0`
