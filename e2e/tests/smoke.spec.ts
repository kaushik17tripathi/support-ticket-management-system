import { test, expect } from "@playwright/test";

test.describe("Application smoke", () => {
  test("loads ticket list and acting-user dropdown", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Support Tickets" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    await expect(page.getByLabel("Acting as")).toBeVisible();
  });

  test("selects acting user and persists selection", async ({ page }) => {
    await page.goto("/");

    const actingUser = page.getByLabel("Acting as");
    await page.getByLabel("Acting as").selectOption("user_priya_sharma");

    await page.reload();
    await expect(actingUser).toHaveValue("user_priya_sharma");
  });
});
