import { expect, test } from "@playwright/test";

test("homepage loads images, navigation and has no horizontal overflow", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Find your favourite" }),
  ).toBeVisible();
  await page.locator("#visit").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("heading", { name: "Mehria, G-11 Markaz" }),
  ).toBeVisible();
  await page.locator("#menu").scrollIntoViewIfNeeded();
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("homepage.png"),
    fullPage: true,
  });
  await page.screenshot({ path: testInfo.outputPath("hero.png") });
});

test("layouts fit narrow phones, tablets and wide desktops", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Desktop browser varies viewport sizes for this layout check",
  );
  await page.goto("/");
  for (const width of [320, 768, 1024, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow at ${width}px`,
    ).toBe(true);
  }
});

test("menu search, category filters, empty state and sorting work", async ({
  page,
}) => {
  await page.goto("/menu");
  await expect(page.locator(".product-card")).toHaveCount(6);
  await page
    .getByRole("button", { name: "Sides & sweets", exact: true })
    .click();
  await expect(page.locator(".product-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "All favourites", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search the menu" })
    .fill("biryani");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Search the menu" })
    .fill("not-a-real-dish");
  await expect(page.getByText("No match for that craving.")).toBeVisible();
  await page.getByRole("button", { name: "Show all favourites" }).click();
  await page
    .getByRole("combobox", { name: "Sort menu" })
    .selectOption("price-low");
  await expect(
    page.locator(".product-card").first().getByRole("heading"),
  ).toHaveText("Raita");
});

test("bag persists, supports quantity changes and prevents preview orders", async ({
  page,
}) => {
  await page.goto("/menu");
  await page
    .getByRole("button", {
      name: "Add Chicken Pulao with Shami to bag",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Open bag, 1 items", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Increase Chicken Pulao with Shami" })
    .click();
  await expect(dialog.locator(".total-line")).toContainText("Rs. 1,360");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Open bag, 2 items", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Continue to checkout" }).click();
  await expect(
    dialog.getByText("You're exploring a website preview"),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Direct ordering not enabled" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("radio", { name: /Delivery/ })).toBeDisabled();
  await dialog.getByRole("button", { name: "Back to your bag" }).click();
  await dialog
    .getByRole("button", { name: "Remove Chicken Pulao with Shami" })
    .click();
  await expect(
    dialog.getByText("Something delicious is missing."),
  ).toBeVisible();
});

test("preview API fails closed and informational routes load", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/menu");
  expect(response.ok()).toBe(true);
  const menu = await response.json();
  expect(menu.mode).toBe("preview");
  expect(menu.orderingEnabled).toBe(false);
  for (const path of ["/privacy", "/about-this-preview"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  const missing = await page.goto("/missing-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByText("This one's not")).toBeVisible();
});

test("mobile navigation links reach the menu", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only navigation");
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Our Menu" })
    .click();
  await expect(page).toHaveURL(/\/menu$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).not.toBeVisible();
});
