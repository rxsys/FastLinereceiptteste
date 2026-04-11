# FastLinereceipt — Instruções para Claude Code

## Stack
- Next.js 14 (App Router) + TypeScript
- Firebase Firestore + Admin SDK
- LINE Messaging API (webhook em `/api/line/webhook/[ownerId]/route.ts`)
- Genkit AI (Gemini) para extração de despesas
- Stripe para pagamentos

## Regras de resposta (economizar tokens)
- Respostas curtas e diretas — sem introdução, sem resumo ao final
- Não repetir o que o usuário disse
- Não adicionar comentários, docstrings ou type annotations em código não modificado
- Não criar novos arquivos sem necessidade
- Não refatorar código além do que foi pedido
- Não adicionar tratamento de erro para casos impossíveis
- Confirmar comandos bash automaticamente quando possível
- **PROIBIDO** alterar qualquer parte do Portal do Desenvolvedor (`src/app/developer` e componentes relacionados) sem ordem direta e específica.

## Fluxo de trabalho
- Ler o arquivo antes de editar
- Preferir Edit sobre Write para arquivos existentes
- Commit e push após cada tarefa concluída

## Firestore
- Regras são deployadas via: `firebase deploy --only firestore:rules --project studio-3353968200-c57b0`
- Editar o arquivo `firestore.rules` **não** aplica as regras automaticamente

## Coleções principais
- `expenses` — despesas enviadas via LINE
- `lineuser` — usuários LINE registrados por convite (com `ownerId`, `status`, `projectIds`)
- `lineUsers` — perfil LINE (displayName, partnerId, projectId)
- `line_api_pool` — credenciais LINE por empresa (`ownerId`, `lineBasicId`, `lineChannelSecret`, `lineChannelAccessToken`)
- `invites` — convites de hash 8 chars hex (acesso só via Admin SDK)
- `owner` — perfil da empresa
- `users` — perfil do usuário autenticado (`role`: developer/manager/user, `ownerId`)

## Roles
- `developer` — acesso total (emails: rxsysjp@gmail.com, ricardoyukio@gmail.com)
- `manager` — acesso ao próprio `ownerId`
- `user` — acesso limitado

## Compact instructions
Ao compactar, focar em: arquivos modificados, erros encontrados e decisões técnicas tomadas.
