// Growth — CORS-прокси перед Mail.ru WebDAV.
// Назначение: PWA не может ходить в WebDAV напрямую (CORS).
// Этот воркер форвардит запросы на webdav.cloud.mail.ru и добавляет CORS-заголовки.
// Бизнес-логики тут нет и быть не должно. Пароль НЕ хранится здесь —
// он приходит из приложения в заголовке Authorization и просто пробрасывается.

const WEBDAV_BASE = "https://webdav.cloud.mail.ru";

// Поменяй на свою случайную строку. Защищает воркер от использования чужими.
const SHARED_SECRET = "growth-7x9k2";

// Заголовки запроса, которые имеет смысл пробрасывать на WebDAV-сервер.
const FORWARD_REQUEST_HEADERS = [
  "Authorization",
  "Content-Type",
  "Depth",
  "Destination",
  "Overwrite",
  "If",
  "Lock-Token",
];

export default {
  async fetch(request) {
    // Префлайт CORS — отвечаем сразу, до всякой авторизации.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Простая защита от чужих: свой секрет в заголовке.
    if (request.headers.get("X-Proxy-Secret") !== SHARED_SECRET) {
      return new Response("Forbidden: bad or missing X-Proxy-Secret", {
        status: 403,
        headers: corsHeaders(request),
      });
    }

    const incoming = new URL(request.url);
    const target = WEBDAV_BASE + incoming.pathname + incoming.search;

    // Собираем заголовки для исходящего запроса.
    const outHeaders = new Headers();
    for (const name of FORWARD_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) outHeaders.set(name, value);
    }

    const methodHasBody = !["GET", "HEAD", "OPTIONS"].includes(request.method);

    const upstream = await fetch(target, {
      method: request.method,
      headers: outHeaders,
      body: methodHasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });

    // Возвращаем ответ как есть, добавив CORS-заголовки.
    const respHeaders = new Headers(upstream.headers);
    const cors = corsHeaders(request);
    for (const [k, v] of Object.entries(cors)) respHeaders.set(k, v);

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: respHeaders,
    });
  },
};

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods":
      "GET,HEAD,PUT,DELETE,PROPFIND,PROPPATCH,MKCOL,MOVE,COPY,OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization,Content-Type,Depth,Destination,Overwrite,If,Lock-Token,X-Proxy-Secret",
    // Браузеру по умолчанию не видны кастомные заголовки ответа —
    // явно открываем те, что нужны движку синка.
    "Access-Control-Expose-Headers": "ETag,Last-Modified,DAV,Content-Type,Content-Length",
    "Access-Control-Max-Age": "86400",
  };
}
