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

const report = {
  timestamp: new Date().toISOString(),
  consoleErrors: [],
  networkErrors: [],
  pageErrors: [],
  userActions: [],
  discoveredIssues: []
};

async function main() {
  console.log("Starting Full User Test with Visible Chrome Browser...");
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      console.log(`[BROWSER CONSOLE ERROR] ${text}`);
      report.consoleErrors.push({ text, location: msg.location() });
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[UNCAUGHT PAGE ERROR] ${err.message}`);
    report.pageErrors.push({ message: err.message, stack: err.stack });
    report.discoveredIssues.push({
      category: "JS_CRASH",
      message: err.message
    });
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ERROR ${res.status()}] ${res.url()}`);
      report.networkErrors.push({ status: res.status(), url: res.url() });
      if (res.status() >= 500) {
        report.discoveredIssues.push({
          category: "HTTP_500",
          message: `Error 500 al llamar ${res.url()}`
        });
      }
    }
  });

  try {
    // STEP 1: LOGIN
    console.log("Step 1: Logging in at /login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForTimeout(1500);
    report.userActions.push(`Inicio de sesión con ${EMAIL}`);

    // STEP 2: SELECT REMITENTE
    console.log("Step 2: Selecting Remitente on /venta...");
    await page.goto(`${BASE_URL}/venta`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    const remitenteBtn = page.locator('button:has-text("REMITENTE")').first();
    if (await remitenteBtn.isVisible()) {
      await remitenteBtn.click();
      await page.waitForTimeout(800);

      // Select first available sender card/row
      const senderCard = page.locator('button[data-sale-context-type="remitente"], div[data-sale-context-type="remitente"]').first();
      if (await senderCard.isVisible()) {
        console.log("Selecting existing Remitente...");
        await senderCard.click();
        await page.waitForTimeout(800);
        report.userActions.push("Remitente existente seleccionado de la lista.");
      } else {
        console.log("No existing senders list found in modal.");
      }
    }

    // STEP 3: SELECT DESTINATARIO
    console.log("Step 3: Selecting Destinatario on /venta...");
    const destBtn = page.locator('button:has-text("DESTINATARIO")').first();
    if (await destBtn.isVisible() && await destBtn.isEnabled()) {
      await destBtn.click();
      await page.waitForTimeout(800);

      const recipientCard = page.locator('button[aria-label*="destinatario"], div[data-sale-context-type="destinatario"], button:has-text("Seleccionar")').first();
      if (await recipientCard.isVisible()) {
        console.log("Selecting existing Destinatario...");
        await recipientCard.click();
        await page.waitForTimeout(800);
        report.userActions.push("Destinatario seleccionado de la lista.");
      }
    } else {
      console.log("DESTINATARIO button disabled because no Remitente was selected.");
      report.discoveredIssues.push({
        category: "UI_WORKFLOW_LOCK",
        message: "El botón 'DESTINATARIO' permanece deshabilitado (cursor-not-allowed) hasta que se elija explícitamente un Remitente válido."
      });
    }

    // STEP 4: PACKAGE SELECTION
    console.log("Step 4: Testing Package Selection...");
    const boxButtons = await page.locator('button:has-text("Caja"), button:has-text("Paquete"), button:has-text("Sobres")').all();
    if (boxButtons.length > 0) {
      console.log("Clicking box selection button...");
      await boxButtons[0].click().catch(() => {});
      await page.waitForTimeout(500);
      report.userActions.push("Caja/Paquete seleccionado en venta.");
    }

    // STEP 5: ROUTE AUDIT ACROSS ALL MODULES
    console.log("Step 5: Auditing all primary routes and interactive buttons...");
    const modules = [
      { name: "Ventas", path: "/venta" },
      { name: "Envíos", path: "/envios" },
      { name: "Seguimiento", path: "/seguimiento" },
      { name: "Bodega", path: "/bodega" },
      { name: "Inventario", path: "/inventario" },
      { name: "Logística", path: "/logistica" },
      { name: "Contabilidad", path: "/contabilidad" },
      { name: "Configuración", path: "/configuracion" },
      { name: "Perfil", path: "/perfil" },
      { name: "Auditoría", path: "/auditoria" }
    ];

    for (const mod of modules) {
      console.log(`Navigating to ${mod.name} (${mod.path})...`);
      await page.goto(`${BASE_URL}${mod.path}`, { waitUntil: "domcontentloaded" }).catch(() => null);
      await page.waitForTimeout(600);

      const pageText = await page.locator("body").innerText();
      if (/Unhandled Runtime Error|Application error|500 Internal Server Error/i.test(pageText)) {
        report.discoveredIssues.push({
          category: "PAGE_CRASH",
          message: `Pantalla de error fatal en la ruta ${mod.path}`
        });
      }

      // Test active interactive buttons on page
      const tabs = await page.locator('button:visible').all();
      let clicks = 0;
      for (let i = 0; i < Math.min(tabs.length, 5); i++) {
        try {
          const txt = (await tabs[i].innerText().catch(() => "")).trim();
          if (!txt || /salir|cerrar sesión|eliminar|borrar|wipe|reset/i.test(txt)) continue;
          await tabs[i].click({ timeout: 1000 }).catch(() => {});
          clicks++;
          await page.waitForTimeout(200);
        } catch {}
      }
      report.userActions.push(`Módulo ${mod.name}: Navegado con éxito, ${clicks} interacción(es) de botones realizadas.`);
    }

  } catch (err) {
    console.error("Test execution error:", err);
    report.discoveredIssues.push({
      category: "FATAL_SCRIPT_ERROR",
      message: err.message
    });
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outputDir, "full-user-test-report.json"), JSON.stringify(report, null, 2));
    console.log("Full user test finished. Report saved to output/user-test-results/full-user-test-report.json");
  }
}

main();
