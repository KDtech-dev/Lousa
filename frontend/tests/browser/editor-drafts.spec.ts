import { expect, test, type Page } from "@playwright/test";

const databaseKey = "avaliacoes-online.demo.v1";
const newDraftKey = "lousa.teacher.assessment-draft.v1.new";
const savedDraftKey = "lousa.teacher.assessment-draft.v1.assessment-bio";

async function openEditor(page: Page, existing = false) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.goto(existing ? "/avaliacoes/assessment-bio" : "/avaliacoes/nova");
  await expect(
    page.getByRole("heading", {
      name: existing ? "Editar avaliação" : "Nova avaliação",
      exact: true,
    }),
  ).toBeVisible();
}

async function completeNew(page: Page) {
  await page.getByLabel("Título").fill("Avaliação em preparação");
  await page.getByLabel("Disciplina").fill("Ciências");
  const question = page.locator(".question-editor").first();
  await question.getByLabel("Tipo de questão").selectOption("open");
  await question
    .getByLabel("Enunciado")
    .fill("Explique o que observou durante a atividade.");
}

test("rascunho de avaliação nova sobrevive à recarga e à saída confirmada sem criar avaliação", async ({
  page,
}) => {
  await openEditor(page);
  page.on("dialog", (dialog) => dialog.accept());
  await completeNew(page);
  await expect(
    page.getByText("Rascunho salvo automaticamente neste navegador.", {
      exact: false,
    }),
  ).toBeVisible();
  const count = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).database.assessments.length,
    databaseKey,
  );
  await page.reload();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Avaliação em preparação",
  );
  await expect(page.getByLabel("Enunciado")).toHaveValue(
    "Explique o que observou durante a atividade.",
  );
  await expect(
    page.getByText("Seu rascunho foi recuperado.", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Materiais", exact: true })
    .click();
  const leave = page.getByRole("dialog", {
    name: "Sair com alterações pendentes?",
  });
  await expect(
    leave.getByRole("button", { name: "Continuar editando" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(leave).not.toBeVisible();
  await expect(page).toHaveURL(/\/avaliacoes\/nova$/);
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Avaliações", exact: true })
    .click();
  await leave.getByRole("button", { name: "Sair da página" }).click();
  await expect(page).toHaveURL(/\/avaliacoes$/);
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)!).database.assessments.length,
      databaseKey,
    ),
  ).toBe(count);
  await page.getByRole("link", { name: "Nova avaliação", exact: true }).click();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Avaliação em preparação",
  );
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page).toHaveURL(/\/avaliacoes\/assessment-/);
  await expect(page.getByRole("status")).toContainText(
    "Avaliação criada e salva neste navegador",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), newDraftKey),
  ).toBeNull();
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Materiais", exact: true })
    .click();
  await expect(page).toHaveURL(/\/materiais$/);
  await expect(leave).toHaveCount(0);
});

test("descartar rascunho preserva a avaliação oficial e a cópia publicada", async ({
  page,
}) => {
  await openEditor(page, true);
  await page.getByLabel("Título").fill("Título ainda não confirmado");
  await page
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  const discard = page.getByRole("dialog", {
    name: "Descartar rascunho?",
    exact: true,
  });
  await discard.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Título ainda não confirmado",
  );
  await page
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  await discard
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Ecologia e sustentabilidade",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), savedDraftKey),
  ).toBeNull();
  await page
    .getByLabel("Título")
    .fill("Título confirmado na avaliação reutilizável");
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Atividade salva neste dispositivo",
  );
  const titles = await page.evaluate((key) => {
    const database = JSON.parse(localStorage.getItem(key)!).database;
    return {
      assessment: database.assessments.find(
        (item: { id: string }) => item.id === "assessment-bio",
      ).title,
      application: database.applications.find(
        (item: { code: string }) => item.code === "BIO101",
      ).snapshot.title,
    };
  }, databaseKey);
  expect(titles).toEqual({
    assessment: "Título confirmado na avaliação reutilizável",
    application: "Ecologia e sustentabilidade",
  });
});

