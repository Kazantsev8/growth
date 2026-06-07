# Гайд: направление iOS

> Документация по работе с направлением iOS. При изменении состава артефактов/формата роадмапа — обнови этот файл и `config.md` (триггер в `../Claude.md`).

## Назначение

Подготовка к уровню Senior+ по плану-роадмапу. Основа — большой роадмап с фазами и сессиями; к пройденным темам — конспекты.

## Расположение

Данные: `Obsidian Vault/Professional/iOS/` (папка переименована из `Swift`).
Запись в конфиге: модуль `ios` в `GrowthApp/config.md` (блок `artifacts`).

## Артефакты

| id | Заголовок | kind | Файл/папка |
|---|---|---|---|
| roadmap | Roadmap | roadmap | `iOS_Senior_Plus_Roadmap.md` |
| notes | Notes | doclist | вся папка iOS, кроме роадмапа (`exclude`) |

### roadmap → `iOS_Senior_Plus_Roadmap.md`

Структура файла:
- **frontmatter** с `progress` (sessions_completed / sessions_total / percent_complete, current_phase, current_milestone, next_session), список `phases`, входная оценка.
- **8 фаз**: `## Phase N — Name`, под каждой строка `**Sessions:** .. | **Done:** .. | **Status:** ..`.
- **майлстоуны**: `### Milestone X.Y — Name`, в каждом таблица статусов и чек-лист сессий.
- **сессии** (источник истины): `- [x] **X.Y.Z** \`S|M|L\` Title — описание. #tag #tag`.

Поведение в аппе: фазы сворачиваемые (текущая раскрыта), тап по чек-боксу отмечает сессию и пишет файл. Прогресс (общий %, по фазам) считается **вживую из чек-листа** — счётчики автора в шапке могут быть неточны, и приложение их выправляет при записи.

Что синхронизируется на запись: чек-бокс `[ ]↔[x]`, эмодзи в таблице (✅/⬜), frontmatter (sessions_completed, sessions_total, percent_complete, next_session, current_phase, current_milestone), per-phase `**Done:**`.

### notes → konспекты (doclist)

Список всех `.md` из папки iOS, кроме роадмапа (исключается через `exclude`). Тап открывает конспект на чтение (рендер markdown с рабочим оглавлением). Чтобы конспект появился — он должен лежать **на Mail.ru** в `Professional/iOS`, не только локально в Obsidian.

## Развитие

Новые конспекты — просто кладёшь `.md` в папку, появятся в Notes автоматически. Роадмап редактируется как обычный файл; при смене его структуры свериться с парсером (`parseRoadmap`/`setSession`/`syncRoadmapMeta` в `app/index.html`).
