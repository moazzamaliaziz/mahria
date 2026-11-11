import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { AdminMenuItem, StoreSettings } from "../../src/lib/admin-types";

test("real staff dashboard manages a COD order, menu and settings", async ({
  page,
  context,
  isMobile,
}, testInfo) => {
  test.skip(
    !process.env.TEST_FIXTURE_PATH || isMobile,
    "Opt-in isolated MySQL fixture, desktop workflow only",
  );
  test.setTimeout(180000);
  const fixture = JSON.parse(
    await readFile(process.env.TEST_FIXTURE_PATH!, "utf8"),
  ) as { adminCookie: string; csrfToken: string };
  const origin = "http://127.0.0.1:3001";
  const separator = fixture.adminCookie.indexOf("=");
  await context.addCookies([
    {
      name: fixture.adminCookie.slice(0, separator),
      value: fixture.adminCookie.slice(separator + 1),
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const headers = { Origin: origin, "X-CSRF-Token": fixture.csrfToken };
  const beforeResponse = await context.request.get(
    `${origin}/api/admin/settings`,
  );
  expect(beforeResponse.ok()).toBe(true);
  const before = (await beforeResponse.json()).settings as StoreSettings;
  const menuResponse = await context.request.get(`${origin}/api/admin/menu`);
  const menu = (await menuResponse.json()).items as AdminMenuItem[];
  const item = menu.find((product) => product.available && product.approved)!;
  expect(item).toBeTruthy();
  try {
    const enabled = await context.request.patch(
      `${origin}/api/admin/settings`,
      { headers, data: { ...before, orderingEnabled: true } },
    );
    expect(enabled.ok()).toBe(true);
    const phone = `0300${String(Date.now()).slice(-7)}`;
    const orderResponse = await context.request.post(`${origin}/api/orders`, {
      headers: { Origin: origin },
      data: {
        idempotencyKey: randomUUID(),
        customerName: "Browser Test Customer",
        phone,
        fulfillment: "pickup",
        paymentMethod: "cod",
        items: [{ itemId: item.id, quantity: 1 }],
        expectedTotalPaisa: item.pricePaisa,
      },
    });
    expect(orderResponse.status()).toBe(201);
    const { reference } = (await orderResponse.json()).order;
    await page.goto(`${origin}/admin/orders`);
    await expect(
      page.getByRole("heading", { name: "The order board" }),
    ).toBeVisible();
    await page.getByRole("textbox", { name: "Search orders" }).fill(reference);
    await page
      .getByRole("button", { name: `View order ${reference}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Confirm order", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Start preparing", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Mark as ready", exact: true })
      .click();
    const complete = dialog.getByRole("button", {
      name: "Cash received · complete order",
      exact: true,
    });
    await expect(complete).toBeDisabled();
    await dialog.getByRole("checkbox").check();
    await complete.click();
    await expect(
      dialog.getByText("Completed. Cash has been recorded."),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("completed-cod-order.png"),
    });
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Menu manager", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your menu" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit item", exact: true })
      .first()
      .click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("textbox", { name: "Name in Urdu", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText(
        "Menu item saved. The website will use the updated details on its next load.",
      ),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Store settings", exact: true })
      .click();
    await page.getByRole("switch", { name: "Accept new orders" }).uncheck();
    await page
      .getByRole("textbox", { name: /^Delivery fee \(PKR\)/ })
      .fill("12.50");
    await page
      .getByRole("button", { name: "Save store settings", exact: true })
      .click();
    await expect(
      page.getByText(
        "Settings saved. New checkouts use these settings immediately.",
      ),
    ).toBeVisible();
    const saved = (
      await (await context.request.get(`${origin}/api/admin/settings`)).json()
    ).settings;
    expect(saved.orderingEnabled).toBe(false);
    expect(saved.deliveryFeePaisa).toBe(1250);
    await page
      .getByRole("link", { name: "Getting started", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Install the admin app." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Switch to Urdu" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  } finally {
    const current = (
      await (await context.request.get(`${origin}/api/admin/settings`)).json()
    ).settings as StoreSettings;
    await context.request.patch(`${origin}/api/admin/settings`, {
      headers,
      data: { ...before, orderingEnabled: false, version: current.version },
    });
  }
});
