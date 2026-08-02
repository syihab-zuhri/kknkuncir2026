import { expect, test } from "@playwright/test";

test("renders the Phase 3 health page in the Workers preview", async ({
  page,
}) => {
  const response = await page.goto("/health");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle("Status · kkndesakuncir");
  await expect(
    page.getByRole("heading", { name: "Aplikasi dapat dirender." }),
  ).toBeVisible();
  await expect(page.getByText("Phase 3")).toBeVisible();
  await expect(
    page.getByText("Kelompok, mahasiswa, dan sesi tersedia di D1"),
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

for (const path of [
  "/admin/settings/group",
  "/admin/students",
  "/admin/sessions",
  "/admin/sessions/new",
  "/student/home",
  "/student/profile",
]) {
  test(`protects ${path} from unauthenticated access`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible();
  });
}
