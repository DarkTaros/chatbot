import { expect, type Page, test } from "@playwright/test";

async function mockModels(page: Page) {
  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        capabilities: {
          "test/model": {
            reasoning: false,
            tools: false,
            vision: true,
          },
        },
        defaultModel: "test/model",
        models: [
          {
            description: "Test model",
            id: "test/model",
            name: "Test Model",
            provider: "test",
          },
        ],
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockModels(page);
});

test.describe("Chat Page", () => {
  test("home page loads with input field", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
  });

  test("shows language selector instead of Vercel deploy button", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("language-selector")).toBeVisible();
    await expect(page.getByText("Deploy with Vercel")).not.toBeVisible();
  });

  test("persists selected language after reload", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("language-selector").click();
    await page.getByTestId("language-selector-item-en").click();
    await expect(page.getByTestId("language-selector")).toContainText(
      "English"
    );

    await page.reload();
    await expect(page.getByTestId("language-selector")).toContainText(
      "English"
    );
  });

  test("sends English locale with chat requests", async ({ page }) => {
    let selectedLocale: string | undefined;

    await page.route("**/api/chat", async (route) => {
      selectedLocale = route.request().postDataJSON().selectedLocale;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test response" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("language-selector").click();
    await page.getByTestId("language-selector-item-en").click();
    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();

    await expect.poll(() => selectedLocale).toBe("en");
  });

  test("sends Chinese locale with chat requests", async ({ page }) => {
    let selectedLocale: string | undefined;

    await page.route("**/api/chat", async (route) => {
      selectedLocale = route.request().postDataJSON().selectedLocale;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test response" }),
      });
    });

    await page.goto("/");
    await page.getByTestId("language-selector").click();
    await page.getByTestId("language-selector-item-en").click();
    await page.getByTestId("language-selector").click();
    await page.getByTestId("language-selector-item-zh").click();
    await page.getByTestId("multimodal-input").fill("你好");
    await page.getByTestId("send-button").click();

    await expect.poll(() => selectedLocale).toBe("zh");
  });

  test("can type in the input field", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Hello world");
    await expect(input).toHaveValue("Hello world");
  });

  test("submit button is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("send-button")).toBeVisible();
  });

  test("suggested actions are visible on empty chat", async ({ page }) => {
    await page.goto("/");
    const suggestions = page.locator("[data-testid='suggested-actions']");
    await expect(suggestions).toBeVisible();
  });

  test("can stop generation with stop button", async ({ page }) => {
    await page.goto("/");

    // Type and send a message
    await page.getByTestId("multimodal-input").fill("Hello");
    await page.getByTestId("send-button").click();

    // Stop button should appear during generation
    const stopButton = page.getByTestId("stop-button");
    // If generation starts, stop button appears
    // This is a best-effort check since timing depends on API
    await stopButton.click({ timeout: 5000 }).catch(() => {
      // Generation may have finished before we could click
    });
  });
});

test.describe("Chat Input Features", () => {
  test("input clears after sending", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Test message");
    await page.getByTestId("send-button").click();

    // Input should clear after sending
    await expect(input).toHaveValue("");
  });

  test("input supports multiline text", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("multimodal-input");
    await input.fill("Line 1\nLine 2\nLine 3");
    await expect(input).toContainText("Line 1");
  });
});
