import { NextResponse } from "next/server";

const cleanupPage = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Actualizando Boxario</title>
</head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#152019;color:#f8fafc;font-family:Arial,sans-serif">
  <p style="font-weight:800">Actualizando la aplicación…</p>
  <script>
    (async () => {
      const params = new URLSearchParams(location.search);
      const requestedReturn = params.get("return") || "/";
      const returnTo = requestedReturn.startsWith("/") && !requestedReturn.startsWith("//")
        ? requestedReturn
        : "/";
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations
          .filter((registration) => {
            const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL;
            return scriptUrl && new URL(scriptUrl).pathname === "/sw.js";
          })
          .map((registration) => registration.unregister()));
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names
            .filter((name) => name.startsWith("boxario-static-"))
            .map((name) => caches.delete(name)));
        }
      } finally {
        location.replace(returnTo);
      }
    })();
  <\/script>
</body>
</html>`;

export function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(cleanupPage, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
