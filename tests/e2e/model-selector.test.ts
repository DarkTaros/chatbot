import { expect, type Page, test } from "@playwright/test";

async function mockModels(page: Page) {
  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        capabilities: {
          "openai/gpt-4o-mini": {
            reasoning: false,
            tools: false,
            vision: true,
          },
          "mistral/mistral-small-latest": {
            reasoning: false,
            tools: false,
            vision: false,
          },
        },
        defaultModel: "openai/gpt-4o-mini",
        models: [
          {
            description: "Fast default chat model",
            iconUrl: "https://models.dev/logos/openai.svg",
            id: "openai/gpt-4o-mini",
            mode: "Chat",
            name: "GPT-4o Mini",
            provider: "openai",
            visibleInWeb: true,
          },
          {
            description: "Lightweight completion-oriented model",
            iconUrl: "https://models.dev/logos/mistral.svg",
            id: "mistral/mistral-small-latest",
            mode: "Completion",
            name: "Mistral Small",
            provider: "mistral",
            visibleInWeb: true,
          },
        ],
      }),
    });
  });
}

const MODEL_BUTTON_REGEX = /Mistral|GPT/i;

test.describe("Model Selector", () => {
  test.beforeEach(async ({ page }) => {
    await mockModels(page);
    await page.goto("/");
  });

  test("displays a model button", async ({ page }) => {
    const modelButton = page
      .locator("button")
      .filter({ hasText: MODEL_BUTTON_REGEX })
      .first();
    await expect(modelButton).toBeVisible();
  });

  test("opens model selector popover on click", async ({ page }) => {
    const modelButton = page
      .locator("button")
      .filter({ hasText: MODEL_BUTTON_REGEX })
      .first();
    await modelButton.click();

    await expect(page.getByPlaceholder("Search models...")).toBeVisible();
    await expect(page.getByText("Channels")).toBeVisible();
  });

  test("can search for models", async ({ page }) => {
    const modelButton = page
      .locator("button")
      .filter({ hasText: MODEL_BUTTON_REGEX })
      .first();
    await modelButton.click();

    const searchInput = page.getByPlaceholder("Search models...");
    await searchInput.fill("Mistral");

    await expect(page.getByText("Mistral Small").first()).toBeVisible();
  });

  test("can close model selector by clicking outside", async ({ page }) => {
    const modelButton = page
      .locator("button")
      .filter({ hasText: MODEL_BUTTON_REGEX })
      .first();
    await modelButton.click();

    await expect(page.getByPlaceholder("Search models...")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByPlaceholder("Search models...")).not.toBeVisible();
  });

  test("shows model provider groups", async ({ page }) => {
    const modelButton = page
      .locator("button")
      .filter({ hasText: MODEL_BUTTON_REGEX })
      .first();
    await modelButton.click();

    await expect(page.getByText("Channels")).toBeVisible();
    await expect(page.getByText("Mistral")).toBeVisible();
    await expect(page.getByText("OpenAI")).toBeVisible();
  });

  test("can select a model from a provider", async ({ page }) => {
    const modelButton = page
      .locator("button")
      .filter({ hasText: MODEL_BUTTON_REGEX })
      .first();
    await modelButton.click();

    await page.getByText("Mistral").first().click();
    await page.getByText("Mistral Small").first().click();

    await expect(page.getByPlaceholder("Search models...")).not.toBeVisible();

    await expect(
      page.locator("button").filter({ hasText: "Mistral Small" }).first()
    ).toBeVisible();
  });
});
