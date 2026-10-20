import { describe, expect, it } from "vitest";
import { createSeedDatabase } from "../src/data/seed";
import { createDemoApi, type DemoStorage } from "../src/services/demoApi";
import { authorizeResume, canStart } from "../src/services/nativeApp";

const initialTime = Date.parse("2026-10-10T15:00:00.000Z");
function setup() {
  let time = initialTime;
  const values = new Map<string, string>();
  const storage: DemoStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
  const options = {
    storage,
    now: () => time,
    initialDatabase: createSeedDatabase(initialTime),
    latency: 0,
  };
  return {
    api: createDemoApi(options),
    storage,
    reload: () => createDemoApi(options),
    advance: (minutes: number) => {
      time += minutes * 60_000;
    },
  };
}

describe("participações e prazo", () => {
  it("cria IDs e respostas independentes para alunos com o mesmo nome", async () => {
    const { api } = setup();
    const [first, second] = await Promise.all([
      api.startAttempt("BIO101", { name: "Alex Silva" }),
      api.startAttempt("BIO101", { name: "Alex Silva" }),
    ]);
    expect(first.id).not.toBe(second.id);
    expect(first.identifier).not.toBe(second.identifier);
    expect(
      (await api.listAttempts()).filter((item) => item.name === "Alex Silva"),
    ).toHaveLength(2);
    await api.saveAnswers(first.id, { "bio-q1": "Uma árvore" });
    expect((await api.getPublicAttempt(second.id)).answers).toEqual({});
  });

  it("preserva respostas e o prazo absoluto ao recriar o serviço", async () => {
    const { api, reload, advance } = setup();
    const original = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.saveAnswers(original.id, {
      "bio-q1": "Uma árvore",
      "bio-q3": "Separar resíduos na escola.",
    });
    advance(10);
    const resumed = await reload().resumeAttempt(original.id);
    expect(resumed.startedAt).toBe(original.startedAt);
    expect(resumed.deadlineAt).toBe(original.deadlineAt);
    expect(resumed.answers["bio-q3"].value).toBe("Separar resíduos na escola.");
  });

  it("encerra no prazo com as respostas salvas e mantém o encerramento após recarga", async () => {
    const { api, reload, advance } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.saveAnswers(attempt.id, { "bio-q1": "Uma árvore" });
    advance(46);
    const expired = await reload().resumeAttempt(attempt.id);
    expect(expired.status).toBe("expired");
    expect(expired.endedAt).toBe(attempt.deadlineAt);
    expect(expired.answers["bio-q1"].value).toBe("Uma árvore");
    expect((await api.finishAttempt(attempt.id)).status).toBe("expired");
    await expect(
      api.saveAnswers(attempt.id, { "bio-q1": "Um sapo" }),
    ).rejects.toMatchObject({ code: "ATTEMPT_FINISHED" });
  });

  it("usa o menor prazo entre duração e fim da disponibilidade", async () => {
    const { api, advance } = setup();
    const application = await api.publishApplication({
      assessmentId: "assessment-bio",
      startAt: new Date(initialTime - 60_000).toISOString(),
      endAt: new Date(initialTime + 5 * 60_000).toISOString(),
      durationMinutes: 45,
      accessMode: "name",
      allowedEmails: [],
      appRequired: false,
    });
    const attempt = await api.startAttempt(application.code, {
      name: "Alex Silva",
    });
    expect(attempt.deadlineAt).toBe(application.endAt);
    advance(5);
    expect((await api.getPublicAttempt(attempt.id)).status).toBe("expired");
  });

  it("mantém respostas entregues imutáveis e não cria outra tentativa ao retomar", async () => {
    const { api, reload } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.saveAnswers(attempt.id, { "bio-q1": "Uma árvore" });
    const final = await api.finishAttempt(attempt.id);
    const count = (await api.listAttempts()).length;
    await expect(
      api.saveAnswers(attempt.id, { "bio-q1": "Um sapo" }),
    ).rejects.toMatchObject({ code: "ATTEMPT_FINISHED" });
    expect(await reload().resumeAttempt(attempt.id)).toEqual(final);
    expect((await api.listAttempts()).length).toBe(count);
    expect((await api.finishAttempt(attempt.id, "abandoned")).status).toBe(
      "submitted",
    );
  });

  it("não substitui respostas já sincronizadas quando a sincronização simulada falha", async () => {
    const { api } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.saveAnswers(attempt.id, { "bio-q1": "Uma árvore" });
    await expect(
      api.saveAnswers(attempt.id, { "bio-q1": "Um sapo" }, true),
    ).rejects.toMatchObject({ code: "SYNC_FAILED" });
    expect(
      (await api.getPublicAttempt(attempt.id)).answers["bio-q1"].value,
    ).toBe("Uma árvore");
    await api.saveAnswers(attempt.id, { "bio-q1": "Um sapo" });
    expect(
      (await api.getPublicAttempt(attempt.id)).answers["bio-q1"].value,
    ).toBe("Um sapo");
  });

  it("finaliza um rascunho local salvo dentro do prazo mesmo após falha de sincronização", async () => {
    const { api, reload, advance, storage } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.saveAnswers(attempt.id, { "bio-q1": "Uma árvore" });
    advance(1);
    const localAnswers = {
      "bio-q1": "Uma árvore",
      "bio-q3": "Criar uma horta e uma composteira na escola.",
    };
    storage.setItem(
      `ao.demo.draft.${attempt.id}`,
      JSON.stringify({
        answers: localAnswers,
        savedAt: new Date(initialTime + 60_000).toISOString(),
      }),
    );
    await expect(
      api.saveAnswers(attempt.id, localAnswers, true),
    ).rejects.toMatchObject({ code: "SYNC_FAILED" });
    advance(45);
    const final = await reload().getPublicAttempt(attempt.id);
    expect(final.status).toBe("expired");
    expect(final.answers["bio-q3"].value).toBe(localAnswers["bio-q3"]);
    storage.setItem(
      `ao.demo.draft.${attempt.id}`,
      JSON.stringify({
        answers: { "bio-q1": "Um sapo" },
        savedAt: new Date(initialTime + 2 * 60_000).toISOString(),
      }),
    );
    expect((await api.getPublicAttempt(attempt.id)).answers).toEqual(
      final.answers,
    );
  });

  it("ignora rascunhos locais gravados fora do prazo ou anteriores ao início", async () => {
    for (const savedAt of [initialTime - 60_000, initialTime + 46 * 60_000]) {
      const { api, advance, storage } = setup();
      const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
      await api.saveAnswers(attempt.id, { "bio-q1": "Uma árvore" });
      storage.setItem(
        `ao.demo.draft.${attempt.id}`,
        JSON.stringify({
          answers: { "bio-q1": "Um sapo" },
          savedAt: new Date(savedAt).toISOString(),
        }),
      );
      advance(46);
      expect(
        (await api.getPublicAttempt(attempt.id)).answers["bio-q1"].value,
      ).toBe("Uma árvore");
    }
  });

  it("preserva um rascunho mais recente criado enquanto uma sincronização antiga estava em andamento", async () => {
    const { api, advance, storage } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    const pendingSave = api.saveAnswers(attempt.id, { "bio-q1": "Uma árvore" });
    advance(1);
    storage.setItem(
      `ao.demo.draft.${attempt.id}`,
      JSON.stringify({
        answers: {
          "bio-q1": "Uma árvore",
          "bio-q3": "Resposta local mais recente.",
        },
        savedAt: new Date(initialTime + 60_000).toISOString(),
      }),
    );
    await pendingSave;
    advance(45);
    const final = await api.getPublicAttempt(attempt.id);
    expect(final.status).toBe("expired");
    expect(final.answers["bio-q3"].value).toBe("Resposta local mais recente.");
  });
});

