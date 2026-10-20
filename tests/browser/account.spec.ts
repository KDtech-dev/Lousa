import { expect, test } from "@playwright/test";

test("cadastro demonstrativo valida campos, salva só o perfil e permite editar com proteção ao sair", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Criar perfil demonstrativo" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await page
    .getByRole("button", { name: "Criar perfil demonstrativo" })
    .click();
  await expect(page.getByLabel("Nome completo", { exact: true })).toBeFocused();
  await expect(
    page.getByText("Preencha nome completo.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Clara Oliveira");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("clara@exemplo.com");
  await page.getByLabel("Disciplina", { exact: true }).fill("Matemática");
  await page.getByLabel("Instituição", { exact: true }).fill("Escola Exemplo");
  await page
    .getByLabel("Senha demonstrativa", { exact: true })
    .fill("senha-ficticia-123");
  await page
    .getByLabel("Confirmar senha demonstrativa", { exact: true })
    .fill("outra-senha");
  await page
    .getByRole("button", { name: "Criar perfil demonstrativo" })
    .click();
  await expect(
    page.getByLabel("Confirmar senha demonstrativa", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Repita a mesma senha fictícia.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Confirmar senha demonstrativa", { exact: true })
    .fill("senha-ficticia-123");
  await page
    .getByRole("button", { name: "Criar perfil demonstrativo" })
    .click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.locator(".mg-profile-identity")).toContainText(
    "Clara Oliveira",
  );
  await expect(page.locator(".profile-text")).toContainText("Clara Oliveira");
  const stored = await page.evaluate(() =>
    JSON.stringify(Object.entries(localStorage)),
  );
  expect(stored).not.toContain("senha-ficticia-123");
  expect(stored).not.toContain("outra-senha");
  expect(stored).toContain("clara@exemplo.com");
  await expect(page.locator(".mg-profile-fields")).toContainText(
    "Escola Exemplo",
  );
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await expect(page.getByLabel("Nome completo", { exact: true })).toBeFocused();
  await page.getByLabel("Nome completo", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(
    page.getByText("Preencha nome completo.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Nome completo", { exact: true }).fill("Clara Souza");
  await page.getByLabel("Disciplina", { exact: true }).fill("Ciências");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Perfil demonstrativo salvo neste navegador.",
  );
  await expect(page.locator(".profile-text")).toContainText("Clara Souza");
  await page.reload();
  await expect(page.locator(".mg-profile-identity")).toContainText(
    "Clara Souza",
  );
  await expect(page.locator(".mg-profile-identity")).toContainText("Ciências");
  await page
    .getByRole("button", { name: "Editar perfil", exact: true })
    .click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Rascunho não confirmado");
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Avaliações", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Sair com alterações pendentes?",
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue(
    "Rascunho não confirmado",
  );
  await page.getByRole("button", { name: "Sair da demonstração" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Continuar editando" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("ao.teacher.session")),
  ).toBe("demo");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".mg-profile-identity")).toContainText(
    "Clara Souza",
  );
  await page.getByRole("button", { name: "Sair da demonstração" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Entrar na demonstração" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("ao.teacher.session")),
  ).toBeNull();
});

test("recuperação demonstra confirmação sem armazenar e-mail ou alterar senha", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("link", { name: "Recuperar acesso", exact: true })
    .click();
  await page.getByRole("button", { name: "Simular recuperação" }).click();
  await expect(
    page.getByLabel("E-mail demonstrativo", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Informe um e-mail fictício válido.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("E-mail demonstrativo", { exact: true })
    .fill("recuperacao@exemplo.com");
  const before = await page.evaluate(() =>
    JSON.stringify(Object.entries(localStorage)),
  );
  await page.getByRole("button", { name: "Simular recuperação" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Nenhum e-mail foi enviado e nenhuma senha foi alterada.",
  );
  await expect(page.getByRole("status")).toBeFocused();
  expect(
    await page.evaluate(() => JSON.stringify(Object.entries(localStorage))),
  ).toBe(before);
  await page.getByRole("button", { name: "Experimentar novamente" }).click();
  await expect(
    page.getByLabel("E-mail demonstrativo", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("link", { name: "Voltar para entrar", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});

test("redefinição demonstrativa valida e descarta senhas sem alterar dados armazenados", async ({
  page,
}) => {
  await page.goto("/recuperar-acesso");
  await page
    .getByLabel("E-mail demonstrativo", { exact: true })
    .fill("redefinicao@exemplo.com");
  const before = await page.evaluate(() =>
    JSON.stringify(Object.entries(localStorage)),
  );
  await page.getByRole("button", { name: "Simular recuperação" }).click();
  await page
    .getByRole("button", { name: "Testar redefinição de senha" })
    .click();
  await expect(
    page.getByLabel("Nova senha demonstrativa", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Nova senha demonstrativa", { exact: true })
    .fill("curta");
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill("curta");
  await page.getByRole("button", { name: "Simular redefinição" }).click();
  await expect(
    page.getByLabel("Nova senha demonstrativa", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Use uma senha fictícia com pelo menos 8 caracteres.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Nova senha demonstrativa", { exact: true })
    .fill("nova-ficticia-123");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("outra-ficticia-123");
  await page.getByRole("button", { name: "Simular redefinição" }).click();
  await expect(
    page.getByLabel("Confirmar nova senha", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Repita a mesma senha fictícia.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("nova-ficticia-123");
  await page.getByRole("button", { name: "Simular redefinição" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Redefinição demonstrativa concluída.",
  );
  await expect(page.getByRole("status")).toContainText(
    "Nenhuma senha real foi alterada.",
  );
  await expect(page.getByRole("status")).toBeFocused();
  expect(
    await page.evaluate(() => JSON.stringify(Object.entries(localStorage))),
  ).toBe(before);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Experimentar novamente" }).click();
  await expect(
    page.getByLabel("E-mail demonstrativo", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("E-mail demonstrativo", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("E-mail demonstrativo", { exact: true })
    .fill("redefinicao@exemplo.com");
  await page.getByRole("button", { name: "Simular recuperação" }).click();
  await page
    .getByRole("button", { name: "Testar redefinição de senha" })
    .click();
  await expect(
    page.getByLabel("Nova senha demonstrativa", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Confirmar nova senha", { exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("link", { name: "Voltar para entrar", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});
