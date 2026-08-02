import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://127.0.0.1:3000";
const EMAIL = "scgs@gmail.com";
const PASSWORD = "123456789";

const outputDir = path.resolve("./output/user-test-results");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const screenshotsDir = path.join(outputDir, "screenshots-deep");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const report = {
  timestamp: new Date().toISOString(),
  consoleErrors: [],
  networkErrors: [],
  pageErrors: [],
  userActions: [],
  discoveredBugs: []
};

async function main() {
  console.log("=== STARTING DEEP USER INTERACTION TEST ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const errText = msg.text();
      console.log(`[CONSOLE ERROR] ${errText}`);
      report.consoleErrors.push({ text: errText, location: msg.location() });
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[UNCAUGHT PAGE ERROR] ${err.message}`);
    report.pageErrors.push({ message: err.message, stack: err.stack });
    report.discoveredBugs.push({
      type: "UNCAUGHT_JS_CRASH",
      description: err.message,
      stack: err.stack
    });
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ERROR ${res.status()}] ${res.url()}`);
      report.networkErrors.push({ status: res.status(), url: res.url() });
      if (res.status() >= 500) {
        report.discoveredBugs.push({
          type: "SERVER_500_ERROR",
          description: `Endpoint ${res.url()} falló con estado ${res.status()}`
        });
      }
    }
  });

  try {
    // ----------------------------------------------------
    // STEP 1: LOGIN
    // ----------------------------------------------------
    console.log("1. Navigating to /login");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screenshotsDir, "01-login.png") });

    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.screenshot({ path: path.join(screenshotsDir, "02-credentials-entered.png") });

    console.log("Submitting login form...");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
      page.getByRole("button", { name: /entrar/i }).click()
    ]);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, "03-dashboard-logged-in.png") });
    report.userActions.push("Inicio de sesión exitoso con " + EMAIL);

    // ----------------------------------------------------
    // STEP 2: CREATING REMITENTE IN /venta
    // ----------------------------------------------------
    console.log("2. Testing Venta Screen & Remitente Creation...");
    await page.goto(`${BASE_URL}/venta`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screenshotsDir, "04-venta-main.png") });

    // Look for Remitente selector button
    const remitenteBtn = page.locator('button:has-text("REMITENTE")').first();
    if (await remitenteBtn.isVisible()) {
      console.log("Clicking REMITENTE selector button...");
      await remitenteBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, "05-remitente-modal.png") });
    }

    // Look for "+ Nuevo Remitente" or "Crear Remitente"
    const newRemitenteBtn = page.locator('button:has-text("Nuevo"), button:has-text("Crear"), button:has-text("Agregar")').first();
    if (await newRemitenteBtn.isVisible()) {
      console.log("Clicking + Nuevo Remitente button...");
      await newRemitenteBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, "06-new-remitente-form.png") });

      // Fill out sender form fields if open
      const inputs = await page.locator("input:visible").all();
      console.log(`Found ${inputs.length} visible inputs in Remitente form.`);
      for (const input of inputs) {
        const ph = (await input.getAttribute("placeholder")) || "";
        const name = (await input.getAttribute("name")) || "";
        if (/nombre|name/i.test(ph || name)) {
          await input.fill("Carlos Remitente Prueba");
        } else if (/telefono|tel|phone/i.test(ph || name)) {
          await input.fill("5512345678");
        } else if (/email|correo/i.test(ph || name)) {
          await input.fill("carlos.remitente@gmail.com");
        } else if (/direccion|street|calle/i.test(ph || name)) {
          await input.fill("Av. Principal 123");
        }
      }

      await page.screenshot({ path: path.join(screenshotsDir, "07-remitente-fields-filled.png") });
      const saveBtn = page.locator('button:has-text("Guardar"), button:has-text("Crear"), button:has-text("Confirmar")').first();
      if (await saveBtn.isVisible()) {
        console.log("Saving Remitente...");
        await saveBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, "08-remitente-saved.png") });
        report.userActions.push("Creación de remitente realizada");
      }
    }

    // ----------------------------------------------------
    // STEP 3: DESTINATARIO & ENVÍO CREATION FLOW
    // ----------------------------------------------------
    console.log("3. Testing Destinatario & Envio Creation...");
    const destBtn = page.locator('button:has-text("DESTINATARIO")').first();
    if (await destBtn.isVisible()) {
      console.log("Clicking DESTINATARIO selector button...");
      await destBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, "09-destinatario-modal.png") });
    }

    // Close any modal or backdrop if open
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);

    // Test box selection / package creation buttons
    const boxButtons = await page.locator('button:has-text("Caja"), button:has-text("Paquete"), button:has-text("Sobres"), button:has-text("Carga")').all();
    if (boxButtons.length > 0) {
      console.log(`Clicking package selection option: ${await boxButtons[0].innerText()}`);
      await boxButtons[0].click().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, "10-package-selected.png") });
    }

    // ----------------------------------------------------
    // STEP 4: ROUTE TESTING & BUTTON PRESSING
    // ----------------------------------------------------
    console.log("4. Testing key application routes and action buttons...");
    const pagesToAudit = [
      "/venta",
      "/envios",
      "/seguimiento",
      "/bodega",
      "/inventario",
      "/logistica",
      "/contabilidad",
      "/configuracion",
      "/perfil"
    ];

    for (const urlPath of pagesToAudit) {
      console.log(`Auditing ${urlPath}...`);
      await page.goto(`${BASE_URL}${urlPath}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Check page text for application errors
      const bodyText = await page.locator("body").innerText();
      if (/Unhandled Runtime Error|Application error|500 Internal Server Error/i.test(bodyText)) {
        console.log(`[FATAL ERROR DETECTED ON ${urlPath}]`);
        report.discoveredBugs.push({
          type: "FATAL_PAGE_RENDER_ERROR",
          route: urlPath,
          description: `La pantalla ${urlPath} muestra error fatal en renderizado`
        });
      }

      // Test active tab/filter buttons on page
      const visibleButtons = await page.locator("button:visible").all();
      let testedBtns = 0;

      for (let i = 0; i < Math.min(visibleButtons.length, 8); i++) {
        try {
          const btn = visibleButtons[i];
          const txt = (await btn.innerText().catch(() => "")).trim().replace(/\s+/g, " ");
          if (!txt || /cerrar sesión|salir|eliminar|borrar|wipe|reset/i.test(txt)) continue;

          await btn.click({ timeout: 1500 }).catch(() => {});
          testedBtns++;
          await page.waitForTimeout(200);
        } catch {
          // Non-fatal button click failure
        }
      }

      report.userActions.push(`Ruta ${urlPath} probada con ${testedBtns} botones accionados.`);
    }

  } catch (err) {
    console.error("Fatal exception during deep test:", err);
    report.discoveredBugs.push({
      type: "TEST_RUNNER_EXCEPTION",
      description: err.message
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outputDir, "user-deep-report.json"), JSON.stringify(report, null, 2));
    console.log("=== DEEP TEST COMPLETE. Report saved to output/user-test-results/user-deep-report.json ===");
  }
}

main();
