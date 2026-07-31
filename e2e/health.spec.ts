import { expect, test } from "@playwright/test";

test("renders the Phase 0 health page in the Workers preview", async ({ page }) => {
  const response = await page.goto("/health");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle("Status · kkndesakuncir");
  await expect(page.getByRole("heading", { name: "Aplikasi dapat dirender." })).toBeVisible();
  await expect(page.getByText("D1 belum diprovisikan")).toBeVisible();
});
