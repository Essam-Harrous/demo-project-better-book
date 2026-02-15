import { test, expect } from "@playwright/test";
import { loginWithNewAccount, deleteTestAccount } from "./helpers";

let testEmail: string;

async function createMovement(page: import("@playwright/test").Page, name: string) {
  await page.goto("/movements");
  await page.waitForLoadState("networkidle");
  await page.fill('input[placeholder*="Movement name"]', name);
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("li").filter({ hasText: name }).first()).toBeVisible();
}

test.describe("Workouts", () => {
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestAccount(testEmail);
    }
  });

  test.beforeEach(async ({ page }) => {
    testEmail = await loginWithNewAccount(page, "wkt", "E2E Workouts User");
  });

  test.describe("create", () => {
    test("should start a new workout from the current workout page", async ({ page }) => {
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");

      // For a fresh account, there should be no active workout
      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("button", { name: "Complete Workout" })).toBeVisible();
    });

    test("should show the workout date after starting", async ({ page }) => {
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");

      const startButton = page.getByRole("button", { name: "Start Workout" });
      if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startButton.click();
        await page.waitForLoadState("networkidle");
      }

      const today = new Date();
      const monthName = today.toLocaleDateString("en-US", { month: "long" });
      await expect(page.getByText(monthName)).toBeVisible();
    });
  });

  test.describe("read", () => {
    test("should display the current active workout", async ({ page }) => {
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");

      const startButton = page.getByRole("button", { name: "Start Workout" });
      if (await startButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await startButton.click();
        await page.waitForLoadState("networkidle");
      }

      await expect(page.getByRole("heading", { name: "Current Workout" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Complete Workout" })).toBeVisible();
    });

    test("should show 'No active workout' when none exists", async ({ page }) => {
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");

      // Fresh account has no workout
      await expect(page.getByText("No active workout")).toBeVisible();
      await expect(page.getByRole("button", { name: "Start Workout" })).toBeVisible();
    });

    test("should display completed workouts in workout history", async ({ page }) => {
      // Create and complete a workout first
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("No active workout")).toBeVisible();

      await page.click('a[href="/workout-history"]');
      await page.waitForURL("**/workout-history");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("heading", { name: "Workout History" })).toBeVisible();
      await expect(page.getByText("Completed Workouts")).toBeVisible();
      const rows = page.locator("tbody tr");
      await expect(rows.first()).toBeVisible();
    });
  });

  test.describe("complete", () => {
    test("should mark the current workout as completed", async ({ page }) => {
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("button", { name: "Complete Workout" })).toBeVisible();

      await page.getByRole("button", { name: "Complete Workout" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("No active workout")).toBeVisible();
    });

    test("should move completed workout to history", async ({ page }) => {
      // Create a movement so we can add a set
      await createMovement(page, "E2E Squat");

      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");

      // Add a set
      const movementSelect = page.locator("select");
      await movementSelect.selectOption({ label: "E2E Squat" });
      await page.fill('input[placeholder="Weight"]', "111");
      await page.fill('input[placeholder="Reps"]', "11");
      await page.getByRole("button", { name: "Add" }).click();
      await expect(page.locator("li").filter({ hasText: "111 lbs" })).toBeVisible();

      // Complete the workout
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("No active workout")).toBeVisible();

      // Verify in history
      await page.click('a[href="/workout-history"]');
      await page.waitForURL("**/workout-history");
      await page.waitForLoadState("networkidle");

      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      await expect(page.getByText(today).first()).toBeVisible();
    });
  });

  test.describe("delete", () => {
    test("should delete selected workouts from history", async ({ page }) => {
      // Create and complete a workout
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await page.waitForLoadState("networkidle");

      await page.click('a[href="/workout-history"]');
      await page.waitForURL("**/workout-history");
      await page.waitForLoadState("networkidle");

      const firstCheckbox = page.locator("tbody tr").first().locator('input[type="checkbox"]');
      await firstCheckbox.check();

      const deleteButton = page.getByRole("button", { name: /Delete Selected/ });
      await expect(deleteButton).toBeEnabled();
      await deleteButton.click();
      await page.waitForLoadState("networkidle");

      // After deletion, the count should reset
      await expect(page.getByRole("button", { name: "Delete Selected (0)" })).toBeVisible();
    });

    test("should allow selecting multiple workouts for deletion", async ({ page }) => {
      // Create and complete two workouts
      await page.goto("/current-workout");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await page.waitForLoadState("networkidle");

      await page.getByRole("button", { name: "Start Workout" }).click();
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Complete Workout" }).click();
      await page.waitForLoadState("networkidle");

      await page.click('a[href="/workout-history"]');
      await page.waitForURL("**/workout-history");
      await page.waitForLoadState("networkidle");

      // Select all
      const selectAllCheckbox = page.locator("thead").locator('input[type="checkbox"]');
      await selectAllCheckbox.check();

      const deleteButton = page.getByRole("button", { name: /Delete Selected/ });
      const buttonText = await deleteButton.textContent();
      expect(buttonText).toMatch(/Delete Selected \(\d+\)/);

      // Uncheck to clean up
      await selectAllCheckbox.uncheck();
      await expect(page.getByRole("button", { name: "Delete Selected (0)" })).toBeVisible();
    });
  });
});
