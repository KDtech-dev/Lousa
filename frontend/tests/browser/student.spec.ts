import { expect, test, type Page } from "@playwright/test";

type StoredAttempt = {
  id: string;
  name: string;
  identifier: string;
  deadlineAt: string;
  status: string;
  answers: Record<string, { value: string }>;
};

async function readAttempt(page: Page, code: string): Promise<StoredAttempt> {
  return page.evaluate((applicationCode) => {
    const id = localStorage.getItem(`ao.student.attempt.${applicationCode}`);
    const state = JSON.parse(
      localStorage.getItem("avaliacoes-online.demo.v1") ?? "{}",
    );
    return state.database.attempts.find(
      (attempt: { id: string }) => attempt.id === id,
    );
  }, code);
}

async function identifyByName(
  page: Page,
  code = "BIO101",
  name = "Alex Silva",
) {
  await page.goto(`/p/${code}`);
  await page.getByLabel("Seu nome", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `Tudo pronto, ${name.split(" ")[0]}?` }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "Li as orientações e estou pronto para começar.",
    })
    .check();
}

async function startNamedAttempt(page: Page, name = "Alex Silva") {
  await identifyByName(page, "BIO101", name);
  await page
    .getByRole("button", { name: "Começar atividade", exact: true })
    .click();
  await expect(page.getByRole("timer")).toBeVisible();
}

