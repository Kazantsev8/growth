# Growth — проектный контекст для AI (точка входа)

> Это **первый файл**, который читает любая AI-сессия по проекту Growth.
> Здесь: обзор, карта документации (где что лежит) и **протокол самообновления**
> (что AI обязан актуализировать в конце каждой итерации).

---

## ⚠️ Протокол самообновления документации (ОБЯЗАТЕЛЬНО)

**В конце КАЖДОЙ итерации, до завершения работы, прогони этот чек-лист** и обнови
затронутое. Эти доки — источник истины для следующей сессии; устаревший документ
хуже отсутствующего.

1. Изменилась **архитектура кода** (модули, слои, dispatch, SW, перформанс) → [architecture.md](architecture.md).
2. Новые/изменённые **токены или компоненты** (цвета, отступы, .btn/.card/.chip/…) → [design-system.md](design-system.md).
3. Принято/изменено **проектное решение** («почему так») → новый или обновлённый ADR в [decisions/](decisions/) (см. `decisions/_TEMPLATE.md`, нумерация по порядку).
4. Изменилось **поведение фичи** (что делает kind/направление) → `specs/<kind>.md` (см. [specs/](specs/)).
5. Изменился **формат данных на диске / config.md** → нужный `guides/*` + [config.reference.md](config.reference.md).
6. **ВСЕГДА** — запись в [CHANGELOG.md](CHANGELOG.md) (дата, что сделано, какие доки тронуты).
7. Появился **новый тип документа** или поменялась сама система доков → обнови «Карту документации» ниже и **сам этот протокол**.

Протокол саморефлексивен: если структура доков эволюционирует — правь и его.

---

## Карта документации (где что искать)

| Нужно понять… | Файл |
|---|---|
| Обзор, инфраструктуру, протокол, навигацию | **этот файл** (`docs/Claude.md`) |
| Как устроен код: ESM-модули, слои, dispatch, состояние, SW, перформанс | [architecture.md](architecture.md) |
| Дизайн-токены и каталог UI-компонентов | [design-system.md](design-system.md) |
| Почему приняли то или иное решение (ADR) | [decisions/](decisions/) |
| Что должен делать конкретный `kind` (поведение/правила) | [specs/](specs/) |
| Как данные лежат на WebDAV (схемы файлов по направлениям) | [guides/](guides/) |
| Снимок текущего `config.md` | [config.reference.md](config.reference.md) |
| История итераций | [CHANGELOG.md](CHANGELOG.md) |

Разграничение, чтобы не дублировать: **specs/** = *что* фича делает (поведение);
**guides/** = *как* данные лежат на диске; **decisions/** = *почему* так;
**architecture.md** = как устроен *код*.

---

## Что это

Личный трекер саморазвития одного пользователя. N направлений (English, iOS, Android, Sport, Tasks, …). Каждое направление — контейнер «артефактов» (словарь, справочник, чеклист, backlog, трекер, …). Сверхцель — вернуть «продуктивное трение» в обучении; инструмент строит Claude, пользователь им пользуется.

## Инфраструктура (всё бесплатно, без бэкенда)

- **Клиент:** PWA на ванильном JS, **без сборки**. Хостинг — **Cloudflare Pages** (`https://growth-ao5.pages.dev`), ставится на iPhone как PWA. Архитектура кода — нативные ES-модули (см. [architecture.md](architecture.md)).
- **Хранилище (источник истины):** Markdown-файлы на **Mail.ru WebDAV** (`https://webdav.cloud.mail.ru`).
- **Мост:** **Cloudflare Worker** `growth-dav` (`https://growth-dav.vans-bleat.workers.dev`) — CORS-прокси перед Mail.ru, защищён `X-Proxy-Secret`. Бизнес-логики нет. ADR: [0003](decisions/0003-worker-cors-proxy.md).
- **Авторизация:** пароль приложения Mail.ru (Basic auth), вводится в аппе, хранится локально. URL воркера, секрет и логин зашиты в коде.
- **PWA:** `app/` содержит `manifest.json`, сервис-воркер `sw.js`, иконки; шрифты и библиотеки (`js-yaml`, `marked`) **вшиты локально** (внешних CDN нет). Стратегия кэша — в [architecture.md](architecture.md) / ADR [0009](decisions/0009-sw-strategy.md).

## Репозиторий, деплой и хендоф

- **Код — публичный git:** `https://github.com/Kazantsev8/growth`.
- **Деплой аппа автоматический:** push в `main` → CF Pages публикует `app/`. Ручной деплой не нужен.
- **Деплой воркера — вручную (редко):** `cd worker && npx wrangler deploy`.
- **Доставка данных (НЕ git):** `./sync-data.sh pull|push` синхронизирует файлы с Mail.ru (креды из `.env`). Манифест — `sync-manifest.txt`; локальное зеркало — `data/` (в .gitignore).
- **Перед коммитом:** проверь синтаксис JS — `node --check` по затронутым файлам (см. [architecture.md](architecture.md#проверка)).
- **Данные на Mail.ru AI из чата не видит** (нужны креды/UI). Для задач с данными — `sync-data.sh` или правка через UI аппа.

## Раскладка проекта (репозиторий)

```
app/        — публикуемый PWA (index.html-shell, css/, js/, sw.js, vendor/, fonts/, иконки)
worker/     — CORS-прокси (growth-dav-worker.js, wrangler.toml)
docs/       — эта документация
sync-data.sh, sync-manifest.txt, .env.example — канал данных
```
Раскладка кода `app/` — в [architecture.md](architecture.md). Раскладка данных на WebDAV — в [guides/](guides/) и `config.reference.md`.

## Модель config.md (кратко)

YAML-frontmatter со списком `modules`. Поля модуля: `id, title, icon, path, order, enabled`. Дальше: либо один артефакт (`kind` + опц. `file`), либо `artifacts: [...]` (каждый `{id, title, kind, file}`, путь = `<path>/<file>`). Подробно — ADR [0004](decisions/0004-config-modules-artifacts.md) и `config.reference.md`. Правится вручную; приложение только читает.

## Реализованные kind (ТЗ — в specs/)

vocabulary · doc · notes · checklist · roadmap · doclist · tasks · sport · (weekly-habit — легаси-заглушка). Поведение каждого — в [specs/](specs/); форматы данных — в [guides/](guides/).

## Синхронизация

Один пользователь. Источник истины — Mail.ru. Стратегия — **last-write-wins по `getlastmodified`** (`etag` Mail.ru НЕ доверять). Правка артефакта = перезапись файла целиком. ADR: [0002](decisions/0002-storage-webdav-lastwritewins.md).

## Конвенции

- Пути в WebDAV приложение URL-кодирует само; в `config.md` — по-человечески.
- `GrowthApp/` — служебная зона приложения; данные направлений — в `Obsidian Vault/`.
- Имена данных без префиксов `_`/`.` (на случай сторонних синкеров).
- Пароль Mail.ru — никогда не коммитить.

## Гайды по направлениям

[English](guides/English.md) · [iOS](guides/iOS.md) · [Sport](guides/Sport.md) · [Tasks](guides/Tasks.md) · (Android — появится при настройке).
