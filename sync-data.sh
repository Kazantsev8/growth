#!/usr/bin/env bash
# Growth — синхронизация данных с Mail.ru WebDAV.
# Источник истины — Mail.ru. data/ — локальное зеркало (в .gitignore). Креды — из .env (в .gitignore).
#
# Использование:
#   ./sync-data.sh pull            скачать все файлы из sync-manifest.txt в data/
#   ./sync-data.sh push            залить все файлы из манифеста на Mail.ru
#   ./sync-data.sh pull "<путь>"   один файл (путь от корня WebDAV, как в манифесте)
#   ./sync-data.sh push "<путь>"   например: ./sync-data.sh push "Obsidian Vault/Professional/iOS/MyNote.md"
cd "$(dirname "$0")"

if [ ! -f .env ]; then echo "Нет .env — скопируй .env.example в .env и впиши пароль приложения Mail.ru."; exit 1; fi
set -a; . ./.env; set +a
: "${MAILRU_USER:?MAILRU_USER не задан в .env}"
: "${MAILRU_PASS:?MAILRU_PASS не задан в .env}"
BASE="${WEBDAV_BASE:-https://webdav.cloud.mail.ru}"
MANIFEST="sync-manifest.txt"

enc(){ printf '%s' "${1// /%20}"; }   # пробелы → %20; кириллица уходит как UTF-8

mkcol_chain(){
  local dir; dir="$(dirname "$1")"; [ "$dir" = "." ] && return 0
  local acc="" IFS=/
  for part in $dir; do
    acc="${acc:+$acc/}$part"
    curl -fsS -u "$MAILRU_USER:$MAILRU_PASS" -X MKCOL "$BASE/$(enc "$acc")/" -o /dev/null 2>/dev/null || true
  done
}

pull_one(){
  mkdir -p "data/$(dirname "$1")"
  if curl -fsS -u "$MAILRU_USER:$MAILRU_PASS" "$BASE/$(enc "$1")" -o "data/$1"; then echo "  ↓ $1"
  else echo "  ! не скачан (нет на сервере?): $1"; fi
}
push_one(){
  if [ ! -f "data/$1" ]; then echo "  · пропуск (нет локально): data/$1"; return 0; fi
  mkcol_chain "$1"
  if curl -fsS -u "$MAILRU_USER:$MAILRU_PASS" -T "data/$1" "$BASE/$(enc "$1")" -o /dev/null; then echo "  ↑ $1"
  else echo "  ! ошибка заливки: $1"; fi
}

cmd="${1:-}"; target="${2:-}"
items(){ grep -vE '^[[:space:]]*(#|$)' "$MANIFEST"; }
case "$cmd" in
  pull) if [ -n "$target" ]; then pull_one "$target"; else items | while IFS= read -r r; do pull_one "$r"; done; fi ;;
  push) if [ -n "$target" ]; then push_one "$target"; else items | while IFS= read -r r; do push_one "$r"; done; fi ;;
  *) echo "Использование: ./sync-data.sh {pull|push} [\"путь от корня WebDAV\"]"; exit 1 ;;
esac
echo "готово"
