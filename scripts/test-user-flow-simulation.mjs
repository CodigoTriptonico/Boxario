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

const screenshotsDir = path.join(outputDir, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const report = {
  timestamp: new Date().toISOString(),
  consoleErrors: [],
  networkErrors: [],
  pageErrors: [],
  flowResults: []
};

async function main() {
  console.log("Launching browser for simulated user testing...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });
  const page = await context.newPage();

  // Listeners for errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[BROWSER CONSOLE ERROR] ${msg.text()}`);
      report.consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[UNCAUGHT PAGE ERROR] ${err.message}`);
    report.pageErrors.push({ message: err.message, stack: err.stack });
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ERROR ${res.status()}] ${res.url()}`);
      report.networkErrors.push({ status: res.status(), url: res.url() });
    }
  });

  try {
    // Step 1: Navigate to Login
    console.log("Step 1: Navigating to login page...");
    const loginResp = await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screenshotsDir, "01-login-page.png") });
    console.log(`Login page status: ${loginResp ? loginResp.status() : 'null'}`);

    // Step 2: Fill credentials and log in
    console.log("Step 2: Logging in as scgs@gmail.com...");
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    
    // Click Entrar button
    const loginButton = page.getByRole("button", { name: /entrar/i });
    if (await loginButton.isVisible()) {
      await loginButton.click();
    } else {
      await page.click('button[type="submit"]');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, "02-after-login.png") });
    report.flowResults.push({ step: "Login", currentUrl: page.url() });

    // Step 3: Go to /venta and create a remitente (Sender) & Envio
    console.log("Step 3: Navigating to /venta (Ventas)...");
    await page.goto(`${BASE_URL}/venta`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, "03-venta-page.png") });

    // Check tabs or buttons on /venta
    console.log("Step 3b: Inspecting Venta page interactive elements...");
    const allButtons = await page.locator("button:visible").all();
    console.log(`Found ${allButtons.length} visible buttons on /venta`);
    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const text = await allButtons[i].innerText().catch(() => "");
      console.log(` Button ${i+1}: "${text.trim().replace(/\s+/g, " ")}"`);
    }

    // Try interacting with Venta screen: click tabs, click add sender button if available
    for (const btn of allButtons) {
      const txt = (await btn.innerText().catch(() => "")).trim();
      if (/remitente|cliente|nuevo|agregar/i.test(txt)) {
        console.log(`Clicking interactive button: "${txt}"`);
        await btn.click().catch(() => {});
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(screenshotsDir, "04-venta-interaction.png") });
        break;
      }
    }

    // Step 4: Click around and test all main routes & buttons
    const routesToTest = [
      { name: "Venta", path: "/venta" },
      { name: "Envíos", path: "/envios" },
      { name: "Seguimiento", path: "/seguimiento" },
      { name: "Bodega", path: "/bodega" },
      { name: "Inventario", path: "/inventario" },
      { name: "Logística", path: "/logistica" },
      { name: "Contabilidad", path: "/contabilidad" },
      { name: "Configuración", path: "/configuracion" },
      { name: "Perfil", path: "/perfil" }
    ];

    for (let i = 0; i < routesToTest.length; i++) {
      const route = routesToTest[i];
      console.log(`Testing route: ${route.name} (${route.path})`);
      const resp = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded" }).catch(() => null);
      await page.waitForTimeout(1000);
      
      const screenshotPath = path.join(screenshotsDir, `route-${i+1}-${route.name.toLowerCase().replace(/[^a-z]/g, "")}.png`);
      await page.screenshot({ path: screenshotPath });

      // Click visible buttons on this route to test button handlers
      const buttons = await page.locator("button:visible").all();
      let clickedCount = 0;

      for (let j = 0; j < Math.min(buttons.length, 6); j++) {
        try {
          const btn = buttons[j];
          const text = (await btn.innerText().catch(() => "")).trim();
          
          // Skip logout or destructive buttons
          if (/salir|cerrar sesión|eliminar|borrar|wipe|reset/i.test(text)) continue;

          if (await btn.isEnabled()) {
            await btn.click({ timeout: 2000 }).catch(() => {});
            clickedCount++;
            await page.waitForTimeout(300);
          }
        } catch {
          // Ignore
        }
      }

      report.flowResults.push({
        route: route.name,
        path: route.path,
        status: resp ? resp.status() : "error",
        buttonsFound: buttons.length,
        buttonsClicked: clickedCount,
        screenshot: screenshotPath
      });
    }

  } catch (err) {
    console.error("Test execution fatal error:", err);
    report.fatalError = err.message;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(outputDir, "user-test-report.json"), JSON.stringify(report, null, 2));
    console.log("Test finished! Report saved to output/user-test-results/user-test-report.json");
  }
}

main();
