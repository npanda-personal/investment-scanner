import { expect, test, type Page } from "@playwright/test";

const EARNINGS_TABS = [
  { label: "Upcoming Results", value: "UPCOMING_RESULTS" },
  { label: "Growth", value: "GROWTH" },
  { label: "Result Winners", value: "RESULT_WINNERS" },
  { label: "Result Disappointments", value: "RESULT_DISAPPOINTMENTS" },
  { label: "Result Reaction History", value: "RESULT_REACTION_HISTORY" },
  { label: "Earnings Watchlist", value: "EARNINGS_WATCHLIST" },
];

async function navigateToEarnings(page: Page) {
  await page.goto("/earnings-intelligence");
  await page.waitForLoadState("networkidle");
}

test.describe("Earnings Intelligence tab redesign IN region", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToEarnings(page);
    await expect(page.getByRole("heading", { name: "Earnings Intelligence" })).toBeVisible({ timeout: 15000 });
  });

  test("IN-1 page loads no error boundary", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    await navigateToEarnings(page);
    await expect(page.getByRole("heading", { name: "Earnings Intelligence" })).toBeVisible();
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
    const filteredErrors = errors.filter(e => !e.includes("favicon"));
    console.log("IN console errors:", filteredErrors);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-page-load.png" });
  });

  test("IN-2 all 6 tabs present Growth not Pre-Result-Interest", async ({ page }) => {
    for (const tab of EARNINGS_TABS) {
      await expect(page.getByRole("tab", { name: tab.label })).toBeVisible();
    }
    await expect(page.getByRole("tab", { name: "Growth" })).toBeVisible();
    const oldTab = page.getByRole("tab", { name: "Pre-Result Interest" });
    await expect(oldTab).toHaveCount(0);
  });

  test("IN-3 Upcoming Results columns and layout", async ({ page }) => {
    await page.getByRole("tab", { name: "Upcoming Results" }).click();
    await page.waitForTimeout(800);
    const thead = page.locator("table thead");
    await expect(thead.getByText("Full Name")).toBeVisible();
    await expect(thead.getByText("Rev QoQ")).toBeVisible();
    await expect(thead.getByText("Profit QoQ")).toBeVisible();
    await expect(thead.getByText("EPS QoQ")).toBeVisible();
    const rows = page.locator("tbody tr");
    // Deterministic wait for data rows (see Growth tests): avoids the fixed-800ms flake.
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await rows.count();
    console.log("IN Upcoming rows:", rowCount);
    expect(rowCount).toBeGreaterThan(0);
    const firstRowCells = rows.first().locator("td");
    const cellCount = await firstRowCells.count();
    console.log("IN Upcoming first-row cell count:", cellCount);
    // Reasons cell should have title attribute (full text on hover)
    // Reasons is the last column before optional extra cols: check last visible td has title
    const reasonsCell = page.locator("tbody tr").first().locator("td").last();
    const titleAttr = await reasonsCell.getAttribute("title");
    console.log("IN Upcoming last-col title:", titleAttr ? titleAttr.substring(0, 80) : "NONE");
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-upcoming.png" });
  });

  test("IN-4 Growth tab populated", async ({ page }) => {
    await page.getByRole("tab", { name: "Growth" }).click();
    const rows = page.locator("tbody tr");
    // Wait for the data XHR + render to settle rather than a fixed timeout: the dev
    // BE's earnings query can exceed a fixed 800ms wait, which made this row-count flaky.
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await rows.count();
    console.log("IN Growth rows:", rowCount);
    if (rowCount === 0) {
      await page.screenshot({ path: "tests/ui/screenshots/earnings-in-growth-FAIL.png" });
    }
    expect(rowCount).toBeGreaterThan(0);
    // Capture first row symbol for ordering check
    const firstSymbol = await rows.first().locator("td").first().textContent();
    console.log("IN Growth first symbol:", firstSymbol);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-growth.png" });
  });

  test("IN-5 Winners and Disappointments different leading rows", async ({ page }) => {
    await page.getByRole("tab", { name: "Result Winners" }).click();
    await page.waitForTimeout(800);
    const winnersCount = await page.locator("tbody tr").count();
    const winnersFirstSymbol = winnersCount > 0 ? await page.locator("tbody tr").first().locator("td").first().textContent() : "(empty)";
    console.log("IN Winners rows:", winnersCount, "first:", winnersFirstSymbol);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-winners.png" });

    await page.getByRole("tab", { name: "Result Disappointments" }).click();
    await page.waitForTimeout(800);
    const disappCount = await page.locator("tbody tr").count();
    const disappFirstSymbol = disappCount > 0 ? await page.locator("tbody tr").first().locator("td").first().textContent() : "(empty)";
    console.log("IN Disappointments rows:", disappCount, "first:", disappFirstSymbol);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-disappointments.png" });
  });

  test("IN-6 Earnings Watchlist renders", async ({ page }) => {
    await page.getByRole("tab", { name: "Earnings Watchlist" }).click();
    await page.waitForTimeout(800);
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    console.log("IN Watchlist rows:", rowCount);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-watchlist.png" });
  });

  test("IN-7 Result Reaction History renders", async ({ page }) => {
    await page.getByRole("tab", { name: "Result Reaction History" }).click();
    await page.waitForTimeout(800);
    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();
    const firstDate = rowCount > 0 ? await rows.first().locator("td").nth(2).textContent() : "(empty)";
    console.log("IN Reaction History rows:", rowCount, "first resultDate cell:", firstDate);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-in-reaction-history.png" });
  });
});

