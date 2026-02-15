import { test, expect } from "@playwright/test";
import { loginWithNewAccount, deleteTestAccount } from "./helpers";

let testEmail: string;

test.describe("Nutrition Tracking", () => {
  test.afterEach(async () => {
    if (testEmail) {
      await deleteTestAccount(testEmail);
    }
  });

  test.beforeEach(async ({ page }) => {
    testEmail = await loginWithNewAccount(page, "nutr", "E2E Nutrition User");
    await page.click('a[href="/nutrition"]');
    await page.waitForURL("**/nutrition**");
    await page.waitForLoadState("networkidle");
  });

  /** Helper: fill the nutrition form and submit */
  async function addEntry(
    page: import("@playwright/test").Page,
    name: string,
    values: { calories: string; protein?: string; carbs?: string; fats?: string },
  ) {
    const nameInput = page.locator('input[placeholder*="Chicken Breast"]');
    // Wait for the name input to be empty (form reset after previous submission)
    await expect(nameInput).toHaveValue("");
    await nameInput.fill(name);
    await page.fill('input[id="calories"]', values.calories);
    if (values.protein) await page.fill('input[id="protein"]', values.protein);
    if (values.carbs) await page.fill('input[id="carbs"]', values.carbs);
    if (values.fats) await page.fill('input[id="fats"]', values.fats);

    const addBtn = page.getByRole("button", { name: "Add Entry" });
    await expect(addBtn).toBeEnabled();
    await addBtn.click();
    await page.waitForLoadState("networkidle");
  }

  test.describe("create", () => {
    test("should add a nutrition entry", async ({ page }) => {
      // Check initial state
      await expect(page.getByText("No entries for this day")).toBeVisible();

      // Fill form and submit
      await addEntry(page, "Test Meal", {
        calories: "500",
        protein: "30",
        carbs: "40",
        fats: "15",
      });

      // Verify entry appears in list
      await expect(page.getByText("Test Meal")).toBeVisible();
      await expect(page.getByText("500 kcal")).toBeVisible();

      // Verify toast
      await expect(page.getByText("Entry added")).toBeVisible();

      // Verify totals updated
      const summary = page.getByTestId("daily-summary");
      await expect(summary.locator("> div").filter({ hasText: "Calories" })).toContainText("500");
      await expect(summary.locator("> div").filter({ hasText: "Protein" })).toContainText("30");
    });
  });

  test.describe("read", () => {
    test("should display daily totals correctly", async ({ page }) => {
      // Add first meal
      await addEntry(page, "Breakfast", { calories: "300", carbs: "20" });

      // Add second meal (form is reset after first submit)
      await addEntry(page, "Lunch", { calories: "600", carbs: "40" });

      // Check combined totals
      const summary = page.getByTestId("daily-summary");
      // Calories: 300 + 600 = 900
      await expect(summary.locator("> div").filter({ hasText: "Calories" })).toContainText("900");
      // Carbs: 20 + 40 = 60
      await expect(summary.locator("> div").filter({ hasText: "Carbs" })).toContainText("60");
    });

    test("should navigate between days", async ({ page }) => {
      // Add entry for today
      await addEntry(page, "Today's Meal", { calories: "500" });
      await expect(page.getByText("Today's Meal")).toBeVisible();

      // Go to previous day
      await page.getByTestId("prev-day").click();
      await page.waitForURL(/date=/);
      await page.waitForLoadState("networkidle");

      // Should be empty
      await expect(page.getByText("Today's Meal")).not.toBeVisible();
      await expect(page.getByText("No entries for this day")).toBeVisible();

      // Go back to today
      await page.getByTestId("next-day").click();
      await page.waitForLoadState("networkidle");

      // Entry should be visible again
      await expect(page.getByText("Today's Meal")).toBeVisible();
    });
  });

  test.describe("delete", () => {
    test("should delete a nutrition entry and update totals", async ({ page }) => {
      await addEntry(page, "To Delete", { calories: "1000" });

      // Check total
      const summary = page.getByTestId("daily-summary");
      await expect(summary.locator("> div").filter({ hasText: "Calories" })).toContainText("1000");

      // Delete entry
      const entry = page.locator(".group").filter({ hasText: "To Delete" });
      await entry.getByRole("button").click();
      await page.waitForLoadState("networkidle");

      // Verify removal
      await expect(entry).not.toBeVisible();
      await expect(page.getByText("Entry deleted")).toBeVisible();

      // Totals should reset
      await expect(summary.locator("> div").filter({ hasText: "Calories" })).toContainText("0");
    });
  });

  test.describe("constraints", () => {
    test("should disable next day button when on today", async ({ page }) => {
      // Initially on today
      const nextBtn = page.getByTestId("next-day");
      await expect(nextBtn).toBeDisabled();

      // Go to previous day
      await page.getByTestId("prev-day").click();
      await page.waitForURL(/date=/);
      
      // Should be enabled now
      await expect(nextBtn).toBeEnabled();
    });

    test("should have min=0 for all inputs", async ({ page }) => {
      await expect(page.locator('input[id="calories"]')).toHaveAttribute("min", "0");
      await expect(page.locator('input[id="protein"]')).toHaveAttribute("min", "0");
      await expect(page.locator('input[id="carbs"]')).toHaveAttribute("min", "0");
      await expect(page.locator('input[id="fats"]')).toHaveAttribute("min", "0");
    });
  });
});
