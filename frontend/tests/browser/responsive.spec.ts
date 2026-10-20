import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const widths = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const overflowing = [...document.querySelectorAll<HTMLElement>("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          right: Math.round(rect.right),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          overflowX: getComputedStyle(element).overflowX,
        };
      })
      .filter(({ right }) => right > viewport + 1)
      .slice(0, 8);
    const tableAncestors: Array<Record<string, string | number>> = [];
    let node = document.querySelector<HTMLElement>(".mg-results-table");
    while (node) {
      const rect = node.getBoundingClientRect();
      tableAncestors.push({
        element: `${node.tagName.toLowerCase()}.${node.className}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        overflowX: getComputedStyle(node).overflowX,
      });
      node = node.parentElement;
    }
    return {
      viewport,
      document: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      overflowing,
      tableAncestors,
    };
  });
  expect(
    widths.document,
    `largura da página: ${JSON.stringify(widths)}`,
  ).toBeLessThanOrEqual(widths.viewport + 1);
}

test("menu do professor e fluxos prioritários cabem em uma tela de smartphone", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("E-mail demonstrativo", { exact: true })
    .fill("marina@exemplo.com");
  await page.getByRole("button", { name: "Entrar na demonstração" }).click();
  await expect(page.getByRole("heading", { name: /Olá, Marina/ })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const menuButton = page.getByRole("button", { name: "Abrir menu" });
  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeFocused();

  await page.goto("/avaliacoes/nova");
  await expect(page.getByLabel("Título *", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  for (const [path, heading] of [
    ["/avaliacoes", "Suas avaliações"],
    ["/materiais", "Materiais de apoio"],
    ["/aplicacoes", "Aplicações"],
    ["/resultados", "Resultados"],
    ["/conta", "Conta"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await page.goto("/p/BIO101");
  await expect(page.getByLabel("Seu nome", { exact: true })).toBeVisible();
  await page.getByLabel("Seu nome", { exact: true }).fill("Luiza Santos");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Li as orientações e estou pronto para começar.",
    })
    .check();
  await page.getByRole("button", { name: "Começar atividade" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
