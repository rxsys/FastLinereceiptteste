# Skill: User Journey — Registro ao Uso

## Fluxo Completo (NÃO ALTERAR sem validação)

### Passo 1: Registro (`page.tsx` → `handleRegister`)
- Campos: 会社名またはお名前, email, senha
- `createUserWithEmailAndPassword`
- Cria `users/{uid}`: `{ email, displayName, status: 'new', emailVerified: false, role: 'user', createdAt }`
- Envia email de verificação (não bloqueia acesso)
- **NÃO cria owner**
- **NÃO atribui ownerId**

### Passo 2: Login (`page.tsx` → `handleLogin`)
- `signInWithEmailAndPassword`
- `provider.tsx` → `onAuthStateChanged` carrega `users/{uid}`
- Se `ownerId` existe, carrega `owner/{ownerId}`
- Se `ownerId` não existe, `subscriptionStatus = 'none'`

### Passo 3: Clique no módulo (`page.tsx` → `handleModuleClick`)
- Sem login → abre modal de login
- Módulo gratuito → redireciona direto
- Módulo pago → verifica `owner/{ownerId || uid}/subscriptions/{moduleId}`
  - Se ativo → redireciona para o módulo
  - Se não → abre CheckoutPanel

### Passo 4: Checkout (`/api/stripe/checkout`)
- Recebe: `{ userId, ownerId (= ownerId || user.uid), email, priceId, moduleId }`
- Cria Stripe Checkout Session com metadata: `{ userId, ownerId, moduleId }`
- Redireciona para Stripe

### Passo 5: Webhook Stripe (`/api/stripe/webhook`)
**Evento `checkout.session.completed`:**
1. Lê metadata: `{ ownerId, userId, moduleId }`
2. Busca `users/{userId}` e `owner/{ownerId}` no RTDB
3. **CRIA/ATUALIZA `owner/{ownerId}`**: stripeCustomerId, subscriptionStatus='active', companyName, validUntil
4. **CRIA `owner/{ownerId}/subscriptions/{moduleId}`**: status='active', id=subscriptionId
5. **ATUALIZA `users/{userId}`**: status='active', role='manager', ownerId=ownerId
6. Vincula LINE API pool (se disponível)

**Evento `customer.subscription.updated`:**
- Atualiza `owner/{ownerId}`: subscriptionStatus (active/grace/expired), validUntil

**Evento `customer.subscription.deleted`:**
- Define `subscriptionStatus: 'expired'`

**Evento `invoice.payment_failed`:**
- Busca owner por stripeCustomerId
- Define `subscriptionStatus: 'grace'`, graceUntil (3 dias)

### Passo 6: Pós-compra
- Stripe redireciona para `/cost?checkout=success`
- Provider recarrega dados do user e owner
- Módulo acessível

## Regras Críticas

1. **owner SÓ é criado pelo webhook Stripe** — nunca no registro
2. **ownerId SÓ é atribuído pelo webhook** — nunca no registro
3. **role muda de 'user' para 'manager' no webhook** — após primeira compra
4. **Qualquer usuário pode comprar módulos** — com ou sem ownerId
5. **Webhook usa RTDB (rtdb)** — NÃO Firestore (db = null)
6. **db (Firestore) está desativado** em `lib/firebase.ts`: `export const db = null as any`
7. **Devs auto-detectados por email** em provider.tsx: rxsysjp@gmail.com, ricardoyukio@gmail.com

## Banco de Dados

- **RTDB** é o banco principal para todas operações
- Paths: `users/{uid}`, `owner/{ownerId}`, `owner/{ownerId}/subscriptions/{moduleId}`, `line_api_pool/{id}`, `webhook_events/{eventId}`
- `.indexOn` necessários: `owner.stripeCustomerId`, `line_api_pool.ownerId`, `line_api_pool.status`

## Checklist antes de alterar este fluxo

- [ ] O registro cria APENAS `users/{uid}`?
- [ ] O webhook cria owner e atribui ownerId?
- [ ] O webhook usa `rtdb`, não `db`?
- [ ] Qualquer usuário pode comprar módulos?
- [ ] Provider trata `ownerId = null` corretamente?
- [ ] Email de verificação não bloqueia acesso?
