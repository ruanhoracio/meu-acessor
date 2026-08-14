#!/usr/bin/env bash
# Copia as variáveis de ambiente de apps/web/.env.local para o projeto na Vercel
# e dispara um redeploy para que elas passem a valer em produção.
#
# Uso:  bash scripts/setup-vercel-env.sh
set -euo pipefail

PROJETO="meu-acessor-web"
ENV_FILE="apps/web/.env.local"
VARS=(TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_CHAT_ID DIRECT_URL NEXT_PUBLIC_APP_URL GROQ_API_KEY)

cd "$(dirname "$0")/.."

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Não encontrei $ENV_FILE"
  exit 1
fi

TOKEN=$(python3 - <<'PY'
import json, glob, os
caminhos = [
    os.path.expanduser("~/Library/Application Support/com.vercel.cli/auth.json"),
    os.path.expanduser("~/.local/share/com.vercel.cli/auth.json"),
]
for c in caminhos:
    if os.path.exists(c):
        print(json.load(open(c)).get("token", ""))
        break
PY
)

if [ -z "$TOKEN" ]; then
  echo "❌ Não achei sua sessão da Vercel. Rode 'npx vercel login' e tente de novo."
  exit 1
fi

echo "🔐 Configurando variáveis em $PROJETO..."
echo

for VAR in "${VARS[@]}"; do
  LINHA=$(grep "^${VAR}=" "$ENV_FILE" || true)
  if [ -z "$LINHA" ]; then
    echo "  ⏭️  $VAR — não está no .env.local, pulando"
    continue
  fi

  VALOR="${LINHA#*=}"
  VALOR="${VALOR%\"}"; VALOR="${VALOR#\"}"
  VALOR="${VALOR%\'}"; VALOR="${VALOR#\'}"

  # Remove a versão antiga, se existir, para poder regravar
  IDS=$(curl -s -H "Authorization: Bearer $TOKEN" \
    "https://api.vercel.com/v9/projects/${PROJETO}/env" |
    python3 -c "
import json,sys
d=json.load(sys.stdin)
for e in (d.get('envs') or []):
    if e['key']=='${VAR}': print(e['id'])
" 2>/dev/null || true)

  for ID in $IDS; do
    curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
      "https://api.vercel.com/v9/projects/${PROJETO}/env/${ID}" > /dev/null
  done

  RESP=$(VALOR="$VALOR" VAR="$VAR" python3 -c "
import json,os,sys
print(json.dumps({
  'key': os.environ['VAR'],
  'value': os.environ['VALOR'],
  'type': 'encrypted',
  'target': ['production','preview','development'],
}))
" | curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      --data @- "https://api.vercel.com/v10/projects/${PROJETO}/env")

  if echo "$RESP" | grep -q '"error"'; then
    echo "  ❌ $VAR — $(echo "$RESP" | python3 -c "import json,sys;print(json.load(sys.stdin)['error'].get('message',''))" 2>/dev/null)"
  else
    echo "  ✅ $VAR configurada"
  fi
done

echo
echo "🚀 Disparando redeploy para aplicar as variáveis..."
git commit --allow-empty -m "chore: redeploy para aplicar variaveis de ambiente" --quiet
git push origin main --quiet
echo "✅ Pronto! O build novo já sobe com as variáveis. Aguarde ~2 minutos."
