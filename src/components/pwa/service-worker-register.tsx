"use client";

import { useEffect } from "react";
import {
  DEV_SERVICE_WORKER_RELOAD_FLAG,
  shouldRegisterServiceWorker,
  shouldReloadAfterDevelopmentCleanup,
  shouldReloadOnceAfterDevelopmentCleanup,
} from "@/lib/pwa/service-worker-policy";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (
      !shouldRegisterServiceWorker({
        nodeEnv: process.env.NODE_ENV,
        protocol: location.protocol,
        hostname: location.hostname,
      })
    ) {
      if (process.env.NODE_ENV !== "production") {
        void navigator.serviceWorker
          .getRegistrations()
          .then(async (registrations) => {
            const appRegistrations = registrations.filter((registration) => {
              const scriptUrl =
                registration.active?.scriptURL ||
                registration.waiting?.scriptURL ||
                registration.installing?.scriptURL;

              return scriptUrl ? new URL(scriptUrl).pathname === "/sw.js" : false;
            });
            const controllerUrl = navigator.serviceWorker.controller?.scriptURL;
            const hasAppController = controllerUrl
              ? new URL(controllerUrl).pathname === "/sw.js"
              : false;

            if (!shouldReloadAfterDevelopmentCleanup({
              registrationCount: appRegistrations.length,
              hasController: hasAppController,
            })) {
              sessionStorage.removeItem(DEV_SERVICE_WORKER_RELOAD_FLAG);
              return;
            }

            await Promise.all(appRegistrations.map((registration) => registration.unregister()));

            if ("caches" in window) {
              const cacheNames = await caches.keys();
              await Promise.all(
                cacheNames
                  .filter((name) => name.startsWith("boxario-static-"))
                  .map((name) => caches.delete(name)),
              );
            }

            const alreadyReloaded =
              sessionStorage.getItem(DEV_SERVICE_WORKER_RELOAD_FLAG) === "1";

            if (
              shouldReloadOnceAfterDevelopmentCleanup({
                hasController: hasAppController,
                alreadyReloaded,
              })
            ) {
              sessionStorage.setItem(DEV_SERVICE_WORKER_RELOAD_FLAG, "1");
              window.location.reload();
              return;
            }

            // Mientras el documento siga controlado por el worker anterior,
            // conserva la marca. En desarrollo React monta los efectos dos
            // veces; quitarla aqui habilitaba otra recarga en el segundo
            // montaje y dejaba el celular en un bucle sin tiempo para tocar.
            if (!hasAppController) {
              sessionStorage.removeItem(DEV_SERVICE_WORKER_RELOAD_FLAG);
            }
          })
          .catch(() => undefined);
      }

      return;
    }

    void navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  }, []);

  return null;
}
