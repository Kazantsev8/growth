# Growth

Личный трекер саморазвития. PWA на ванильном JS + Markdown-файлы на Mail.ru WebDAV через Cloudflare Worker (CORS-прокси). Подробности архитектуры — в [`docs/Claude.md`](docs/Claude.md).

## Структура

```
app/      — приложение (публикуется на growth-ao5.pages.dev)
worker/   — CORS-прокси Cloudflare Worker
docs/     — Claude.md (AI-хендоф) + guides/ (гайды направлений)
```

## Деплой приложения — автоматический

Cloudflare Pages привязан к этому репозиторию (output-директория `app/`, ветка `main`).
**Любой push в `main` сам публикует апп** на `https://growth-ao5.pages.dev`:

```
git add -A && git commit -m "..." && git push
```

Никаких ручных `wrangler pages deploy` и curl для кода.

## Деплой воркера — вручную (меняется редко)

```
cd worker && npx wrangler deploy
```

## Данные

Источник истины — файлы на Mail.ru WebDAV (`Obsidian Vault/...` и `GrowthApp/`), а не этот репозиторий. Правятся либо прямо в приложении (словарь, backlog), либо заливкой на WebDAV. Форматы артефактов — в `docs/guides/`.

## Хендоф в новый чат с Claude

1. Дай Claude прочитать `docs/Claude.md` (и, если репозиторий публичный, ссылку на него — Claude сможет склонировать код сам).
2. Для правок кода — `app/index.html`; для контекста — `docs/`.
3. По правилу из `docs/Claude.md`: при изменении состояния проекта обновляй `Claude.md` и гайды.
```
