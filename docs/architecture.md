# Архитектура кода

> Как устроен код приложения `app/`. Связанные доки: [design-system.md](design-system.md),
> решения в [decisions/](decisions/), поведение фич в [specs/](specs/).

## Migration status

Рефакторинг монолита `app/index.html` в нативные ES-модули идёт поэтапно.

- **Фаза 0 — каркас документации** ✅.
- **Фаза 1 — модульная экстракция** ✅ (код вынесен в `app/js/**` и `app/css/**`, `index.html` — shell; поведение и вид сохранены; статические импорты).
- **Фаза 2 — дизайн-система** ✅ (консервативно: токен-слой `--bw`/`--r`/`--sp-*`, `--bw` адаптирован повсеместно; без изменения вида).
- **Фаза 3 — перформанс** ✅ (kind грузятся лениво через `import()` из `kinds/registry.js`; SW `growth-v3`: network-first для `*.js`/`*.css` + рантайм-кэш, cache-first для шрифтов/vendor/иконок).
- **Фаза 4 — финал доков** ✅ (доки сверены с кодом; протокол самообновления — рабочий).

**Рефакторинг завершён.** Дальше архитектура развивается итеративно; держи этот документ и систему доков
в актуальном состоянии по протоколу в [Claude.md](Claude.md).
Раскладка ниже — фактическая.

## Принцип: без сборки, нативные ES-модули

CF Pages раздаёт `app/` как статику. Код разбит на ES-модули, грузится через
`<script type="module" src="js/main.js">` и относительные `import`. Бандлера/минификации нет.
Проверка синтаксиса — `node --check`. ADR: [0001](decisions/0001-no-build-native-esm.md).

Вендоры (`js-yaml`, `marked`) подключены классическими `<script>` в `<head>` и используются
модулями как глобалы `window.jsyaml` / `window.marked` напрямую (так было и до рефактора).
`core/vendor.js` — тонкий ре-экспорт (`yaml`/`md`) на будущее (сейчас не подключён).
Классические скрипты в `<head>` выполняются до module-скриптов (модули — `defer`), поэтому
глобалы гарантированно готовы.

## Целевая раскладка `app/`

```
index.html              shell: <head> + <link> на css + вендоры + <script type=module main.js> + #root/#toTop/#ptr
css/                    см. design-system.md (tokens, base, components, app, kinds/*)
js/
  main.js               entry: тема, регистрация SW, init toTop+ptr, boot()
  core/
    state.js            общее состояние { conn, modules, activeId, activeArtifact }
    vendor.js           доступ к jsyaml/marked + parseFrontmatter/bodyOf/renderMarkdown
    conn.js             loadConn/saveConn/DEFAULTS/authHeader
    dav.js              WebDAV IO: encodePath/norm/dav/getText/putText/listDir/ensureDir/putBytes/davDelete
    config.js           loadConfig
    theme.js            loadTheme/applyTheme/curTheme/toggleTheme
    dates.js            единые дата/время: stamp/fmt/today/weekStart/addDays/fmtDate/parseDate/ruDate/monthAbbr
    md.js               frontmatter parse/serialize, общий парсер/сериализатор md-таблиц, slugify
  ui/
    dom.js              el/esc/setCount/fmtSize
    modal.js            showConfirm/showPrompt
    components.js       DOM-билдеры: segbar/badge/chip/fileRow/tabsBar/centerInScroller
    files.js            pickFiles + хелперы вложений
  app.js                viewApp/renderModule/renderArtifact/moduleArtifacts/artifactPath/appRefresh/viewSetup
  boot.js               boot()
  pwa.js                регистрация SW + toTop + pull-to-refresh
  kinds/
    registry.js         kind → { load: ()=>import(...), render: (mod,ctx)=>... } + loadFallback()
    vocabulary.js doc.js notes.js checklist.js roadmap.js doclist.js tasks.js sport.js fallback.js
sw.js                   service worker (см. ниже)
vendor/ fonts/ icons    как есть
```

## Слои и зависимости

- **core/** — без зависимостей от UI; чистые модули (IO, конфиг, состояние, дата, md, вендоры).
- **ui/** — мелкие переиспользуемые примитивы (DOM, модалки, компоненты, файлы); зависят от core по минимуму.
- **kinds/** — рендереры по `kind`; зависят от core + ui. Контракт: `export async function render(ctx)`,
  где `ctx = { path|base, host, artifact }`.
- **app.js** — навигация и dispatch; зависит от core + registry.
- Граф направленный (core ← ui ← kinds ← app ← main); циклов нет.

## Состояние

Общее изменяемое состояние — объект `state` в `core/state.js`
(`conn`, `modules`, `activeId`, `activeArtifact`). Модули импортируют `state` и мутируют поля.
Объект (а не экспорт `let`) — чтобы не ловить устаревшие импорты.

## Dispatch и ленивая загрузка

`viewApp` рисует табы направлений → `renderModule(m, host)` → для активного артефакта
`renderArtifact(m, a, host)`. Последний берёт загрузчик из `kinds/registry.js`, делает
`await loader()` (`import()`), вызывает `mod.render(ctx)`. Тяжёлые `tasks`/`sport` парсятся
только при открытии. **Добавить новый kind** = создать `js/kinds/<kind>.js` + строка в `registry.js`
(+ при необходимости `css/kinds/<kind>.css`).

## Service worker (`sw.js`)

- **install:** precache shell — `index.html`, все `css/*`, ядро `js/*`, вендоры, шрифты, иконки.
- **fetch:**
  - навигации/HTML → network-first (фолбэк на кэш);
  - same-origin `*.js`/`*.css` (вкл. ленивые kind-модули) → network-first + запись в рантайм-кэш;
  - шрифты/вендоры/иконки → cache-first (immutable);
  - не-GET → мимо SW.
- **версия:** `growth-vN`; **bump при изменении набора файлов** (правило в протоколе). Корректность
  не зависит от bump (онлайн всегда network-first), bump чистит старый кэш. ADR: [0009](decisions/0009-sw-strategy.md).

ESM не работает по `file://` (CORS) — локально проверять только по http (preview-сервер).

## Проверка

- **Синтаксис:** `node --check` по каждому изменённому `app/js/**/*.js`.
- **Локально:** http-сервер из `app/` → shell без WebDAV (setup, тема, toTop, pull-to-refresh), консоль без ошибок импортов.
- **Данные:** проверка на устройстве (креды/данные живут там). Учитывать кэш SW (bump/hard-reload).
