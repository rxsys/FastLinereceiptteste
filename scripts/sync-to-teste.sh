#!/bin/bash
# Sincroniza src/ da versão de produção para a versão de teste
# Uso: ./scripts/sync-to-teste.sh

PROD="/Users/ricardoyukio/Desktop/Projetos/FastLinereceipt"
TESTE="/Users/ricardoyukio/Desktop/Projetos/FastLinereceipt/FastLinereceiptteste"

echo "🔄 Sincronizando src/ prod → teste..."
rsync -av --delete \
  --exclude "src/lib/firebase.ts" \
  "$PROD/src/" "$TESTE/src/"

echo "✅ Sync concluído. firebase.ts do teste preservado."
