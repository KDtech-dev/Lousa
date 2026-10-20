import { Buffer } from "node:buffer";
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail demonstrativo").fill("professora@exemplo.com");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
}

async function navigate(page: Page, name: string) {
  await page
    .locator(".sidebar")
    .getByRole("link", { name, exact: true })
    .click();
}

test("professor cria questões de três tipos, visualiza, edita, duplica e arquiva uma avaliação", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Avaliações");
  await page.getByRole("link", { name: "Nova avaliação", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(
    page.getByText("Informe um título para a avaliação."),
  ).toBeVisible();
  await page.getByLabel("Título").fill("Avaliação de ecossistemas do percurso");
  await page.getByLabel("Disciplina").fill("Ciências");
  await page
    .getByLabel("Descrição", { exact: true })
    .fill("Atividade criada pelo professor durante o percurso de verificação.");
  await page
    .getByLabel("Instruções para o aluno")
    .fill("Leia com atenção e responda às três questões.");

  const first = page.locator(".question-editor").nth(0);
  await first
    .getByLabel("Enunciado")
    .fill("Qual dos exemplos abaixo é um fator biótico?");
  await first.getByLabel("Pontuação").fill("2");
  const options = ["Luz solar", "Uma árvore", "Temperatura", "Água"];
  for (let index = 0; index < options.length; index++) {
    await first
      .getByRole("textbox", {
        name: `Texto da alternativa ${index + 1} da questão 1`,
        exact: true,
      })
      .fill(options[index]);
  }
  await first
    .getByRole("radio", {
      name: "Alternativa 2 é a resposta correta da questão 1",
      exact: true,
    })
    .check();

  await page
    .getByRole("button", { name: "Adicionar questão", exact: true })
    .click();
  const second = page.locator(".question-editor").nth(1);
  await second.getByLabel("Tipo de questão").selectOption("boolean");
  await second
    .getByLabel("Enunciado")
    .fill("A biodiversidade inclui a variedade de seres vivos.");
  await second.getByLabel("Pontuação").fill("2");
  await second.getByRole("radio", { name: "Verdadeiro", exact: true }).check();

  await page
    .getByRole("button", { name: "Adicionar questão", exact: true })
    .click();
  const third = page.locator(".question-editor").nth(2);
  await third.getByLabel("Tipo de questão").selectOption("open");
  await third
    .getByLabel("Enunciado")
    .fill("Explique uma ação para preservar um ecossistema.");
  await third.getByLabel("Pontuação").fill("6");
  await page
    .getByRole("button", { name: "Mover questão 3 para cima", exact: true })
    .click();
  await expect(
    page.locator(".question-editor").nth(1).getByLabel("Tipo de questão"),
  ).toHaveValue("open");

  await page.getByRole("button", { name: "Visualizar como aluno" }).click();
  const preview = page.getByRole("dialog", {
    name: "Avaliação de ecossistemas do percurso",
    exact: true,
  });
  await expect(preview).toBeVisible();
  await expect(preview.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(
    preview.getByText("Resposta correta", { exact: true }),
  ).toHaveCount(0);
  await expect(
    preview.getByText("Explique uma ação para preservar um ecossistema.", {
      exact: true,
    }),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Voltar ao editor" }).click();

  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page).toHaveURL(/\/avaliacoes\/assessment-/);
  await expect(page.getByRole("status")).toContainText(
    "Avaliação criada e salva neste navegador",
  );
  await page.reload();
  await expect(page.locator(".question-editor")).toHaveCount(3);
  await expect(
    page.locator(".question-editor").nth(1).getByLabel("Tipo de questão"),
  ).toHaveValue("open");
  await expect(
    page
      .locator(".question-editor")
      .nth(2)
      .getByRole("radio", { name: "Verdadeiro", exact: true }),
  ).toBeChecked();
  await page.getByLabel("Título").fill("Ecossistemas: versão revisada");
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Atividade salva neste dispositivo",
  );

  await navigate(page, "Avaliações");
  await page
    .getByRole("textbox", { name: "Buscar avaliação" })
    .fill("versão revisada");
  await expect(page.locator(".assessment-card")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Duplicar Ecossistemas: versão revisada",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Ecossistemas: versão revisada (cópia)",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Arquivar Ecossistemas: versão revisada (cópia)",
      exact: true,
    })
    .click();
  const archive = page.getByRole("dialog", { name: "Arquivar avaliação?" });
  await expect(archive).toContainText("aplicações já publicadas");
  await archive
    .getByRole("button", { name: "Arquivar avaliação", exact: true })
    .click();
  await expect(archive).not.toBeVisible();
  await page.getByRole("button", { name: /^Arquivadas/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Ecossistemas: versão revisada (cópia)",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Ativas/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Ecossistemas: versão revisada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Ecossistemas: versão revisada (cópia)",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Buscar avaliação" })
    .fill("termo sem avaliação correspondente");
  await expect(
    page.getByRole("heading", { name: "Nenhuma avaliação encontrada" }),
  ).toBeVisible();
});

test("professor cadastra arquivo e link, visualiza arquivo local e associa o material a uma avaliação", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "Materiais");
  await page
    .getByRole("button", { name: "Novo material", exact: true })
    .click();
  let dialog = page.getByRole("dialog", { name: "Novo material", exact: true });
  await dialog.getByRole("button", { name: "Link", exact: true }).click();
  await dialog.getByLabel("Título").fill("Referência de ecossistemas");
  await dialog.getByLabel("Disciplina").fill("Ciências");
  await dialog.getByLabel("Endereço do link").fill("javascript:alert(1)");
  await dialog
    .getByRole("button", { name: "Salvar material", exact: true })
    .click();
  await expect(
    dialog.getByText(
      "Informe um endereço completo iniciado por https:// ou http://.",
    ),
  ).toBeVisible();
  await dialog
    .getByLabel("Endereço do link")
    .fill("https://example.org/referencia");
  await dialog
    .getByRole("button", { name: "Salvar material", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const linkRow = page
    .locator(".materials-table tbody tr")
    .filter({ hasText: "Referência de ecossistemas" });
  await expect(
    linkRow.getByRole("link", { name: "Abrir", exact: true }),
  ).toHaveAttribute("href", "https://example.org/referencia");
  await expect(
    linkRow.getByRole("link", { name: "Abrir", exact: true }),
  ).toHaveAttribute("rel", "noopener noreferrer");

  await page
    .getByRole("button", { name: "Novo material", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Novo material", exact: true });
  await dialog.getByLabel("Título").fill("Guia de leitura local");
  await dialog.getByLabel("Disciplina").fill("Ciências");
  await dialog.getByLabel("Selecionar arquivo do material").setInputFiles({
    name: "guia-de-leitura.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Conteúdo de apoio salvo para a demonstração.",
      "utf-8",
    ),
  });
  await dialog
    .getByRole("button", { name: "Salvar material", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  let fileRow = page
    .locator(".materials-table tbody tr")
    .filter({ hasText: "Guia de leitura local" });
  await expect(fileRow).toContainText("Salvo neste navegador");
  await fileRow
    .getByRole("button", { name: "Visualizar", exact: true })
    .click();
  let preview = page.getByRole("dialog", {
    name: "Guia de leitura local",
    exact: true,
  });
  await expect(preview.locator("pre")).toHaveText(
    "Conteúdo de apoio salvo para a demonstração.",
  );
  await expect(
    preview.getByRole("link", { name: "Baixar arquivo local" }),
  ).toHaveAttribute("href", /^blob:/);
  await preview.getByRole("button", { name: "Fechar", exact: true }).click();
  await fileRow
    .getByRole("button", { name: "Editar Guia de leitura local", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Editar material", exact: true });
  await dialog.getByLabel("Título").fill("Guia de leitura revisado");
  await dialog
    .getByRole("button", { name: "Salvar material", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  fileRow = page
    .locator(".materials-table tbody tr")
    .filter({ hasText: "Guia de leitura revisado" });
  await fileRow
    .getByRole("button", { name: "Visualizar", exact: true })
    .click();
  preview = page.getByRole("dialog", {
    name: "Guia de leitura revisado",
    exact: true,
  });
  await expect(preview.locator("pre")).toHaveText(
    "Conteúdo de apoio salvo para a demonstração.",
  );
  await preview.getByRole("button", { name: "Fechar", exact: true }).click();

  await navigate(page, "Avaliações");
  await page
    .locator(".assessment-card")
    .first()
    .getByRole("button", { name: "Editar avaliação", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: /Guia de leitura revisado/ })
    .check();
  await page
    .getByRole("button", { name: "Salvar avaliação", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Atividade salva neste dispositivo",
  );
  await navigate(page, "Materiais");
  fileRow = page
    .locator(".materials-table tbody tr")
    .filter({ hasText: "Guia de leitura revisado" });
  await fileRow.getByRole("link", { name: "1 avaliação", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Guia de leitura revisado/ }),
  ).toBeChecked();
});
