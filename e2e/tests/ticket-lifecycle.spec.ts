import { test, expect } from "@playwright/test";

test.describe("Ticket lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Acting as").selectOption("user_james_chen");
  });

  test("creates a ticket and shows detail view", async ({ page }) => {
    const uniqueTitle = `E2E ticket ${Date.now()}`;

    await page.getByRole("link", { name: "+ New ticket" }).click();
    await page.getByLabel("Title *").fill(uniqueTitle);
    await page.getByLabel("Description *").fill("Created by Playwright E2E test.");
    await page.getByLabel("Priority *").selectOption("MEDIUM");
    await page.getByRole("button", { name: "Create ticket" }).click();

    await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible();
    await expect(page.getByText("Open")).toBeVisible();
  });

  test("shows status actions from API allowedStatuses", async ({ page }) => {
    await page.getByRole("link", { name: /Cannot log in after SSO update/i }).click();

    await expect(page.getByRole("button", { name: "Start progress" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel ticket" })).toBeVisible();
  });
});