test("erro local mantém o conteúdo e protege a saída; salvar continua possível", async ({
  page,
}) => {
  await openEditor(page, true);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("lousa.teacher.assessment-draft."))
        throw new DOMException("Sem espaço", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.getByLabel("Título").fill("Avaliação protegida na página");
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível salvar o rascunho",
  );
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Avaliações", exact: true })
    .click();
  const leave = page.getByRole("dialog", {
    name: "Sair com alterações pendentes?",
  });
  await expect(leave).toContainText("rascunho local pode estar indisponível");
  await leave.getByRole("button", { name: "Continuar editando" }).click();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Avaliação protegida na página",
  );
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Atividade salva neste dispositivo",
  );
  await page.reload();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Avaliação protegida na página",
  );
});

test("rascunho de versão anterior exige escolha antes de recuperar", async ({
  page,
}) => {
  await openEditor(page, true);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Título").fill("Rascunho anterior");
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), savedDraftKey),
    )
    .not.toBeNull();
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    const assessment = state.database.assessments.find(
      (item: { id: string }) => item.id === "assessment-bio",
    );
    assessment.title = "Versão mais recente confirmada";
    assessment.updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(state));
  }, databaseKey);
  await page.reload();
  await expect(
    page.getByText("Existe um rascunho de uma versão anterior.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Versão mais recente confirmada",
  );
  await expect(page.getByLabel("Título")).toBeDisabled();
  await page
    .getByRole("button", { name: "Recuperar rascunho", exact: true })
    .click();
  await expect(page.getByLabel("Título")).toHaveValue("Rascunho anterior");
  await expect(page.getByLabel("Título")).toBeEnabled();
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Atividade salva neste dispositivo",
  );
  await page.reload();
  await expect(page.getByLabel("Título")).toHaveValue("Rascunho anterior");
});

test("validação associa os erros e foca o primeiro campo que precisa de correção", async ({
  page,
}) => {
  await openEditor(page);
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByLabel("Título")).toBeFocused();
  await expect(page.getByLabel("Título")).toHaveAttribute(
    "aria-describedby",
    "title-error",
  );
  await page.getByLabel("Título").fill("Avaliação acessível");
  await page.getByLabel("Disciplina").fill("Ciências");
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  const prompt = page.getByLabel("Enunciado");
  await expect(prompt).toBeFocused();
  await expect(prompt).toHaveAttribute("aria-invalid", "true");
  await expect(prompt).toHaveAccessibleDescription(
    "Escreva o enunciado desta questão.",
  );
  await prompt.fill("Escolha uma alternativa.");
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  const firstOption = page.getByRole("textbox", {
    name: "Texto da alternativa 1 da questão 1",
    exact: true,
  });
  await expect(firstOption).toBeFocused();
  await expect(firstOption).toHaveAccessibleDescription(
    "Preencha todas as alternativas. São necessárias pelo menos duas.",
  );
});

test("conteúdo fica protegido durante salvamento para evitar sobrescrita", async ({
  page,
}) => {
  await openEditor(page, true);
  await page.getByLabel("Título").fill("Título confirmado sem sobrescrita");
  await page.evaluate(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) =>
      schedule(
        handler,
        delay === 40 ? 1200 : delay,
        ...args,
      )) as typeof window.setTimeout;
  });
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByLabel("Título")).toBeDisabled();
  await expect(page.getByLabel("Pontuação").first()).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Adicionar questão", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(
    "Atividade salva neste dispositivo",
  );
  await expect(page.getByLabel("Título")).toBeEnabled();
  await expect(page.getByLabel("Título")).toHaveValue(
    "Título confirmado sem sobrescrita",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), savedDraftKey),
  ).toBeNull();
});
