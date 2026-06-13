# CHANGELOG

> Append-only лог итераций. Новые записи — сверху. Каждая итерация (по протоколу
> самообновления в [Claude.md](Claude.md)) оставляет здесь запись: дата, что сделано,
> какие доки затронуты. Даты — МСК.

## 2026-06-13 — Фаза 1: модульная экстракция (native ESM)

`app/index.html` (монолит ~1873 строки) разнесён на нативные ES-модули и раздельный CSS.
Поведение и вид сохранены (чистый рефактор).

- **CSS** → `app/css/`: `tokens.css, base.css, components.css, app.css` + `kinds/{vocabulary,doc,roadmap,tasks,sport}.css`. Каждое правило перенесено без изменений; грузятся через `<link>`.
- **JS** → `app/js/`: `core/{state,vendor,conn,dav,config,md,theme,dates}`, `ui/{dom,modal,files}`, `kinds/*` (по рендереру на kind), `app.js`, `boot.js`, `pwa.js`, `main.js` (entry `<script type=module>`).
- Дубли дат консолидированы в `core/dates.js` (`tkStamp/nowStamp/spFmt*` → `stamp/stampMinute/fmtDate/...`); выход идентичен.
- Общее состояние — объект `state` в `core/state.js` (`conn/modules/activeId/activeArtifact`).
- Вендоры (`js-yaml`, `marked`) — классические глобалы, грузятся до module-скрипта.
- `index.html` → тонкий shell; `sw.js` — кэш `growth-v2` + обновлённый precache-список (стратегия пока прежняя).
- Dispatch по kind — статический в `app.js` (ленивый `import()` — Фаза 3).

Верификация: `node --check` все 24 модуля OK; граф импортов резолвится; локальный http-preview — экран входа рендерится, консоль без ошибок ESM, тема/CSS применяются.

Затронуто: `app/` (новые css/js, shell index.html, sw.js), `docs/architecture.md`, этот лог.

Дальше: Фаза 2 — дизайн-система (унификация компонентов, токены).

## 2026-06-13 — Фаза 0: каркас документации для AI

Заведена полная система документации (рефакторинг ещё не трогал код).

- Переписан `docs/Claude.md` → точка входа: обзор, **карта документации**, **протокол самообновления**.
- Создан `docs/architecture.md` — целевая ESM-архитектура + migration status по фазам.
- Создан `docs/design-system.md` — токены и каталог компонентов (инвентаризация из текущего CSS).
- Создан `docs/decisions/` — ADR на ключевые существующие решения (0001–0009) + `_TEMPLATE.md`.
- Создан `docs/specs/` — ТЗ по каждому `kind` (поведенческий контракт) + `_TEMPLATE.md`.
- Создан этот `CHANGELOG.md`.
- `docs/guides/*` и `docs/config.reference.md` — без изменений.

Затронуто: вся `docs/`. Кода не касались (`app/`, `worker/` без изменений).

Дальше: Фаза 1 — модульная экстракция кода в нативные ES-модули.
