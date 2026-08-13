import type { Metadata, Viewport } from "next";
import { AppFrame } from "@/components/app-frame";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { getAppSession } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boxario",
  description: "Cajas, inventario y envíos para empresas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#152019",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAppSession();

  return (
    <html lang="es" className="h-full antialiased">
      <head>
        {process.env.NODE_ENV !== "production" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(() => {
                if (!("serviceWorker" in navigator)) return;
                const controllerUrl = navigator.serviceWorker.controller?.scriptURL;
                if (!controllerUrl || new URL(controllerUrl).pathname !== "/sw.js") return;
                if (location.pathname === "/dev-sw-cleanup") return;
                const target = new URL(location.href);
                location.replace("/dev-sw-cleanup?return=" + encodeURIComponent(target.pathname + target.search + target.hash));
              })();`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col lg:h-full lg:overflow-hidden">
        <ServiceWorkerRegister />
        <AppFrame session={session}>{children}</AppFrame>
      </body>
    </html>
  );
}