async function deliver(page: Page) {
  await page
    .getByRole("button", { name: "Revisar atividade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Entregar atividade", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "questões estão em branco",
  );
  await page
    .getByRole("button", { name: "Confirmar entrega", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Muito bem. Sua parte está feita." }),
  ).toBeVisible();
}

test.describe("experiência pública do aluno", () => {
  test("apresenta código inválido, abertura futura e aplicação encerrada sem painel do professor", async ({
    page,
  }) => {
    await page.goto("/p/CODIGOINVALIDO");
    await expect(
      page.getByRole("heading", { name: "Não foi possível acessar." }),
    ).toBeVisible();
    await expect(
      page.getByText("Esse código não corresponde a uma aplicação.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.goto("/p/GEO404");
    await expect(
      page.getByRole("heading", { name: "Nos encontramos em breve." }),
    ).toBeVisible();
    await page.goto("/p/HIS505");
    await expect(
      page.getByRole("heading", { name: "Esta atividade foi encerrada." }),
    ).toBeVisible();
    await expect(page.locator(".sidebar")).toHaveCount(0);
    await expect(page.getByText("Gabarito", { exact: true })).toHaveCount(0);
  });

  test("recusa e-mail externo e verifica o código demonstrativo de um e-mail autorizado", async ({
    page,
  }) => {
    await page.goto("/p/MAT202");
    await page.getByLabel("Seu nome", { exact: true }).fill("Aluna Demo");
    await page
      .getByLabel("E-mail autorizado", { exact: true })
      .fill("fora@exemplo.com");
    await page
      .getByRole("button", { name: "Simular envio de código", exact: true })
      .click();
    await expect(
      page.getByText(
        "Este e-mail não está na lista autorizada pelo professor.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByLabel("E-mail autorizado", { exact: true })
      .fill("aluno@exemplo.com");
    await page
      .getByRole("button", { name: "Simular envio de código", exact: true })
      .click();
    const demoCode = await page.locator(".email-demo-code").textContent();
    expect(demoCode).toMatch(/^\d{6}$/);
    await page
      .getByLabel("Código de verificação", { exact: true })
      .fill("000000");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(
      page.getByText("O código informado está incorreto.", { exact: false }),
    ).toBeVisible();
    await page
      .getByLabel("Código de verificação", { exact: true })
      .fill(demoCode!);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("checkbox", {
        name: "Li as orientações e estou pronto para começar.",
      })
      .check();
    await page
      .getByRole("button", { name: "Começar atividade", exact: true })
      .click();
    await expect(page.getByRole("timer")).toBeVisible();
    expect((await readAttempt(page, "MAT202")).status).toBe("in_progress");
    await expect(page.locator(".sidebar")).toHaveCount(0);
  });

  test("gera participações distintas para o mesmo nome somente após ação explícita", async ({
    page,
  }) => {
    await startNamedAttempt(page);
    await page.getByRole("radio", { name: /Uma árvore/ }).check();
    await deliver(page);
    const first = await readAttempt(page, "BIO101");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Muito bem. Sua parte está feita." }),
    ).toBeVisible();
    expect((await readAttempt(page, "BIO101")).id).toBe(first.id);
    await page
      .getByText("Demonstração: testar outra participação", { exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Preparar uma nova participação",
        exact: true,
      })
      .click();
    await page.getByLabel("Seu nome", { exact: true }).fill("Alex Silva");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("checkbox", {
        name: "Li as orientações e estou pronto para começar.",
      })
      .check();
    await page
      .getByRole("button", { name: "Começar atividade", exact: true })
      .click();
    await page.getByRole("radio", { name: /Um sapo/ }).check();
    await deliver(page);
    const second = await readAttempt(page, "BIO101");
    expect(second.id).not.toBe(first.id);
    expect(second.identifier).not.toBe(first.identifier);
    const stored = (await page.evaluate(() =>
      JSON.parse(
        localStorage.getItem("avaliacoes-online.demo.v1")!,
      ).database.attempts.filter(
        (attempt: StoredAttempt) => attempt.name === "Alex Silva",
      ),
    )) as StoredAttempt[];
    expect(stored).toHaveLength(2);
    expect(
      stored.find((attempt) => attempt.id === first.id)?.answers["bio-q1"]
        .value,
    ).toBe("Uma árvore");
    expect(
      stored.find((attempt) => attempt.id === second.id)?.answers["bio-q1"]
        .value,
    ).toBe("Um sapo");
  });

  test("retoma respostas sincronizadas com o mesmo prazo absoluto após recarregar", async ({
    page,
  }) => {
    await startNamedAttempt(page);
    await page.getByRole("radio", { name: /Uma árvore/ }).check();
    await expect
      .poll(
        async () =>
          (await readAttempt(page, "BIO101")).answers["bio-q1"]?.value,
      )
      .toBe("Uma árvore");
    const before = await readAttempt(page, "BIO101");
    await page.reload();
    await expect(page.getByRole("radio", { name: /Uma árvore/ })).toBeChecked();
    const after = await readAttempt(page, "BIO101");
    expect(after.id).toBe(before.id);
    expect(after.deadlineAt).toBe(before.deadlineAt);
    await expect(page.locator(".exam-save-status")).toContainText(
      "sincronização simulada concluída",
    );
  });

  test("exige aplicativo pronto, suspende conexão interrompida e autoriza retomada preservando resposta e prazo", async ({
    page,
  }) => {
    await identifyByName(page, "FIS303");
    const begin = page.getByRole("button", {
      name: "Começar atividade",
      exact: true,
    });
    const scenario = page.getByRole("combobox", {
      name: /Cenário demonstrativo/,
    });
    for (const state of ["pending", "not_installed", "incompatible"]) {
      await scenario.selectOption(state);
      await expect(begin).toBeDisabled();
    }
    await scenario.selectOption("ready");
    await expect(begin).toBeEnabled();
    await begin.click();
    await page.getByRole("radio", { name: /6 m\/s/ }).check();
    await expect
      .poll(
        async () =>
          (await readAttempt(page, "FIS303")).answers["fis-q1"]?.value,
      )
      .toBe("6 m/s");
    const before = await readAttempt(page, "FIS303");
    await scenario.selectOption("disconnected");
    await expect(
      page.getByText("Participação suspensa na simulação.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: /6 m\/s/ })).toBeDisabled();
    await expect(
      page.getByRole("button", {
        name: "Desistir desta participação",
        exact: true,
      }),
    ).toBeDisabled();
    await scenario.selectOption("ready");
    await expect(page.getByRole("radio", { name: /6 m\/s/ })).toBeDisabled();
    await page
      .getByRole("button", { name: "Solicitar retomada simulada", exact: true })
      .click();
    await expect(page.getByRole("radio", { name: /6 m\/s/ })).toBeEnabled();
    await expect(page.getByRole("radio", { name: /6 m\/s/ })).toBeChecked();
    expect((await readAttempt(page, "FIS303")).deadlineAt).toBe(
      before.deadlineAt,
    );
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: "Autorizar retomada e continuar",
        exact: true,
      }),
    ).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: "Li as orientações e estou pronto para retomar.",
      })
      .check();
    await page
      .getByRole("combobox", { name: /Cenário demonstrativo/ })
      .selectOption("ready");
    await page
      .getByRole("button", {
        name: "Autorizar retomada e continuar",
        exact: true,
      })
      .click();
    await expect(page.getByRole("radio", { name: /6 m\/s/ })).toBeChecked();
    expect((await readAttempt(page, "FIS303")).deadlineAt).toBe(
      before.deadlineAt,
    );
  });

  test("preserva rascunho local após falha simulada e sincroniza ao recarregar", async ({
    page,
  }) => {
    await startNamedAttempt(page);
    const before = await readAttempt(page, "BIO101");
    await page
      .getByText("Controles de demonstração · salvamento", { exact: true })
      .click();
    await page
      .getByRole("checkbox", {
        name: "Simular falha na sincronização",
        exact: true,
      })
      .check();
    await page.getByRole("radio", { name: /Uma árvore/ }).check();
    await page
      .getByRole("button", { name: "Questão 3, pendente", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Sua resposta", exact: true })
      .fill("Organizar a separação dos resíduos na escola.");
    await expect(
      page.getByText("Não foi possível enviar as respostas.", {
        exact: false,
      }),
    ).toBeVisible();
    expect(
      (await readAttempt(page, "BIO101")).answers["bio-q3"],
    ).toBeUndefined();
    const localValue = await page.evaluate(
      (id) =>
        JSON.parse(localStorage.getItem(`ao.demo.draft.${id}`)!).answers[
          "bio-q3"
        ],
      before.id,
    );
    expect(localValue).toBe("Organizar a separação dos resíduos na escola.");
    await page.reload();
    await expect(page.getByRole("radio", { name: /Uma árvore/ })).toBeChecked();
    await page
      .getByRole("button", { name: "Questão 3, respondida", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Sua resposta", exact: true }),
    ).toHaveValue(localValue);
    await expect
      .poll(
        async () =>
          (await readAttempt(page, "BIO101")).answers["bio-q3"]?.value,
      )
      .toBe(localValue);
    expect((await readAttempt(page, "BIO101")).deadlineAt).toBe(
      before.deadlineAt,
    );
  });

  test("finaliza automaticamente no prazo e mantém confirmação e respostas após recarga", async ({
    page,
  }) => {
    await startNamedAttempt(page);
    await page.getByRole("radio", { name: /Uma árvore/ }).check();
    await expect
      .poll(
        async () =>
          (await readAttempt(page, "BIO101")).answers["bio-q1"]?.value,
      )
      .toBe("Uma árvore");
    // Encurta somente o fixture local para exercitar o cronômetro sem aguardar 45 minutos.
    // A derivação do prazo e a recusa de alterações finais são verificadas nos testes de domínio.
    await page.evaluate(() => {
      const key = "avaliacoes-online.demo.v1";
      const state = JSON.parse(localStorage.getItem(key)!);
      const id = localStorage.getItem("ao.student.attempt.BIO101");
      state.database.attempts.find(
        (attempt: { id: string }) => attempt.id === id,
      ).deadlineAt = new Date(Date.now() + 1_200).toISOString();
      localStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "O prazo foi encerrado." }),
    ).toBeVisible({ timeout: 10_000 });
    const final = await readAttempt(page, "BIO101");
    expect(final.status).toBe("expired");
    expect(final.answers["bio-q1"].value).toBe("Uma árvore");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "O prazo foi encerrado." }),
    ).toBeVisible();
    expect((await readAttempt(page, "BIO101")).id).toBe(final.id);
    await expect(page.getByRole("radio")).toHaveCount(0);
  });
});
