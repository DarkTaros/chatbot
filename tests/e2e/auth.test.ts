import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

test.describe("Authentication Pages", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Sign In|登录)$/ })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(Sign up|注册)$/ })
    ).toBeVisible();
  });

  test("register page renders correctly", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Sign Up|注册)$/ })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^(Sign in|登录)$/ })
    ).toBeVisible();
  });

  test("register form submission does not fall into the error boundary", async ({
    page,
  }) => {
    const user = generateRandomTestUser();

    await page.goto("/register");
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole("button", { name: /^(Sign Up|注册)$/ }).click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "This page couldn’t load" })
    ).toHaveCount(0);
  });

  test("re-registering an existing account shows a toast", async ({ page }) => {
    const user = generateRandomTestUser();

    await page.goto("/register");
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole("button", { name: /^(Sign Up|注册)$/ }).click();

    await expect(page).toHaveURL("/");

    await page.context().clearCookies();
    await page.goto("/register");
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole("button", { name: /^(Sign Up|注册)$/ }).click();

    await expect(page.getByTestId("toast")).toContainText(
      /^(Account already exists!|账号已存在！)$/
    );
  });

  test("can navigate from login to register", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /^(Sign up|注册)$/ }).click();
    await expect(page).toHaveURL("/register");
  });

  test("can navigate from register to login", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("link", { name: /^(Sign in|登录)$/ }).click();
    await expect(page).toHaveURL("/login");
  });

  test("sign out keeps the user on the current origin", async ({
    baseURL,
    page,
  }) => {
    const user = generateRandomTestUser();

    await page.goto("/register");
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole("button", { name: /^(Sign Up|注册)$/ }).click();

    await expect(page).toHaveURL("/");

    await page.getByTestId("user-nav-button").click();
    await page.getByRole("button", { name: /^(Sign out|退出登录)$/ }).click();

    await expect(page).toHaveURL("/");

    expect(new URL(page.url()).origin).toBe(
      new URL(baseURL ?? page.url()).origin
    );
  });
});
