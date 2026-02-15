import { test, expect } from "@playwright/test";
import { loginWithNewAccount, deleteTestAccount } from "./helpers";

let testEmail: string;

test.describe("Weight Tracking", () => {
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestAccount(testEmail);
    }
  });

  test.beforeEach(async ({ page }) => {
    testEmail = await loginWithNewAccount(page, "wt", "E2E Weight User");
    await page.click('a[href="/weight-tracking"]');
    await page.waitForURL("**/weight-tracking");
    await page.waitForLoadState("networkidle");
  });

  test.describe("create", () => {
    test("should add a weight entry", async ({ page }) => {
      await page.fill('input[placeholder="Weight (lbs)"]', "180");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      // Should show the entry in current weight card
      await expect(page.locator(".text-4xl")).toContainText("180 lbs");
      // And in history
      await expect(page.locator(".group").filter({ hasText: "180 lbs" })).toBeVisible();
      // Toast
      await expect(page.getByText("Weight entry added")).toBeVisible();
    });

    test("should clear the input after adding", async ({ page }) => {
      await page.fill('input[placeholder="Weight (lbs)"]', "175");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      await expect(page.locator('input[placeholder="Weight (lbs)"]')).toHaveValue("");
    });

    test("should disable the Add button when input is empty", async ({ page }) => {
      const addButton = page.getByRole("button", { name: "Add" });
      await expect(addButton).toBeDisabled();

      await page.fill('input[placeholder="Weight (lbs)"]', "170");
      await expect(addButton).toBeEnabled();
    });
  });

  test.describe("read", () => {
    test("should show placeholder when no entries exist", async ({ page }) => {
      await expect(page.getByText("No weight entries yet")).toBeVisible();
      await expect(page.getByText("--")).toBeVisible();
    });

    test("should display the current weight from the latest entry", async ({ page }) => {
      // Add first entry
      await page.fill('input[placeholder="Weight (lbs)"]', "185");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('input[placeholder="Weight (lbs)"]')).toHaveValue("");

      // Add second entry
      await page.fill('input[placeholder="Weight (lbs)"]', "183");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      // Current weight card should show the latest
      await expect(page.locator(".text-4xl")).toContainText("183 lbs");
    });

    test("should display entries in the history list", async ({ page }) => {
      // Add first entry
      await page.fill('input[placeholder="Weight (lbs)"]', "190");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('input[placeholder="Weight (lbs)"]')).toHaveValue("");

      // Add second entry
      await page.fill('input[placeholder="Weight (lbs)"]', "188");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      // Both entries should appear in the History section
      await expect(page.locator(".group").filter({ hasText: "190 lbs" })).toBeVisible();
      await expect(page.locator(".group").filter({ hasText: "188 lbs" })).toBeVisible();
    });

    test("should show the chart after adding entries", async ({ page }) => {
      // Initially no chart data
      await expect(page.getByText("No data in the last 15 days")).toBeVisible();

      await page.fill('input[placeholder="Weight (lbs)"]', "175");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      // Chart message should disappear (chart renders)
      await expect(page.getByText("No data in the last 15 days")).not.toBeVisible();
    });
  });

  test.describe("delete", () => {
    test("should delete a weight entry from history", async ({ page }) => {
      await page.fill('input[placeholder="Weight (lbs)"]', "200");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      const entry = page.locator(".group").filter({ hasText: "200 lbs" });
      await expect(entry).toBeVisible();

      // Click the delete button on the entry
      await entry.getByRole("button").click();
      await page.waitForLoadState("networkidle");

      // Entry should be removed and placeholder shown
      await expect(entry).not.toBeVisible();
      await expect(page.getByText("No weight entries yet")).toBeVisible();
      // Toast
      await expect(page.getByText("Weight entry deleted")).toBeVisible();
    });

    test("should update current weight after deleting the latest entry", async ({ page }) => {
      // Add first entry
      await page.fill('input[placeholder="Weight (lbs)"]', "195");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator('input[placeholder="Weight (lbs)"]')).toHaveValue("");

      // Add second entry
      await page.fill('input[placeholder="Weight (lbs)"]', "192");
      await page.getByRole("button", { name: "Add" }).click();
      await page.waitForLoadState("networkidle");

      // Delete the latest entry (192 — shown first since ordered desc)
      const latestEntry = page.locator(".group").first();
      await expect(latestEntry).toContainText("192 lbs");
      await latestEntry.getByRole("button").click();
      await page.waitForLoadState("networkidle");

      // Current weight should now show the remaining entry
      await expect(page.locator(".text-4xl")).toContainText("195 lbs");
    });
  });
});