describe("identificação e disponibilidade", () => {
  it("recusa link inválido, aplicação futura e aplicação encerrada", async () => {
    const { api } = setup();
    await expect(api.getPublicApplication("INVALIDO")).rejects.toMatchObject({
      code: "APP_NOT_FOUND",
    });
    await expect(
      api.startAttempt("GEO404", { name: "Alex Silva" }),
    ).rejects.toMatchObject({ code: "APP_NOT_OPEN" });
    await expect(
      api.startAttempt("HIS505", { name: "Alex Silva" }),
    ).rejects.toMatchObject({ code: "APP_CLOSED" });
    const application = await api.getPublicApplication("BIO101");
    await api.closeApplication(application.id);
    await expect(
      api.startAttempt("BIO101", { name: "Alex Silva" }),
    ).rejects.toMatchObject({ code: "APP_CLOSED" });
  });

  it("recusa e-mail não autorizado e token inventado", async () => {
    const { api } = setup();
    await expect(
      api.requestEmailCode("MAT202", "fora@exemplo.com"),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_ALLOWED" });
    await expect(
      api.startAttempt("MAT202", {
        name: "Alex Silva",
        email: "aluno@exemplo.com",
        verificationToken: "inventado",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("verifica código e vincula token ao e-mail autorizado, consumindo-o ao iniciar", async () => {
    const { api } = setup();
    const challenge = await api.requestEmailCode(
      "MAT202",
      " ALUNO@EXEMPLO.COM ",
    );
    await expect(
      api.verifyEmailCode(challenge.verificationId, "000000"),
    ).rejects.toMatchObject({ code: "INVALID_VERIFICATION_CODE" });
    const token = await api.verifyEmailCode(
      challenge.verificationId,
      challenge.demoCode,
    );
    await expect(
      api.startAttempt("MAT202", {
        name: "Alex Silva",
        email: "beatriz@exemplo.com",
        verificationToken: token,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    const other = await api.publishApplication({
      assessmentId: "assessment-mat",
      startAt: new Date(initialTime).toISOString(),
      endAt: new Date(initialTime + 3600_000).toISOString(),
      durationMinutes: 30,
      accessMode: "email",
      allowedEmails: ["aluno@exemplo.com"],
      appRequired: false,
    });
    await expect(
      api.startAttempt(other.code, {
        name: "Alex Silva",
        email: "aluno@exemplo.com",
        verificationToken: token,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    const attempt = await api.startAttempt("MAT202", {
      name: "Alex Silva",
      email: "ALUNO@EXEMPLO.COM",
      verificationToken: token,
    });
    expect(attempt.email).toBe("aluno@exemplo.com");
    await expect(
      api.startAttempt("MAT202", {
        name: "Alex Silva",
        email: "aluno@exemplo.com",
        verificationToken: token,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  it("expira o código de e-mail sem criar uma participação", async () => {
    const { api, advance } = setup();
    const challenge = await api.requestEmailCode("MAT202", "aluno@exemplo.com");
    advance(11);
    await expect(
      api.verifyEmailCode(challenge.verificationId, challenge.demoCode),
    ).rejects.toMatchObject({ code: "VERIFICATION_EXPIRED" });
  });

  it("impede publicação com período, duração ou lista de e-mails inválidos", async () => {
    const { api } = setup();
    const valid = {
      assessmentId: "assessment-bio",
      startAt: new Date(initialTime).toISOString(),
      endAt: new Date(initialTime + 3600_000).toISOString(),
      durationMinutes: 30,
      accessMode: "email" as const,
      allowedEmails: ["aluno@exemplo.com"],
      appRequired: false,
    };
    await expect(
      api.publishApplication({ ...valid, endAt: valid.startAt }),
    ).rejects.toMatchObject({ code: "INVALID_PERIOD" });
    await expect(
      api.publishApplication({ ...valid, durationMinutes: 0 }),
    ).rejects.toMatchObject({ code: "INVALID_DURATION" });
    await expect(
      api.publishApplication({ ...valid, allowedEmails: ["invalido"] }),
    ).rejects.toMatchObject({ code: "INVALID_EMAIL_LIST" });
  });
});

describe("cópia publicada, correção e retorno público", () => {
  it("isola questões e regras publicadas de edições posteriores", async () => {
    const { api } = setup();
    const assessments = await api.listAssessments();
    const original = assessments.find((item) => item.id === "assessment-bio")!;
    const application = await api.publishApplication({
      assessmentId: original.id,
      startAt: new Date(initialTime).toISOString(),
      endAt: new Date(initialTime + 3600_000).toISOString(),
      durationMinutes: 30,
      accessMode: "name",
      allowedEmails: [],
      appRequired: false,
    });
    original.title = "Avaliação alterada";
    original.questions[0].prompt = "Pergunta alterada";
    original.questions[0].correctAnswer = "Um sapo";
    await api.saveAssessment(original);
    const copy = (await api.listApplications()).find(
      (item) => item.id === application.id,
    )!;
    expect(copy.snapshot.title).toBe("Ecologia e sustentabilidade");
    expect(copy.snapshot.questions[0].correctAnswer).toBe("Uma árvore");
    application.snapshot.questions[0].prompt = "Mutação do retorno";
    expect(
      (await api.getPublicApplication(copy.code)).snapshot.questions[0].prompt,
    ).not.toBe("Mutação do retorno");
  });

  it("não retorna gabaritos ou e-mails internos na aplicação pública", async () => {
    const { api } = setup();
    const application = await api.getPublicApplication("MAT202");
    expect(application).not.toHaveProperty("allowedEmails");
    expect(application).not.toHaveProperty("assessmentId");
    expect(application.snapshot).not.toHaveProperty("archived");
    for (const question of application.snapshot.questions)
      expect(question).not.toHaveProperty("correctAnswer");
    expect(JSON.stringify(application)).not.toContain("beatriz@exemplo.com");
  });

  it("publica nota e feedback só depois da correção e liberação", async () => {
    const { api } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.saveAnswers(attempt.id, {
      "bio-q1": "Uma árvore",
      "bio-q2": "Verdadeiro",
      "bio-q3": "Reduzir o uso de plástico.",
    });
    await api.finishAttempt(attempt.id);
    expect(await api.getPublicAttempt(attempt.id)).not.toHaveProperty("score");
    await expect(
      api.setResultsReleased(attempt.id, true),
    ).rejects.toMatchObject({ code: "RESULT_NOT_READY" });
    await expect(
      api.gradeAttempt(attempt.id, { "bio-q3": 6 }, "Feedback"),
    ).rejects.toMatchObject({ code: "INVALID_GRADE" });
    const graded = await api.gradeAttempt(
      attempt.id,
      { "bio-q3": 4 },
      "Boa proposta!",
    );
    expect(graded.score).toBe(9);
    expect(graded.correctionStatus).toBe("graded");
    const hidden = await api.getPublicAttempt(attempt.id);
    expect(hidden).not.toHaveProperty("score");
    expect(hidden).not.toHaveProperty("feedback");
    expect(hidden.answers["bio-q1"]).not.toHaveProperty("pointsAwarded");
    await api.setResultsReleased(attempt.id, true);
    expect(await api.getPublicAttempt(attempt.id)).toMatchObject({
      score: 9,
      feedback: "Boa proposta!",
    });
    await api.setResultsReleased(attempt.id, false);
    expect(await api.getPublicAttempt(attempt.id)).not.toHaveProperty("score");
  });

  it("não corrige nem libera resultado de uma desistência", async () => {
    const { api } = setup();
    const attempt = await api.startAttempt("BIO101", { name: "Alex Silva" });
    await api.finishAttempt(attempt.id, "abandoned");
    await expect(
      api.gradeAttempt(attempt.id, { "bio-q3": 0 }, "Feedback"),
    ).rejects.toMatchObject({ code: "ATTEMPT_ABANDONED" });
    await expect(
      api.setResultsReleased(attempt.id, true),
    ).rejects.toMatchObject({ code: "RESULT_NOT_READY" });
    expect(await api.getPublicAttempt(attempt.id)).not.toHaveProperty("score");
  });

  it("informa quando o navegador não permite persistir os dados locais", async () => {
    const api = createDemoApi({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota");
        },
      },
      latency: 0,
    });
    await expect(api.getTeacher()).rejects.toMatchObject({
      code: "LOCAL_STORAGE_FAILED",
      message: expect.stringContaining("salvar os dados locais"),
    });
  });
});

describe("integração nativa simulada", () => {
  it("permite começar apenas em pronto quando o aplicativo é obrigatório", async () => {
    const { api } = setup();
    expect(canStart("ready")).toBe(true);
    for (const state of [
      "pending",
      "not_installed",
      "incompatible",
      "disconnected",
    ] as const) {
      expect(canStart(state)).toBe(false);
      await expect(
        api.startAttempt("FIS303", { name: "Alex Silva", appState: state }),
      ).rejects.toMatchObject({ code: "APP_UNAVAILABLE" });
    }
    expect(
      (
        await api.startAttempt("FIS303", {
          name: "Alex Silva",
          appState: "ready",
        })
      ).status,
    ).toBe("in_progress");
    await expect(
      authorizeResume("disconnected", false),
    ).resolves.toBeUndefined();
  });

  it("recusa retomada desconectada, preserva respostas e mantém o prazo até durante suspensão", async () => {
    const { api, reload, advance } = setup();
    const attempt = await api.startAttempt("FIS303", {
      name: "Alex Silva",
      appState: "ready",
    });
    await api.saveAnswers(attempt.id, { "fis-q1": "6 m/s" });
    await expect(
      reload().resumeAttempt(attempt.id, "disconnected"),
    ).rejects.toMatchObject({ code: "APP_UNAVAILABLE" });
    const resumed = await api.resumeAttempt(attempt.id, "ready");
    expect(resumed.deadlineAt).toBe(attempt.deadlineAt);
    expect(resumed.answers["fis-q1"].value).toBe("6 m/s");
    advance(61);
    const expired = await reload().resumeAttempt(attempt.id, "disconnected");
    expect(expired.status).toBe("expired");
    expect(expired.answers["fis-q1"].value).toBe("6 m/s");
  });
});
