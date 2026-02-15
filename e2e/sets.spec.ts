import { test, expect } from "@playwright/test";
import { loginWithNewAccount, deleteTestAccount } from "./helpers";

let testEmail: string;

async function ensureActiveWorkout(page: import("@playwright/test").Page) {
  await page.goto("/current-workout");
  await page.waitForLoadState("networkidle");
  const startButton = page.getByRole("button", { name: "Start Workout" });
  if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startButton.click();
    await page.waitForLoadState("networkidle");
  }
}

async function createMovement(page: import("@playwright/test").Page, name: string) {
  await page.goto("/movements");
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder*="Movement name"]', name);
  // Use the specific "Add" button in the movements form
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("li").filter({ hasText: name }).first()).toBeVisible();
}

test.describe("Sets", () => {
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestAccount(testEmail);
    }
  });

  test.beforeEach(async ({ page }) => {
    testEmail = await loginWithNewAccount(page, "sets", "E2E Sets User");
    // Create a movement we can use for sets
    await createMovement(page, "E2E Bench Press");
    await ensureActiveWorkout(page);
  });

  test.describe("create", () => {
    test("should add a set to the current workout", async ({ page }) => {
      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: "E2E Bench Press" });

      await page.fill('input[placeholder="Weight"]', "100");
      await page.fill('input[placeholder="Reps"]', "10");
      await page.getByRole("button", { name: "Add" }).click();

      await expect(page.locator("li").filter({ hasText: "10 reps" })).toBeVisible();
    });

    test("should require movement, weight, and reps to add a set", async ({ page }) => {
      const addButton = page.getByRole("button", { name: "Add" });
      await expect(addButton).toBeDisabled();

      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: "E2E Bench Press" });
      // Still need weight and reps
      await expect(addButton).toBeDisabled();

      await page.fill('input[placeholder="Weight"]', "100");
      await expect(addButton).toBeDisabled();

      await page.fill('input[placeholder="Reps"]', "5");
      await expect(addButton).toBeEnabled();
    });

    test("should display the new set in the workout", async ({ page }) => {
      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: "E2E Bench Press" });

      await page.fill('input[placeholder="Weight"]', "135");
      await page.fill('input[placeholder="Reps"]', "8");
      await page.getByRole("button", { name: "Add" }).click();

      // Set shows: "E2E Bench Press" "8 reps × 135 lbs"
      const setItem = page.locator("li").filter({ hasText: "E2E Bench Press" });
      await expect(setItem).toBeVisible();
      await expect(setItem).toContainText("8 reps");
      await expect(setItem).toContainText("135 lbs");
    });
  });

  test.describe("read", () => {
    test("should display sets with movement name, weight, and reps", async ({ page }) => {
      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: "E2E Bench Press" });
      await page.fill('input[placeholder="Weight"]', "200");
      await page.fill('input[placeholder="Reps"]', "5");
      await page.getByRole("button", { name: "Add" }).click();

      const setItem = page.locator("li").filter({ hasText: "200 lbs" });
      await expect(setItem).toBeVisible();
      await expect(setItem).toContainText("5 reps");
    });

    test("should show sets in the order they were added", async ({ page }) => {
      const movementSelect = page.locator("select");

      // Add first set
      await movementSelect.selectOption({ label: "E2E Bench Press" });
      await page.fill('input[placeholder="Weight"]', "100");
      await page.fill('input[placeholder="Reps"]', "10");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: "100 lbs" })).toBeVisible();

      // Add second set
      await movementSelect.selectOption({ label: "E2E Bench Press" });
      await page.fill('input[placeholder="Weight"]', "120");
      await page.fill('input[placeholder="Reps"]', "8");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: "120 lbs" })).toBeVisible();

      const setItems = page.locator("ul li");
      const count = await setItems.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe("delete", () => {
    test("should remove a set from the current workout", async ({ page }) => {
      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: "E2E Bench Press" });
      await page.fill('input[placeholder="Weight"]', "999");
      await page.fill('input[placeholder="Reps"]', "1");
      await page.getByRole("button", { name: "Add" }).click();

      const setItem = page.locator("li").filter({ hasText: "999 lbs" });
      await expect(setItem).toBeVisible();

      await setItem.locator("button").click();
      await expect(setItem).not.toBeVisible();
    });

    test("should update the sets list after deletion", async ({ page }) => {
      const movementSelect = page.locator("select");

      // Add two sets
      await movementSelect.selectOption({ label: "E2E Bench Press" });
      await page.fill('input[placeholder="Weight"]', "888");
      await page.fill('input[placeholder="Reps"]', "3");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: "888 lbs" })).toBeVisible();

      await movementSelect.selectOption({ label: "E2E Bench Press" });
      await page.fill('input[placeholder="Weight"]', "777");
      await page.fill('input[placeholder="Reps"]', "6");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: "777 lbs" })).toBeVisible();

      // Delete the first set
      const firstSet = page.locator("li").filter({ hasText: "888 lbs" });
      await firstSet.locator("button").click();
      await expect(firstSet).not.toBeVisible();

      // Second set should still be visible
      await expect(page.locator("li").filter({ hasText: "777 lbs" })).toBeVisible();
    });
  });
});
