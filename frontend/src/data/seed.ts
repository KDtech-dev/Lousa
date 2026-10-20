import type {
  Assessment,
  Application,
  Attempt,
  DemoDatabase,
  Material,
} from "../types";

const shift = (now: number, minutes: number) =>
  new Date(now + minutes * 60_000).toISOString();

export const seedMaterialContent: Record<string, string> = {
  "mat-bio":
    "Caderno de apoio — Ecologia\n\nCadeias alimentares conectam produtores, consumidores e decompositores.\nA biodiversidade contribui para o equilíbrio dos ecossistemas.\nRevise os conceitos e relacione-os a exemplos do seu cotidiano.\n",
  "mat-fis":
    "Guia de revisão — Movimento\n\nVelocidade média = distância / intervalo de tempo.\nNo movimento uniforme, a velocidade permanece constante.\nSempre inclua unidades em suas respostas.\n",
};

export function createSeedDatabase(now = Date.now()): DemoDatabase {
  const createdAt = shift(now, -21 * 24 * 60);
  const assessments: Assessment[] = [
    {
      id: "assessment-bio",
      title: "Ecologia e sustentabilidade",
      subject: "Biologia",
      description:
        "Uma atividade para conectar cadeias alimentares, biodiversidade e o nosso cotidiano.",
      instructions:
        "Leia cada enunciado com atenção. Consulte o caderno de apoio e justifique a resposta aberta com suas próprias palavras.",
      questions: [
        {
          id: "bio-q1",
          type: "single",
          prompt:
            "Qual organismo ocupa a posição de produtor em uma cadeia alimentar?",
          options: ["Uma árvore", "Um gafanhoto", "Um sapo", "Um fungo"],
          correctAnswer: "Uma árvore",
          points: 3,
        },
        {
          id: "bio-q2",
          type: "boolean",
          prompt:
            "A diversidade de espécies contribui para o equilíbrio de um ecossistema.",
          options: ["Verdadeiro", "Falso"],
          correctAnswer: "Verdadeiro",
          points: 2,
        },
        {
          id: "bio-q3",
          type: "open",
          prompt:
            "Descreva uma ação que sua escola pode realizar para reduzir o impacto ambiental e explique seu benefício.",
          options: [],
          correctAnswer: null,
          points: 5,
        },
      ],
      materialIds: ["mat-bio"],
      archived: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "assessment-mat",
      title: "Funções do primeiro grau",
      subject: "Matemática",
      description:
        "Interpretação de funções e resolução de situações do dia a dia.",
      instructions:
        "Resolva as questões e apresente seu raciocínio na resposta aberta. A identificação desta aplicação usa um e-mail autorizado.",
      questions: [
        {
          id: "mat-q1",
          type: "single",
          prompt: "Se f(x) = 2x + 3, qual é o valor de f(4)?",
          options: ["7", "8", "11", "14"],
          correctAnswer: "11",
          points: 4,
        },
        {
          id: "mat-q2",
          type: "open",
          prompt:
            "Uma corrida custa R$ 5 de taxa inicial e R$ 2 por quilômetro. Escreva a função e calcule o custo de 6 km.",
          options: [],
          correctAnswer: null,
          points: 6,
        },
      ],
      materialIds: ["mat-algebra"],
      archived: false,
      createdAt,
      updatedAt: shift(now, -2 * 24 * 60),
    },
    {
      id: "assessment-fis",
      title: "Movimento e velocidade",
      subject: "Física",
      description:
        "Prova com preparação do aplicativo em um cenário de demonstração.",
      instructions:
        "Use as unidades apropriadas. Esta aplicação exige o estado simulado “Pronto” antes de iniciar ou retomar.",
      questions: [
        {
          id: "fis-q1",
          type: "single",
          prompt:
            "Um ciclista percorre 120 metros em 20 segundos. Qual é sua velocidade média?",
          options: ["4 m/s", "6 m/s", "10 m/s", "12 m/s"],
          correctAnswer: "6 m/s",
          points: 4,
        },
        {
          id: "fis-q2",
          type: "boolean",
          prompt: "No movimento uniforme, a velocidade permanece constante.",
          options: ["Verdadeiro", "Falso"],
          correctAnswer: "Verdadeiro",
          points: 2,
        },
        {
          id: "fis-q3",
          type: "open",
          prompt:
            "Explique a diferença entre distância percorrida e deslocamento, usando um exemplo.",
          options: [],
          correctAnswer: null,
          points: 4,
        },
      ],
      materialIds: ["mat-fis"],
      archived: false,
      createdAt,
      updatedAt: shift(now, -24 * 60),
    },
    {
      id: "assessment-geo",
      title: "Paisagens e território",
      subject: "Geografia",
      description: "Observação das transformações na paisagem.",
      instructions:
        "Considere paisagens naturais e modificadas pela ação humana.",
      questions: [
        {
          id: "geo-q1",
          type: "open",
          prompt:
            "Compare uma paisagem natural e uma paisagem urbana, citando duas diferenças.",
          options: [],
          correctAnswer: null,
          points: 10,
        },
      ],
      materialIds: [],
      archived: false,
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: "assessment-his",
      title: "Memórias da comunidade",
      subject: "História",
      description: "Atividade concluída sobre fontes históricas.",
      instructions: "Relacione documentos e relatos da comunidade.",
      questions: [
        {
          id: "his-q1",
          type: "open",
          prompt:
            "Como relatos orais podem contribuir para conhecer a história de uma comunidade?",
          options: [],
          correctAnswer: null,
          points: 10,
        },
      ],
      materialIds: [],
      archived: false,
      createdAt,
      updatedAt: createdAt,
    },
  ];
  const materials: Material[] = [
    {
      id: "mat-bio",
      title: "Caderno de apoio · Ecologia",
      subject: "Biologia",
      type: "file",
      fileName: "caderno-ecologia.txt",
      mimeType: "text/plain",
      size: new Blob([seedMaterialContent["mat-bio"]]).size,
      createdAt,
    },
    {
      id: "mat-algebra",
      title: "Revisão de álgebra",
      subject: "Matemática",
      type: "link",
      url: "https://pt.khanacademy.org/math/algebra",
      createdAt,
    },
    {
      id: "mat-fis",
      title: "Guia de fórmulas · Movimento",
      subject: "Física",
      type: "file",
      fileName: "guia-movimento.txt",
      mimeType: "text/plain",
      size: new Blob([seedMaterialContent["mat-fis"]]).size,
      createdAt,
    },
  ];
  const application = (
    index: number,
    code: string,
    start: number,
    end: number,
    duration: number,
    accessMode: "name" | "email" = "name",
    appRequired = false,
  ): Application => ({
    id: `application-${code.toLowerCase()}`,
    assessmentId: assessments[index].id,
    snapshot: structuredClone(assessments[index]),
    code,
    startAt: shift(now, start),
    endAt: shift(now, end),
    durationMinutes: duration,
    accessMode,
    allowedEmails:
      accessMode === "email"
        ? ["aluno@exemplo.com", "beatriz@exemplo.com"]
        : [],
    appRequired,
    status: "published",
    createdAt,
  });
  const applications = [
    application(0, "BIO101", -3 * 24 * 60, 7 * 24 * 60, 45),
    application(1, "MAT202", -24 * 60, 5 * 24 * 60, 50, "email"),
    application(2, "FIS303", -24 * 60, 3 * 24 * 60, 60, "name", true),
    application(3, "GEO404", 2 * 24 * 60, 3 * 24 * 60, 40),
    {
      ...application(4, "HIS505", -10 * 24 * 60, -7 * 24 * 60, 50),
      status: "closed" as const,
    },
  ];
  const attempt = (
    id: string,
    name: string,
    startedMinutes: number,
    overrides: Partial<Attempt> = {},
  ): Attempt => ({
    id,
    applicationId: applications[0].id,
    name,
    identifier: `AV-${id.slice(-6).toUpperCase()}`,
    startedAt: shift(now, startedMinutes),
    deadlineAt: shift(now, startedMinutes + 45),
    endedAt: shift(now, startedMinutes + 27),
    status: "submitted",
    correctionStatus: "pending",
    resultsReleased: false,
    answers: {
      "bio-q1": { questionId: "bio-q1", value: "Uma árvore", pointsAwarded: 3 },
      "bio-q2": { questionId: "bio-q2", value: "Verdadeiro", pointsAwarded: 2 },
      "bio-q3": {
        questionId: "bio-q3",
        value:
          "Podemos separar os resíduos para reciclagem e reduzir a quantidade enviada ao aterro.",
      },
    },
    feedback: "",
    score: null,
    ...overrides,
  });
  const attempts: Attempt[] = [
    attempt("attempt-a10001", "Marina Oliveira", -24 * 60, {
      correctionStatus: "graded",
      resultsReleased: true,
      score: 9,
      feedback:
        "Boa conexão entre os conceitos e a proposta para a escola. Continue detalhando os benefícios.",
      answers: {
        "bio-q1": {
          questionId: "bio-q1",
          value: "Uma árvore",
          pointsAwarded: 3,
        },
        "bio-q2": {
          questionId: "bio-q2",
          value: "Verdadeiro",
          pointsAwarded: 2,
        },
        "bio-q3": {
          questionId: "bio-q3",
          value:
            "A escola pode separar resíduos, encaminhar papel e plástico à reciclagem e diminuir o uso de descartáveis.",
          pointsAwarded: 4,
        },
      },
    }),
    attempt("attempt-a10002", "João Santos", -3 * 60),
    attempt("attempt-a10003", "Beatriz Costa", -2 * 60, {
      applicationId: applications[1].id,
      email: "beatriz@exemplo.com",
      deadlineAt: shift(now, -2 * 60 + 50),
      answers: {
        "mat-q1": { questionId: "mat-q1", value: "11", pointsAwarded: 4 },
        "mat-q2": {
          questionId: "mat-q2",
          value: "C(x) = 5 + 2x. Para 6 km, o custo é R$ 17.",
        },
      },
    }),
    attempt("attempt-a10004", "Lucas Lima", -90, {
      status: "expired",
      correctionStatus: "graded",
      score: 3,
      endedAt: shift(now, -45),
      answers: {
        "bio-q1": {
          questionId: "bio-q1",
          value: "Uma árvore",
          pointsAwarded: 3,
        },
      },
    }),
    attempt("attempt-a10005", "Ana Souza", -150, {
      status: "abandoned",
      answers: {},
    }),
    attempt("attempt-a10006", "Rafael Alves", -8 * 24 * 60, {
      applicationId: applications[4].id,
      deadlineAt: shift(now, -8 * 24 * 60 + 50),
      correctionStatus: "graded",
      resultsReleased: false,
      score: 8,
      feedback:
        "Resposta consistente. Você pode incluir mais exemplos de fontes.",
      answers: {
        "his-q1": {
          questionId: "his-q1",
          value:
            "Relatos ajudam a conhecer experiências e tradições que nem sempre aparecem nos documentos escritos.",
          pointsAwarded: 8,
        },
      },
    }),
  ];
  return {
    teacher: {
      id: "teacher-demo",
      name: "Marina Costa",
      email: "marina@exemplo.com",
      subject: "Biologia",
      institution: "Escola Horizonte",
    },
    assessments,
    materials,
    applications,
    attempts,
  };
}
