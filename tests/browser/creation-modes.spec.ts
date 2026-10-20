import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

async function openNewActivity(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await page.goto("/avaliacoes/nova");
  await expect(
    page.getByRole("heading", { name: "Nova avaliação", exact: true }),
  ).toBeVisible();
}

test("criação por prompt gera conteúdo demonstrativo editável antes de salvar", async ({
  page,
}) => {
  await openNewActivity(page);
  await page.getByRole("button", { name: "Criar com prompt" }).click();
  const generation = page.locator(".creation-generation-form");
  await generation
    .getByLabel("Descreva a atividade")
    .fill("revisão sobre ciclo da água para o 7º ano");
  await generation.getByLabel("Quantidade de questões").fill("3");
  await generation
    .getByLabel("Disciplina para a atividade")
    .fill("Ciências");
  await generation.getByRole("button", { name: "Gerar atividade" }).click();
  await expect(page.locator(".notice.success")).toContainText(
    "sem uso de inteligência artificial",
  );
  await expect(page.locator(".question-editor")).toHaveCount(3);
  await page.getByLabel("Título").fill("Ciclo da água revisado");
  await page.getByRole("button", { name: "Salvar avaliação" }).click();
  await expect(page).toHaveURL(/\/avaliacoes\/assessment-/);
  await expect(page.locator(".notice.success")).toContainText(
    "criada e salva neste navegador",
  );
});

test("criação por PDF valida o arquivo e permite revisar o resultado demonstrativo", async ({
  page,
}) => {
  await openNewActivity(page);
  await page.getByRole("button", { name: "Criar com PDF" }).click();
  const generation = page.locator(".creation-generation-form");
  await generation.getByLabel("Disciplina para a atividade").fill("História");
  await generation.getByLabel("Material em PDF").setInputFiles({
    name: "apoio-historia.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await expect(page.getByText("apoio-historia.pdf")).toBeVisible();
  await generation
    .getByRole("button", { name: "Enviar PDF e gerar atividade" })
    .click();
  await expect(page.locator(".notice.success")).toContainText(
    "sem uso de inteligência artificial",
  );
  await expect(page.locator(".question-editor")).toHaveCount(5);
  await page.getByLabel("Título").fill("Atividade de História revisada");
  await page.getByRole("button", { name: "Salvar avaliação" }).click();
  await expect(page).toHaveURL(/\/avaliacoes\/assessment-/);
});
