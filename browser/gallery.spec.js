const { test, expect } = require("@playwright/test");

test("event gallery loads its own photos and offers photo actions on mobile", async ({ page }) => {
  const requestedTags = [];
  await page.route("**/api/gallery?**", async (route) => {
    const url = new URL(route.request().url());
    requestedTags.push(url.searchParams.get("tag"));
    const resources = url.searchParams.get("tag") === "birthday-2026"
      ? [
          { secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", capture_id: "capture-one" },
          { secure_url: "https://res.cloudinary.com/demo/image/upload/sample2.jpg", capture_id: "capture-two" },
        ]
      : [{ secure_url: "https://res.cloudinary.com/demo/image/upload/other.jpg", capture_id: "other-event" }];
    await route.fulfill({ json: { resources } });
  });

  await page.addInitScript(() => {
    window.__shared = [];
    navigator.share = async (payload) => window.__shared.push(payload);
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gallery.html?tag=birthday-2026&legacyTag=other-event&title=Birthday");

  await expect(page.getByRole("heading", { name: "Birthday" })).toBeVisible();
  await expect(page.locator(".card")).toHaveCount(3);
  expect(requestedTags).toEqual(["birthday-2026", "other-event"]);
  await page.locator(".card").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute("href", /sample\.jpg$/);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__shared[0] && window.__shared[0].url)).toContain("/share/capture-one");
  await expect(page.locator("#viewerCount")).toHaveText("1 of 3");
});

test("event gallery displays an intentional empty state", async ({ page }) => {
  await page.route("**/api/gallery?**", (route) => route.fulfill({ json: { resources: [] } }));
  await page.goto("/gallery.html?tag=empty-event&title=Quiet%20Gathering");
  await expect(page.getByText("Photos are on the way")).toBeVisible();
  await expect(page.locator(".skeleton")).toHaveCount(0);
});

test("event gallery offers a retry after an API failure", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/gallery?**", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({ json: { resources: [{ secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }] } });
  });
  await page.goto("/gallery.html?tag=retry-event");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".card")).toHaveCount(1);
});
