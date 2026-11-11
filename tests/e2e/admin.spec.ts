import { expect, test } from "@playwright/test";

test("admin is protected and sign-in supports English and Urdu", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to Urdu" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "خوش آمدید۔" })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ur");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("admin-login-urdu.png"),
    fullPage: true,
  });
});

test("read-only dashboard, order detail and responsive RTL work", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/admin/preview");
  await expect(
    page.getByRole("heading", { name: "Good food. Smooth service." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Read-only demo. These are sample orders, not real customers or sales.",
    ),
  ).toBeVisible();
  await expect(page.locator(".admin-order-table tbody tr")).toHaveCount(4);
  await page
    .getByRole("button", { name: "View order DEMO-1001", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "This is a read-only sample. Set up your store to manage real orders.",
      ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm order", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("heading", { name: "Good food. Smooth service." }).click();
  await page.evaluate(() => { document.querySelector(".admin-order-table")?.scrollTo(0, 0); window.scrollTo({ top: 0, behavior: "instant" }); });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("admin-dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to Urdu" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "اچھا کھانا، بہترین خدمت۔" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("admin-dashboard-urdu.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("only admin installs a PWA and offline stores no order data", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await page.goto("/admin/preview");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/admin/manifest.webmanifest",
  );
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(scope).toBe(new URL("/admin/", page.url()).href);
  const cachedUrls = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith("mehria-admin-shell-"),
    );
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await caches.open(name)).keys()).map(
            (request) => new URL(request.url).pathname,
          ),
        ),
      )
    ).flat();
  });
  expect(cachedUrls).toEqual(["/admin/offline.html"]);
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Back when you are online." }),
    ).toBeVisible();
    await expect(
      page.getByText("You cannot receive or process orders offline."),
    ).toBeVisible();
    await expect(page.locator(".admin-order-table")).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller),
  ).toBeNull();
});

test("three new public pages support Urdu without customer PWA", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const path of ["/our-story", "/contact", "/faqs"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Switch to Urdu" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
