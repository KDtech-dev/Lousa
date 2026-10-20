import { expect, test, type Page } from "@playwright/test";

const draftKey = "lousa.teacher.correction-draft.v1.attempt-a10002";
const databaseKey = "avaliacoes-online.demo.v1";

async function openCorrection(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.goto("/resultados?attempt=attempt-a10002");
  await expect(
    page.getByRole("heading", { name: "João Santos", exact: true }),
  ).toBeVisible();
}

test("rascunho da correção volta após recarga e saída confirmada sem publicar notas", async ({
  page,
}) => {
  await openCorrection(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Nota atribuída").fill("4");
  await page
    .getByLabel("Feedback para o aluno")
    .fill("Detalhe os benefícios da reciclagem.");
  await expect(
    page.getByText("Rascunho salvo automaticamente neste navegador.", {
      exact: false,
    }),
  ).toBeVisible();
  const official = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    return state.database.attempts.find(
      (attempt: { id: string }) => attempt.id === "attempt-a10002",
    );
  }, databaseKey);
  expect(official.feedback).toBe("");
  expect(official.correctionStatus).toBe("pending");
  expect(official.resultsReleased).toBe(false);

  await page.reload();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("4");
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Detalhe os benefícios da reciclagem.",
  );
  await expect(
    page.getByText("Rascunho local restaurado.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voltar para resultados", exact: true })
    .click();
  let leave = page.getByRole("dialog", {
    name: "Sair com alterações pendentes?",
  });
  await expect(leave).toBeVisible();
  await leave
    .getByRole("button", { name: "Continuar editando", exact: true })
    .click();
  await expect(page).toHaveURL(/attempt=attempt-a10002/);
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Detalhe os benefícios da reciclagem.",
  );
  await page
    .getByRole("button", { name: "Voltar para resultados", exact: true })
    .click();
  leave = page.getByRole("dialog", { name: "Sair com alterações pendentes?" });
  await leave
    .getByRole("button", { name: "Sair da página", exact: true })
    .click();
  await expect(page).toHaveURL(/\/resultados$/);
  await page
    .getByRole("button", { name: /Abrir respostas de João Santos/ })
    .click();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("4");
  await page
    .getByRole("button", { name: "Salvar correção", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Correção salva");
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), draftKey))
    .toBeNull();
  await page.reload();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("4");
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Detalhe os benefícios da reciclagem.",
  );
  await expect(
    page.getByText("Rascunho local restaurado.", { exact: false }),
  ).toHaveCount(0);
});

test("descartar rascunho exige confirmação e restaura a correção oficial", async ({
  page,
}) => {
  await openCorrection(page);
  await page.getByLabel("Nota atribuída").fill("3");
  await page
    .getByLabel("Feedback para o aluno")
    .fill("Comentário ainda em revisão.");
  await page
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  let discard = page.getByRole("dialog", {
    name: "Descartar rascunho da correção?",
  });
  await discard
    .getByRole("button", { name: "Continuar editando", exact: true })
    .click();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("3");
  await page
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  discard = page.getByRole("dialog", {
    name: "Descartar rascunho da correção?",
  });
  await discard
    .getByRole("button", { name: "Descartar rascunho", exact: true })
    .click();
  await expect(discard).not.toBeVisible();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("");
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue("");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), draftKey),
  ).toBeNull();
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Avaliações", exact: true })
    .click();
  await expect(page).toHaveURL(/\/avaliacoes$/);
  await expect(
    page.getByRole("dialog", { name: "Sair com alterações pendentes?" }),
  ).toHaveCount(0);
});

test("falha do armazenamento do rascunho preserva edição e aviso ao sair", async ({
  page,
}) => {
  await openCorrection(page);
  await page.evaluate(() => {
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("lousa.teacher.correction-draft.")) {
        throw new DOMException(
          "Armazenamento indisponível",
          "QuotaExceededError",
        );
      }
      save.call(this, key, value);
    };
  });
  await page.getByLabel("Nota atribuída").fill("5");
  await page
    .getByLabel("Feedback para o aluno")
    .fill("Alterações protegidas na página.");
  await expect(page.getByRole("alert")).toContainText(
    "não conseguiu salvar o rascunho local",
  );
  await page
    .locator(".sidebar")
    .getByRole("link", { name: "Avaliações", exact: true })
    .click();
  const leave = page.getByRole("dialog", {
    name: "Sair com alterações pendentes?",
  });
  await leave
    .getByRole("button", { name: "Continuar editando", exact: true })
    .click();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("5");
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Alterações protegidas na página.",
  );
  await page
    .getByRole("button", { name: "Salvar correção", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Correção salva");
  await page.reload();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("5");
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Alterações protegidas na página.",
  );
});

test("rascunho antigo não substitui uma correção oficial que foi alterada", async ({
  page,
}) => {
  await openCorrection(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Nota atribuída").fill("1");
  await page.getByLabel("Feedback para o aluno").fill("Rascunho antigo.");
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), draftKey))
    .not.toBeNull();
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    const attempt = state.database.attempts.find(
      (item: { id: string }) => item.id === "attempt-a10002",
    );
    attempt.answers["bio-q3"].pointsAwarded = 4;
    attempt.feedback = "Correção mais recente.";
    attempt.correctionStatus = "graded";
    attempt.score = 9;
    localStorage.setItem(key, JSON.stringify(state));
  }, databaseKey);
  await page.reload();
  await expect(page.getByLabel("Nota atribuída")).toHaveValue("4");
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Correção mais recente.",
  );
  await expect(page.getByRole("alert")).toContainText(
    "rascunho anterior não foi restaurado",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), draftKey),
  ).toBeNull();
});

test("campos ficam protegidos enquanto a correção está sendo salva", async ({
  page,
}) => {
  await openCorrection(page);
  await page.getByLabel("Nota atribuída").fill("4");
  await page
    .getByLabel("Feedback para o aluno")
    .fill("Comentário confirmado no salvamento.");
  await page.evaluate(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) =>
      schedule(
        handler,
        delay === 40 ? 1_200 : delay,
        ...args,
      )) as typeof window.setTimeout;
  });
  await page
    .getByRole("button", { name: "Salvar correção", exact: true })
    .click();
  await expect(page.getByLabel("Nota atribuída")).toBeDisabled();
  await expect(page.getByLabel("Feedback para o aluno")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Voltar para resultados", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Correção salva");
  await expect(page.getByLabel("Feedback para o aluno")).toBeEnabled();
  await expect(page.getByLabel("Feedback para o aluno")).toHaveValue(
    "Comentário confirmado no salvamento.",
  );
});
