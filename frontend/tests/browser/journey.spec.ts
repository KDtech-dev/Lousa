import { expect, test } from "@playwright/test";

test("professor cria e publica; aluno responde; professor corrige e libera a mesma tentativa", async ({
  page,
  context,
}) => {
  const title = "Ciclo da água · percurso completo";
  const objectivePrompt = "A evaporação transforma água líquida em vapor.";
  const openPrompt =
    "Explique como a água retorna à superfície após a evaporação.";
  const studentName = "Ana Percurso";
  const answer =
    "O vapor condensa em nuvens e a água volta à superfície por precipitação.";
  const feedback =
    "Boa explicação sobre condensação e precipitação. Continue relacionando as etapas do ciclo.";

  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(
    page.getByRole("heading", { name: /Marina/, level: 1 }),
  ).toBeVisible();
  await page.goto("/avaliacoes/nova");
  await expect(
    page.getByRole("heading", { name: "Nova avaliação", exact: true }),
  ).toBeVisible();
  await page.getByLabel(/^Título/).fill(title);
  await page.getByLabel(/^Disciplina/).fill("Ciências");
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Atividade de revisão sobre as etapas do ciclo da água.");
  await page
    .getByLabel("Instruções para o aluno")
    .fill("Leia com atenção e explique o raciocínio na resposta aberta.");

  const objective = page.locator(".question-editor").nth(0);
  await objective.getByLabel("Tipo de questão").selectOption("boolean");
  await objective.getByLabel("Pontuação").fill("4");
  await objective.getByLabel(/^Enunciado/).fill(objectivePrompt);
  await objective
    .getByRole("radio", { name: "Verdadeiro", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Adicionar questão", exact: true })
    .click();
  const open = page.locator(".question-editor").nth(1);
  await open.getByLabel("Tipo de questão").selectOption("open");
  await open.getByLabel("Pontuação").fill("6");
  await open.getByLabel(/^Enunciado/).fill(openPrompt);
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Editar avaliação", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Avaliação criada e salva",
  );
  const sourceURL = page.url();

  await page
    .getByRole("link", { name: "Ir para aplicações", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nova aplicação", exact: true })
    .click();
  const applicationDialog = page.getByRole("dialog", {
    name: "Nova aplicação",
  });
  await applicationDialog
    .getByRole("combobox", { name: "Avaliação", exact: true })
    .selectOption({ label: `${title} · Ciências` });
  await applicationDialog.getByLabel("Duração por aluno (minutos)").fill("30");
  await applicationDialog
    .getByRole("button", { name: "Publicar aplicação", exact: true })
    .click();
  await expect(applicationDialog).not.toBeVisible();
  const applicationCard = page
    .locator(".mg-application")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  await expect(
    applicationCard.getByText("Disponível", { exact: true }),
  ).toBeVisible();
  const code = (
    await applicationCard.locator(".mg-code strong").innerText()
  ).trim();
  expect(code).toMatch(/^[A-Z0-9]+$/);

  // Alterações na avaliação reutilizável não devem alterar a aplicação publicada.
  await page.goto(sourceURL);
  await page.getByLabel(/^Título/).fill(`${title} · revisada`);
  await page
    .locator(".question-editor")
    .nth(0)
    .getByLabel(/^Enunciado/)
    .fill("Enunciado alterado depois da publicação.");
  await page
    .locator(".question-editor")
    .nth(0)
    .getByLabel("Pontuação")
    .fill("9");
  await page
    .locator(".question-editor")
    .nth(0)
    .getByRole("radio", { name: "Falso", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "As aplicações já publicadas preservam sua versão original",
  );

  const student = await context.newPage();
  await student.goto(`/p/${code}`);
  await expect(
    student.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(student.locator(".sidebar")).toHaveCount(0);
  await expect(
    student.getByRole("link", { name: "Aplicações", exact: true }),
  ).toHaveCount(0);
  await expect(student.getByText("Gabarito", { exact: true })).toHaveCount(0);
  await student.getByLabel("Seu nome", { exact: true }).fill(studentName);
  await student.getByRole("button", { name: "Continuar", exact: true }).click();
  await student.getByRole("checkbox", { name: /Li as orientações/ }).check();
  await student
    .getByRole("button", { name: "Começar atividade", exact: true })
    .click();
  await expect(
    student.getByRole("heading", { name: objectivePrompt, exact: true }),
  ).toBeVisible();
  await expect(
    student.getByText("Enunciado alterado depois da publicação."),
  ).toHaveCount(0);
  await student.getByRole("radio", { name: /Verdadeiro/ }).check();
  await student.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(
    student.getByRole("heading", { name: openPrompt, exact: true }),
  ).toBeVisible();
  await student.getByLabel("Sua resposta", { exact: true }).fill(answer);
  await expect(student.locator(".exam-save-status")).toContainText(
    "sincronização simulada concluída",
  );
  await student.getByRole("button", { name: "Revisar", exact: true }).click();
  await expect(student.getByText("2 de 2 questões respondidas")).toBeVisible();
  await student
    .getByRole("button", { name: "Entregar atividade", exact: true })
    .click();
  await student
    .getByRole("dialog", { name: "Entregar sua atividade?" })
    .getByRole("button", { name: "Confirmar entrega" })
    .click();
  await expect(
    student.getByRole("heading", { name: "Muito bem. Sua parte está feita." }),
  ).toBeVisible();
  await expect(
    student.getByText("Aguardando correção do professor."),
  ).toBeVisible();
  await expect(student.locator(".released-result")).toHaveCount(0);
  const identifier = (
    await student.locator(".receipt-id strong").innerText()
  ).trim();

  await page.goto("/resultados");
  const participation = page.getByRole("row").filter({ hasText: studentName });
  await expect(participation).toContainText(identifier);
  await participation.getByRole("button", { name: /^Abrir/ }).click();
  await expect(
    page.getByRole("heading", { name: studentName, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(answer, { exact: true })).toBeVisible();
  await expect(page.locator(".mg-auto-score")).toContainText("4 / 4");
  await expect(
    page.getByRole("button", { name: "Liberar resultado", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Nota atribuída").fill("5");
  await page.getByLabel("Feedback para o aluno").fill(feedback);
  await page
    .getByRole("button", { name: "Salvar correção", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Correção salva");
  await expect(page.locator(".mg-score-block")).toContainText("9 / 10");
  await expect(student.locator(".released-result")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Liberar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Resultado liberado", exact: true }),
  ).toBeVisible();
  await student
    .getByRole("button", { name: "Consultar resultado", exact: true })
    .click();
  await expect(student.locator(".released-score")).toContainText(
    /9\s*\/\s*10 pontos/,
  );
  await expect(student.getByText(feedback, { exact: true })).toBeVisible();
  await student.reload();
  await expect(student.locator(".receipt-id strong")).toHaveText(identifier);
  await expect(student.locator(".released-score")).toContainText(
    /9\s*\/\s*10 pontos/,
  );

  await page.goto("/aplicacoes");
  await page
    .getByRole("button", { name: `Encerrar ${title}`, exact: true })
    .click();
  const closeDialog = page.getByRole("dialog", { name: "Encerrar aplicação?" });
  await closeDialog
    .getByRole("button", { name: "Encerrar aplicação", exact: true })
    .click();
  await expect(closeDialog).not.toBeVisible();
  await expect(
    page
      .locator(".mg-application")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .getByText("Encerrada", { exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(student.locator(".receipt-id strong")).toHaveText(identifier);
  await student
    .getByText("Demonstração: testar outra participação", { exact: true })
    .click();
  await student
    .getByRole("button", {
      name: "Preparar uma nova participação",
      exact: true,
    })
    .click();
  await expect(
    student.getByRole("heading", {
      name: "Esta atividade foi encerrada.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(student.getByLabel("Seu nome", { exact: true })).toHaveCount(0);
});
