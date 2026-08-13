import AxeBuilder from "@axe-core/playwright";
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
  const email = process.env.LOCAL_TEST_USER_EMAIL;
  const password = process.env.LOCAL_TEST_USER_PASSWORD;
  const appOrigin = new URL(testInfo.project.use.baseURL).origin;

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname !== "/login", {
      waitUntil: "domcontentloaded",
    }),
    page.getByRole("button", { name: "Entrar", exact: true }).click(),
  ]);
  expect(new URL(page.url()).origin).toBe(appOrigin);
}

async function isVisible(locator) {
  return locator.count().then(async (count) => count > 0 && locator.first().isVisible());
}

async function auditVisibleContrast(page, label) {
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);

  const results = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();

  const violations = results.violations.map((violation) => ({
    id: violation.id,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" ")),
  }));

  expect(violations, `Violaciones de contraste en ${label}`).toEqual([]);
}

async function auditRoute(page, route, viewportLabel) {
  const pageErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  page.on("pageerror", onPageError);

  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response, `${route} no produjo respuesta en ${viewportLabel}.`).not.toBeNull();
    expect(response.status(), `${route} falló en ${viewportLabel}.`).toBeLessThan(400);
    await expect(page.locator("body")).toBeVisible();
    expect(new URL(page.url()).pathname).not.toBe("/login");
    await auditVisibleContrast(page, `${route} (${viewportLabel})`);
    expect(pageErrors, `Errores de hidratación/runtime en ${route} (${viewportLabel}).`).toEqual([]);
  } finally {
    page.off("pageerror", onPageError);
  }
}

async function auditSurfaceControls(page, route, viewportLabel) {
  const optionsButton = page.getByRole("button", {
    name: "Mostrar opciones de vista y apariencia",
  });

  if (await isVisible(optionsButton)) {
    await optionsButton.first().click();
    await auditVisibleContrast(page, `${route} selector de opciones (${viewportLabel})`);
  }

  const viewButton = page.getByRole("button", { name: /Cambiar vista/i });
  if (await isVisible(viewButton)) {
    // Recorre filas, tarjetas y Excel cuando la página ofrece esos modos.
    for (let index = 0; index < 3; index += 1) {
      await viewButton.first().click();
      await auditVisibleContrast(page, `${route} cambio de vista ${index + 1} (${viewportLabel})`);
    }
  }

  const paletteButton = page.getByRole("button", { name: /^Color de / });
  if (await isVisible(paletteButton)) {
    await paletteButton.first().click();
    await auditVisibleContrast(page, `${route} selector de paletas (${viewportLabel})`);

    for (const tabName of ["Temas", "Colores", "Personal"]) {
      const tab = page.getByRole("button", { name: tabName, exact: true });
      if (await isVisible(tab)) {
        await tab.click();
        await auditVisibleContrast(page, `${route} paletas ${tabName} (${viewportLabel})`);
      }
    }

    await page.keyboard.press("Escape");
  }
}

test("audita contraste WCAG AA en rutas, navegación y controles de superficie", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await signIn(page, testInfo);

  for (const viewport of [
    { label: "escritorio", width: 1280, height: 800 },
    { label: "móvil", width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of USER_ROUTES) {
      await auditRoute(page, route, viewport.label);
    }

    for (const route of ["/seguimiento", "/logistica", "/inventario", "/venta"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await auditSurfaceControls(page, route, viewport.label);
    }
  }
});
