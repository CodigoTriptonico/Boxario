import { expect, test } from "@playwright/test";

const USER_ROUTES = [
  "/",
  "/venta",
  "/seguimiento",
  "/seguimiento/excepciones",
  "/seguimiento/historial",
  "/auditoria",
  "/bodega",
  "/inventario",
  "/ingreso-bodega",
  "/paletas",
  "/logistica",
  "/logistica/conductores",
  "/logistica/vehiculos",
  "/contabilidad",
  "/estadisticas",
  "/reloj",
  "/time-clock",
  "/configuracion",
  "/perfil",
  "/vendedores",
  "/agencia",
  "/agencia/cierre",
  "/agencia/equipo",
  "/agencia/precios",
  "/agencias",
  "/captacion",
  "/distribuidor",
  "/distribuidores",
  "/mis-distribuidores",
  "/solicitudes",
  "/conductor/tareas",
  "/conductor/inventario-camion",
  "/ui/calendario",
  "/rastrear",
];

async function signIn(page, testInfo) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(process.env.LOCAL_TEST_USER_EMAIL);
  await page.locator('input[name="password"]').fill(process.env.LOCAL_TEST_USER_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/login", { waitUntil: "domcontentloaded", timeout: 20_000 }),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);
  expect(new URL(page.url()).origin).toBe(new URL(testInfo.project.use.baseURL).origin);
}

async function mobileLayoutIssues(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const rootOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth;

    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };

    const hasHorizontalScroller = (element) => {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = getComputedStyle(current);
        if ((style.overflowX === "auto" || style.overflowX === "scroll") && current.scrollWidth > current.clientWidth + 1) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    const selector = (element) => {
      if (element.id) return `#${element.id}`;
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${testId}"]`;
      const name = element.getAttribute("aria-label") || element.getAttribute("name");
      const tag = element.tagName.toLowerCase();
      return name ? `${tag}[${JSON.stringify(name)}]` : `${tag}.${[...element.classList].slice(0, 3).join(".")}`;
    };

    const escapedViewport = [...document.querySelectorAll("body *")]
      .filter((element) => isVisible(element) && !hasHorizontalScroller(element))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => {
        if (element.matches("[data-mobile-overflow-ok], [data-mobile-overflow-ok] *")) return false;
        return rect.left < -1 || rect.right > viewportWidth + 1;
      })
      .slice(0, 12)
      .map(({ element, rect }) => ({
        selector: selector(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));

    const clippedText = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,p,span,a,button,label,dt,dd")]
      .filter((element) => {
        if (!isVisible(element) || element.matches("[data-mobile-truncate-ok], [data-mobile-truncate-ok] *")) return false;
        const text = element.textContent?.trim();
        if (!text || text.length < 4) return false;
        const style = getComputedStyle(element);
        return style.textOverflow === "ellipsis" && element.scrollWidth > element.clientWidth + 1;
      })
      .slice(0, 12)
      .map((element) => ({
        selector: selector(element),
        text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 100),
      }));

    return {
      rootOverflow: Math.max(0, Math.round(rootOverflow)),
      escapedViewport,
      clippedText,
    };
  });
}

async function gotoRoute(page, route) {
  try {
    await page.goto(route, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error).includes("ERR_ABORTED")) throw error;
    await page.waitForTimeout(200);
    await page.goto(route, { waitUntil: "domcontentloaded" });
  }
}

test("todas las rutas caben y conservan el texto esencial en celulares", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 360, height: 800 });
  await signIn(page, testInfo);
  const reports = [];

  for (const viewport of [
    { label: "compacto", width: 320, height: 568 },
    { label: "medio", width: 360, height: 800 },
    { label: "estándar", width: 390, height: 844 },
    { label: "amplio", width: 430, height: 932 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of USER_ROUTES) {
      await gotoRoute(page, route);
      await page.waitForLoadState("load");
      await page.waitForTimeout(100);

      const issues = await mobileLayoutIssues(page);
      if (issues.rootOverflow || issues.escapedViewport.length || issues.clippedText.length) {
        reports.push({ viewport: viewport.label, route, ...issues });
      }
    }
  }

  expect(reports, "Problemas responsive por ruta").toEqual([]);
});
