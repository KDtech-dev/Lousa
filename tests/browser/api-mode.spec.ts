import { expect, test } from "@playwright/test";

test("modo API usa sessão e dados do servidor sem carregar dados locais", async ({
  page,
}) => {
  test.skip(process.env.VITE_LOUSA_MODE !== "api", "Requer VITE_LOUSA_MODE=api");

  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        data: {
          teacher: {
            id: "teacher-1",
            name: "Ana Professora",
            email: "ana@example.com",
            role: "teacher",
          },
        },
      },
    }),
  );
  await page.route("**/api/dashboard", (route) =>
    route.fulfill({
      json: {
        data: {
          teacher: {
            id: "teacher-1",
            name: "Ana Professora",
            email: "ana@example.com",
            role: "teacher",
          },
          assessments: [],
          applications: [],
          attempts: [],
          materials: [],
        },
      },
    }),
  );
  await page.route("**/api/activities", (route) =>
    route.fulfill({ json: { data: [] } }),
  );

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.getByText("Ana Professora", { exact: false })).toBeVisible();
  await expect(page.getByText("Marina Costa", { exact: true })).toHaveCount(0);

  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Avaliações", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Comece com sua primeira avaliação",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Ecologia e sustentabilidade", { exact: true })).toHaveCount(0);
});

test("modo API recusa um usuário que o backend não identifica como professor", async ({
  page,
}) => {
  test.skip(process.env.VITE_LOUSA_MODE !== "api", "Requer VITE_LOUSA_MODE=api");

  await page.route("**/api/auth/login", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        data: {
          teacher: {
            id: "student-1",
            name: "Aluno",
            email: "aluno@example.com",
            role: "student",
          },
        },
      },
    }),
  );

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("aluno@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Esta conta não tem perfil de professor",
  );
  await expect(page.locator(".sidebar")).toHaveCount(0);
});

test("modo API sem contrato de login informa a configuração pendente sem autenticar localmente", async ({
  page,
}) => {
  test.skip(
    process.env.VITE_LOUSA_MODE !== "api" ||
      Boolean(process.env.VITE_LOUSA_API_LOGIN_PATH),
    "Requer modo API sem caminho de login configurado",
  );

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-de-teste");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  await expect(page.getByRole("alert")).not.toContainText(
    /VITE_LOUSA_|Laravel|backend/i,
  );
  await expect(page.locator(".sidebar")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("ao.teacher.session")),
  ).toBeNull();
});
