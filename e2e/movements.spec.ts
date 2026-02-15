import { test, expect } from "@playwright/test";
import { loginWithNewAccount, deleteTestAccount } from "./helpers";

let testEmail: string;

test.describe("Movements", () => {
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestAccount(testEmail);
    }
  });

  test.beforeEach(async ({ page }) => {
    testEmail = await loginWithNewAccount(page, "mvmt", "E2E Test User");
    await page.click('a[href="/movements"]');
    await page.waitForURL("**/movements");
    await page.waitForLoadState("networkidle");
  });

  test.describe("create", () => {
    test("should create a new movement with a valid name", async ({ page }) => {
      const movementName = `Test Movement ${Date.now()}`;
      await page.fill('input[placeholder*="Movement name"]', movementName);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
    });

    test("should show the new movement in the movements list", async ({ page }) => {
      const movementName = `Listed Movement ${Date.now()}`;
      await page.fill('input[placeholder*="Movement name"]', movementName);
      await page.getByRole("button", { name: "Add" }).click();

      // Verify it appears within the "All Movements" card
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
    });

    test("should clear the input after creating a movement", async ({ page }) => {
      const movementName = `Clear Input ${Date.now()}`;
      await page.fill('input[placeholder*="Movement name"]', movementName);
      await page.getByRole("button", { name: "Add" }).click();

      // Wait for the movement to appear, then check input is cleared
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
      await expect(page.locator('input[placeholder*="Movement name"]')).toHaveValue("");
    });
  });

  test.describe("read", () => {
    test("should display all movements on the movements page", async ({ page }) => {
      // Create a movement first so the list isn't empty
      const movementName = `Visible Movement ${Date.now()}`;
      await page.fill('input[placeholder*="Movement name"]', movementName);
      await page.getByRole("button", { name: "Add" }).click();

      await expect(page.getByText("All Movements")).toBeVisible();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
    });

    test("should display movement names in the list", async ({ page }) => {
      const ts = Date.now();
      const names = [`AlphaCurl-${ts}`, `ZebraPress-${ts}`];
      // Add two movements
      for (const name of names) {
        await page.fill('input[placeholder*="Movement name"]', name);
        await page.getByRole("button", { name: "Add" }).click();
        await expect(page.locator("li").filter({ hasText: name }).first()).toBeVisible();
        // Wait for the mutation to complete (input clears and button re-enables)
        await expect(page.locator('input[placeholder*="Movement name"]')).toHaveValue("");
      }

      // Verify both appear
      await expect(page.locator("li").filter({ hasText: names[0] }).first()).toBeVisible();
      await expect(page.locator("li").filter({ hasText: names[1] }).first()).toBeVisible();
    });
  });

  test.describe("delete", () => {
    test("should delete a movement with no linked sets", async ({ page }) => {
      const movementName = `Delete Me ${Date.now()}`;
      await page.fill('input[placeholder*="Movement name"]', movementName);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
      await expect(page.locator('input[placeholder*="Movement name"]')).toHaveValue("");

      // Click the delete button — dialog appears for all movements
      const movementItem = page.locator("li").filter({ hasText: movementName });
      await movementItem.getByRole("button", { name: `Delete ${movementName}` }).click();

      // Verify the dialog appears
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("This action cannot be undone");

      // Confirm deletion
      await dialog.getByRole("button", { name: "Delete" }).click();

      // Movement should disappear and success toast shown
      await expect(movementItem).not.toBeVisible();
      await expect(page.getByText("has been deleted")).toBeVisible();
    });

    test("should warn and cascade delete a movement linked to workouts", async ({ page }) => {
      const movementName = `Linked Movement ${Date.now()}`;
      await page.fill('input[placeholder*="Movement name"]', movementName);
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();
      await expect(page.locator('input[placeholder*="Movement name"]')).toHaveValue("");

      // Start a workout and add a set with this movement
      await page.click('a[href="/current-workout"]');
      await page.waitForURL("**/current-workout");
      await page.waitForLoadState("networkidle");

      // Fresh account — always needs to start a workout
      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");

      // Wait for the workout UI to fully render with the add set form
      await expect(page.getByRole("button", { name: "Complete Workout" })).toBeVisible();
      await expect(page.locator("select")).toBeVisible();

      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: movementName });
      await page.fill('input[placeholder="Weight"]', "100");
      await page.fill('input[placeholder="Reps"]', "10");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: movementName })).toBeVisible();

      // Go back to movements page
      await page.click('a[href="/movements"]');
      await page.waitForURL("**/movements");
      await page.waitForLoadState("networkidle");

      // Click delete — should open the confirmation dialog
      const movementItem = page.locator("li").filter({ hasText: movementName });
      await movementItem.getByRole("button", { name: `Delete ${movementName}` }).click();

      // Verify the dialog appears with warning content
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("set");
      await expect(dialog).toContainText("workout");

      // Confirm the cascade delete
      await dialog.getByRole("button", { name: "Delete" }).click();

      // Movement should disappear from the list
      await expect(movementItem).not.toBeVisible();
    });
  });
});
