import { test, expect } from "@playwright/test";

test.describe("Ticket search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Acting as").selectOption("user_priya_sharma");
  });

  test("finds seeded ticket by keyword", async ({ page }) => {
    await page.getByLabel("Search tickets").fill("login");

    await expect(
      page.getByRole("link", { name: /Login Issue — password reset loop/i }),
    ).toBeVisible();
  });
});
