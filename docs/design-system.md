# Дизайн-система

> Токены и каталог UI-компонентов. Источник стилей — `app/css/` (целевая раскладка
> в [architecture.md](architecture.md)). До Фазы 2 стили живут в `<style>` внутри
> `app/index.html`; значения ниже зафиксированы оттуда.

## Темы

Две темы через `html[data-theme="light"|"dark"]`; переключение — `core/theme.js`
(сохранение в localStorage, дефолт по `prefers-color-scheme`). Все цвета — через CSS-переменные,
компоненты не используют хардкод-цвета (кроме предупреждающего красного в hover «удалить»
и палитры Sport).

### Цветовые токены (имена)

`--bg --ink --muted --faint --line --line-soft --accent --card --tab-bg --tab-active-bg --tab-active-fg --on-accent`

Тёмная тема (текущие значения):
```
--bg:#0c0a11; --ink:#e9e6f2; --muted:#9d96b0; --faint:#615b76;
--line:#2a2438; --line-soft:#221d2e; --accent:#a89cea; --card:#100d18;
--tab-bg:#15121e; --tab-active-bg:#a89cea; --tab-active-fg:#15101e; --on-accent:#15101e;
```
Светлая тема — те же имена в `[data-theme="light"]` (тёплая бумага: бежевый фон, тёмные чернила,
красно-кирпичный `--accent:#cf3a1a`). Точные значения — в `tokens.css` (Фаза 2) / текущем `index.html`.

### Прочие токены

- Шрифты: `--grotesk` (Hanken Grotesk, основной), `--mono` (JetBrains Mono). Вшиты локально в `fonts/`.
- Ширина: `--maxw` (≈680px) — контейнер `.wrap`.
- Шкалы отступов/радиусов/z-index — формализуются в `tokens.css` на Фазе 2 (сейчас значения инлайн).

## Палитра Sport

Отдельная яркая палитра для видов спорта (намеренно вне сиреневой темы), назначается по индексу вида:
```
#22d3ee #4ade80 #fb923c #f472b6 #facc15 #38bdf8 #fb7185 #a3e635 #2dd4bf #fdba74
```
Используется в хитмапе и бейджах Sport. См. [specs/sport.md](specs/sport.md).

## Каталог компонентов (целевые общие классы)

Цель Фазы 2 — свести дублирующиеся паттузы к общим классам в `components.css`:

| Компонент | Класс | Заменяет (сейчас) |
|---|---|---|
| Кнопка | `.btn` (+`.ghost`, `.sm`, danger-hover) | разрозненные `.btn`, `.addbtn`, `.hbtn`, `.tk-*`/`.sp-*` кнопки |
| Карточка | `.card` | `.card`, `.tk-card`, `.sp-prog` |
| Бейдж | `.badge` (+модификаторы) | `.tag`, `.tk-badge`, `.sp-badge` |
| Чип | `.chip` (+`.on`, `.add`) | `.tk-chip`, `.sp-chip` |
| Прогресс-бар | `.segbar`/`.seg` | `.segbar`, `.tk-bar`, `.sp-bar` |
| Табы | `.tabs`/`.tab` | `.tabs`, `.sp-tabs` |
| Саб-табы | `.subtabs`/`.subtab` | `.subtabs`, `.sp-tab`(внутр.) |
| Модалка | `.modal-ov`/`.modal`/`.modal-input` | как есть |
| Поля/формы | `.field`/`.formbtns`/`.search` | как есть + `.sp-frow`/`.tk-*` формы |
| Файловая строка | `.filelist`/`.frow` | как есть + `.sp-prog` |
| Пустое/ошибка/загрузка | `.empty`/`.note`/`.loading`/`.spin` | как есть |
| Кнопка «наверх» / pull-to-refresh | `.totop` / `.ptr` | как есть |

В `kinds/*.css` остаётся только реально специфичное: heatmap и столбики Sport, карточки словаря
(`.word/.tr/.ex`), сегмент-дерево roadmap.

## Правило

UX не меняется при рефакторинге: общие классы должны **точно воспроизводить** текущие стили.
Любое новое визуальное решение — через токены/компоненты здесь, с записью в [CHANGELOG.md](CHANGELOG.md).