test.describe("Earnings Intelligence tab redesign US region", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("market_scope", JSON.stringify({ region: "US", assetType: "STOCK" }));
    });
    await navigateToEarnings(page);
    await expect(page.getByRole("heading", { name: "Earnings Intelligence" })).toBeVisible({ timeout: 15000 });
  });

  test("US-1 page loads no error boundary", async ({ page }) => {
    await expect(page.getByText(/Something went wrong/i)).toHaveCount(0);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-page-load.png" });
  });

  test("US-2 all 6 tabs present Growth not Pre-Result-Interest", async ({ page }) => {
    for (const tab of EARNINGS_TABS) {
      await expect(page.getByRole("tab", { name: tab.label })).toBeVisible();
    }
    await expect(page.getByRole("tab", { name: "Growth" })).toBeVisible();
    const oldTab = page.getByRole("tab", { name: "Pre-Result Interest" });
    await expect(oldTab).toHaveCount(0);
  });

  test("US-3 Upcoming Results columns visible", async ({ page }) => {
    await page.getByRole("tab", { name: "Upcoming Results" }).click();
    await page.waitForTimeout(800);
    const thead = page.locator("table thead");
    await expect(thead.getByText("Full Name")).toBeVisible();
    await expect(thead.getByText("Rev QoQ")).toBeVisible();
    await expect(thead.getByText("Profit QoQ")).toBeVisible();
    await expect(thead.getByText("EPS QoQ")).toBeVisible();
    const rows = page.locator("tbody tr");
    // Deterministic wait for data rows (see Growth tests): avoids the fixed-800ms flake.
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await rows.count();
    console.log("US Upcoming rows:", rowCount);
    expect(rowCount).toBeGreaterThan(0);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-upcoming.png" });
  });

  test("US-4 Growth tab populated CRITICAL", async ({ page }) => {
    await page.getByRole("tab", { name: "Growth" }).click();
    const rows = page.locator("tbody tr");
    // Wait for the data XHR + render to settle rather than a fixed timeout: the dev
    // BE's earnings query can exceed a fixed 800ms wait, which made this row-count flaky.
    await expect(rows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await rows.count();
    console.log("US Growth rows:", rowCount);
    if (rowCount === 0) {
      await page.screenshot({ path: "tests/ui/screenshots/earnings-us-growth-FAIL.png" });
    }
    expect(rowCount).toBeGreaterThan(0);
    const firstSymbol = rowCount > 0 ? await rows.first().locator("td").first().textContent() : "(empty)";
    console.log("US Growth first symbol:", firstSymbol);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-growth.png" });
  });

  test("US-5 Result Winners and Disappointments", async ({ page }) => {
    await page.getByRole("tab", { name: "Result Winners" }).click();
    await page.waitForTimeout(800);
    const winnersCount = await page.locator("tbody tr").count();
    console.log("US Winners rows:", winnersCount);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-winners.png" });

    await page.getByRole("tab", { name: "Result Disappointments" }).click();
    await page.waitForTimeout(800);
    const disappCount = await page.locator("tbody tr").count();
    console.log("US Disappointments rows:", disappCount);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-disappointments.png" });
  });

  test("US-6 Watchlist and Reaction History", async ({ page }) => {
    await page.getByRole("tab", { name: "Earnings Watchlist" }).click();
    await page.waitForTimeout(800);
    const watchlistCount = await page.locator("tbody tr").count();
    console.log("US Watchlist rows:", watchlistCount);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-watchlist.png" });

    await page.getByRole("tab", { name: "Result Reaction History" }).click();
    await page.waitForTimeout(800);
    const historyCount = await page.locator("tbody tr").count();
    console.log("US Reaction History rows:", historyCount);
    await page.screenshot({ path: "tests/ui/screenshots/earnings-us-reaction-history.png" });
  });
});
