# 0003 — Cloudflare Worker как CORS-прокси перед WebDAV

- **Статус:** принято
- **Дата:** 2026-06-07 (ретроспективно)

## Контекст
Браузер не может ходить в Mail.ru WebDAV напрямую (CORS). Нужен мост без бизнес-логики и без хранения пароля.

## Решение
Cloudflare Worker `growth-dav` форвардит запросы на `webdav.cloud.mail.ru`, добавляет CORS-заголовки.
Защита — заголовок `X-Proxy-Secret` (общий секрет, публичен — зашит в раздаваемый код). Пароль Mail.ru
проходит насквозь в `Authorization`, воркером не хранится. Проброшены методы
GET/HEAD/PUT/DELETE/PROPFIND/PROPPATCH/MKCOL/MOVE/COPY/OPTIONS и заголовки
Authorization/Content-Type/Depth/Destination/Overwrite/If/Lock-Token.

## Последствия
- (+) PWA работает с WebDAV; бинарный PUT (вложения) и MKCOL поддержаны.
- (−) Секрет публичен (только лёгкая защита от случайного чужого использования).
- Деплой воркера — вручную (`cd worker && npx wrangler deploy`), редко.
