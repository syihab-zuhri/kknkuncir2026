import { expect, test } from "@playwright/test";

test("renders the Phase 1 health page in the Workers preview", async ({
  page,
}) => {
  const response = await page.goto("/health");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle("Status · kkndesakuncir");
  await expect(
    page.getByRole("heading", { name: "Aplikasi dapat dirender." }),
  ).toBeVisible();
  await expect(page.getByText("Phase 1")).toBeVisible();
  await expect(
    page.getByText("Schema D1 dan fondasi autentikasi tersedia"),
  ).toBeVisible();
});

test("renders the login form without public registration", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("textbox", { name: "NIM" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  await expect(page.getByRole("link", { name: /daftar/i })).toHaveCount(0);
});

test("redirects an unauthenticated protected page to login", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
});
