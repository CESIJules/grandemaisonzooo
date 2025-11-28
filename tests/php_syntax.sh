#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="var/www/html"

echo "🔎 Vérification de la syntaxe PHP dans $BASE_DIR..."

errors=0

while IFS= read -r -d '' file; do
  echo "→ php -l $file"
  if ! php -l "$file" > /dev/null; then
    echo "❌ Erreur de syntaxe dans: $file"
    errors=$((errors+1))
  fi
done < <(find "$BASE_DIR" -type f -name '*.php' -print0)

if [ "$errors" -ne 0 ]; then
  echo "❌ $errors fichier(s) PHP ont des erreurs de syntaxe."
  exit 1
fi

echo "✅ Syntaxe PHP OK."
