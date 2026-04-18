#!/bin/bash
# Script para deploy sincronizado: Produção -> Teste

PROD="/Users/ricardoyukio/Desktop/Projetos/FastLinereceipt"
TESTE="$PROD/FastLinereceiptteste"

echo "🚀 Iniciando deploy sincronizado..."

# 1. Commitar e Push na Produção
echo "📦 [PROD] Adicionando mudanças..."
git add .
read -p "Digite a mensagem do commit: " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="update: synchronized deploy"
fi

git commit -m "$COMMIT_MSG"
echo "⬆️ [PROD] Fazendo push para produção..."
git push origin main

# 2. Sincronizar para a base de Teste
echo "🔄 Sincronizando arquivos Prod -> Teste..."
rsync -av --delete \
  --exclude ".git" \
  --exclude "FastLinereceiptteste" \
  --exclude "node_modules" \
  --exclude ".next" \
  --exclude ".env*" \
  "$PROD/" "$TESTE/"

# 3. Aplicar Patches de Ambiente de Teste
echo "🛠️ Aplicando patches específicos do ambiente de teste..."

# Ajustar porta no package.json do teste (9003)
sed -i '' 's/"dev": "next dev --turbopack -p 9002"/"dev": "next dev --turbopack -p 9003"/g' "$TESTE/package.json"

# Aplicar lógica de webhook forçado no teste (fastline1)
# (Opcional: descomente se quiser que o teste continue forçado)
# sed -i '' 's/const { ownerId: webhookId } = await params;/const { ownerId: webhookIdFromParams } = await params; const webhookId = "fastline1";/g' "$TESTE/src/app/api/line/webhook/[ownerId]/route.ts"

# 4. Commitar e Push no Teste
echo "📦 [TESTE] Adicionando mudanças no repositório de teste..."
cd "$TESTE"
git add .
git commit -m "sync: $COMMIT_MSG"
echo "⬆️ [TESTE] Fazendo push para base de testes..."
git push origin main

cd "$PROD"
# Atualizar referência do submódulo no pai
git add FastLinereceiptteste
git commit -m "chore: update test base reference"
git push origin main

echo "✅ Todos os ambientes foram atualizados e sincronizados!"
