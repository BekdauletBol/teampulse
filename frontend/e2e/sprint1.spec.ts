import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Sprint 1, end to end, with two real users in two isolated browser contexts:
 *   A registers → creates a team → copies the invite link
 *   B registers via the invite link → joins
 *   A creates a task with a deadline, assigned to B
 *   B moves it to in progress (drag) and then to done (status select)
 *   both see it in the done column
 */

const run = Date.now().toString(36);
const A = { name: "Ava Owner", email: `ava-${run}@example.com`, password: "password123" };
const B = { name: "Ben Member", email: `ben-${run}@example.com`, password: "password123" };
const TEAM = `sprint one ${run}`;
const TASK = "write the intro section";

async function newUserPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

async function register(page: Page, user: typeof A) {
  await page.getByLabel("name").fill(user.name);
  await page.getByLabel("email").fill(user.email);
  await page.getByLabel("password").fill(user.password);
  await page.getByRole("button", { name: "create account" }).click();
}

/** Toasts stack, so match one by its text instead of asserting on the only status element. */
const toast = (page: Page, text: string | RegExp) => page.getByRole("status").filter({ hasText: text });

const column = (page: Page, label: "to do" | "in progress" | "done") => page.getByRole("region", { name: `${label} column` });
const cardIn = (page: Page, label: "to do" | "in progress" | "done") => column(page, label).locator("[data-rfd-draggable-id]", { hasText: TASK });

/** @hello-pangea/dnd needs a press, a nudge past its 5px threshold, then a few moves before release. */
async function dragCard(page: Page, card: ReturnType<Page["locator"]>, target: ReturnType<Page["locator"]>) {
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("drag: element not visible");
  const sx = from.x + from.width / 2;
  const sy = from.y + 16;
  const tx = to.x + to.width / 2;
  const ty = to.y + Math.min(to.height / 2, 140);
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(sx + 8, sy + 4, { steps: 3 });
  await page.waitForTimeout(150);
  await page.mouse.move(tx, ty, { steps: 16 });
  await page.waitForTimeout(250);
  await page.mouse.up();
}

test("sprint 1: team, invite, task, status flow", async ({ browser }) => {
  const a = await newUserPage(browser);
  const b = await newUserPage(browser);

  await test.step("A registers and lands on an empty teams page", async () => {
    await a.goto("/register");
    await register(a, A);
    await expect(a).toHaveURL(/\/teams$/);
    await expect(a.getByText("no teams yet")).toBeVisible();
  });

  await test.step("A creates a team", async () => {
    await a.getByRole("button", { name: "create your first team" }).click();
    await a.getByLabel("team name").fill(TEAM);
    await a.getByRole("button", { name: "create team" }).click();
    await expect(toast(a, `${TEAM} is ready`)).toBeVisible();
    await a.getByRole("link", { name: new RegExp(TEAM) }).click();
    await expect(a).toHaveURL(/\/teams\/\d+$/);
    await expect(a.getByRole("heading", { level: 1 })).toHaveText(TEAM);
  });

  let inviteUrl = "";
  await test.step("A copies the invite link", async () => {
    await a.getByRole("button", { name: "copy invite link" }).click();
    await expect(toast(a, "link copied")).toBeVisible();
    inviteUrl = await a.evaluate(() => navigator.clipboard.readText());
    expect(inviteUrl).toMatch(/\/join\/[A-Za-z0-9_-]{32,}$/);
  });

  await test.step("B opens the invite logged out, registers, and is returned to the invite", async () => {
    await b.goto(inviteUrl);
    await expect(b).toHaveURL(/\/login$/);
    await b.getByRole("link", { name: "make an account" }).click();
    await expect(b).toHaveURL(/\/register$/);
    await register(b, B);
    await expect(b).toHaveURL(/\/join\//);
    await expect(b.getByRole("heading", { level: 1 })).toContainText(`you're invited to ${TEAM}`);
  });

  await test.step("B joins and lands on the board", async () => {
    await b.getByRole("button", { name: `join ${TEAM}` }).click();
    await expect(b).toHaveURL(/\/teams\/\d+$/);
    await expect(b.getByRole("heading", { level: 1 })).toHaveText(TEAM);
    await expect(b.getByText("2 members")).toBeVisible();
  });

  await test.step("A creates a task with a deadline, assigned to B", async () => {
    await a.reload(); // pick up B as a member
    await expect(a.getByText("2 members")).toBeVisible();
    await a.getByRole("button", { name: "+ add task" }).click();
    const dialog = a.getByRole("dialog");
    await dialog.getByLabel("title").fill(TASK);
    await dialog.getByLabel("deadline").fill("2027-01-15");
    await dialog.getByRole("radio", { name: B.name }).click();
    await dialog.getByRole("button", { name: "add task" }).click();
    await expect(dialog).toBeHidden();
    const card = cardIn(a, "to do");
    await expect(card).toBeVisible();
    await expect(card.getByRole("img", { name: B.name })).toBeVisible(); // assignee initials
    await expect(card.getByText(/jan 15/)).toBeVisible(); // deadline chip
  });

  await test.step("B drags the task to in progress", async () => {
    await b.reload();
    const card = cardIn(b, "to do");
    await expect(card).toBeVisible();
    await dragCard(b, card, column(b, "in progress"));
    await expect(cardIn(b, "in progress")).toBeVisible();
    await expect(cardIn(b, "to do")).toHaveCount(0);
  });

  await test.step("B moves the task to done with the status select", async () => {
    await cardIn(b, "in progress").getByLabel("status").selectOption("done");
    await expect(cardIn(b, "done")).toBeVisible();
    await expect(cardIn(b, "in progress")).toHaveCount(0);
    await expect(b.getByRole("status").filter({ hasText: "🎉" })).toBeVisible(); // celebration toast
  });

  await test.step("both users see the task in done", async () => {
    await b.reload();
    await expect(cardIn(b, "done")).toBeVisible();
    await a.reload();
    await expect(cardIn(a, "done")).toBeVisible();
    await expect(column(a, "done").getByLabel(/tasks$/)).toHaveText("1");
    await expect(a.getByText("0 open")).toBeVisible();
  });
});
