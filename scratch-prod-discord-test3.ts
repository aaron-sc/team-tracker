import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto("https://formation.esports-tools.com/signup", { waitUntil: "networkidle" });

  await page.fill('input[name="name"]', "TEST 3 — Discord diagnostic");
  await page.fill('input[name="email"]', "aaron.santacruz03+discordtest3@gmail.com");
  await page.fill('input[name="orgName"]', "TEST 3 — please deny this request");

  await page.click("#role");
  await page.getByRole("option", { name: "Owner / director" }).click();

  await page.fill('input[name="games"]', "N/A — connectivity test");
  await page.fill(
    'textarea[name="reason"]',
    "Third one-off test to capture the new diagnostic logging for why the bot post falls back.",
  );

  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
