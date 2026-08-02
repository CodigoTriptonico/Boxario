import { expect, test } from "@playwright/test";

const READ_ONLY_ROUTES = [
  "/",
  "/venta",
  "/seguimiento",
  "/bodega",
  "/inventario",
  "/logistica",
  "/contabilidad",
  "/configuracion",
  "/perfil",
];

test("inicia sesión y carga las rutas principales sin ejecutar acciones", async ({ page }, testInfo) => {
  const email = process.env.LOCAL_TEST_USER_EMAIL;
  const password = process.env.LOCAL_TEST_USER_PASSWORD;
  const appOrigin = new URL(testInfo.project.use.baseURL).origin;

  expect(email, "Falta LOCAL_TEST_USER_EMAIL.").toBeTruthy();
  expect(password, "Falta LOCAL_TEST_USER_PASSWORD.").toBeTruthy();

  let pageErrors = [];
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  await test.step("iniciar sesión con el usuario local configurado", async () => {
    const response = await page.goto("/login", { waitUntil: "domcontentloaded" });
    expect(response, "La pantalla de login no respondió.").not.toBeNull();
    expect(response.status(), "La pantalla de login respondió con error.").toBeLessThan(400);

    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);

    await Promise.all([
      page.waitForURL((url) => url.pathname !== "/login", {
        waitUntil: "domcontentloaded",
      }),
      page.getByRole("button", { name: "Entrar", exact: true }).click(),
    ]);

    expect(new URL(page.url()).origin, "El login salió del origen local permitido.").toBe(
      appOrigin,
    );
    expect(pageErrors, "El login produjo errores JavaScript no controlados.").toEqual([]);
  });

  for (const route of READ_ONLY_ROUTES) {
    await test.step(`GET ${route}`, async () => {
      pageErrors = [];
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });

      expect(response, `${route} no produjo una respuesta.`).not.toBeNull();
      expect(response.status(), `${route} respondió con error HTTP.`).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      await page.waitForLoadState("load");

      const currentUrl = new URL(page.url());
      expect(currentUrl.origin, `${route} salió del origen local permitido.`).toBe(appOrigin);
      expect(currentUrl.pathname, `${route} perdió la sesión autenticada.`).not.toBe("/login");

      const bodyText = await page.locator("body").innerText();
      expect(bodyText, `${route} mostró una pantalla fatal.`).not.toMatch(
        /Application error|Unhandled Runtime Error|500 Internal Server Error/i,
      );
      expect(pageErrors, `${route} produjo errores JavaScript no controlados.`).toEqual([]);
    });
  }
});
