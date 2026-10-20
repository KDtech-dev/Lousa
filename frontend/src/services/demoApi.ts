import { createSeedDatabase, seedMaterialContent } from "../data/seed";
import type {
  Application,
  ApplicationInput,
  Assessment,
  Attempt,
  DemoDatabase,
  Material,
  NativeAppState,
  PublicApplication,
  PublicAssessment,
  PublicAttempt,
  Teacher,
} from "../types";
import { authorizeResume } from "./nativeApp";

export class DemoApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DemoApiError";
  }
}

export interface DemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface EmailChallenge {
  id: string;
  applicationId: string;
  email: string;
  code: string;
  expiresAt: number;
  token?: string;
  used?: boolean;
}
interface StoredState {
  version: 1;
  database: DemoDatabase;
  challenges: EmailChallenge[];
  answerSavedAt: Record<string, number>;
}
export interface DemoApiOptions {
  storage?: DemoStorage;
  storageKey?: string;
  now?: () => number;
  initialDatabase?: DemoDatabase;
  latency?: number;
}

const storageKey = "avaliacoes-online.demo.v1";
const memoryValues = new Map<string, string>();
const memoryStorage: DemoStorage = {
  getItem: (key) => memoryValues.get(key) ?? null,
  setItem: (key, value) => {
    memoryValues.set(key, value);
  },
};
const fileFallback = new Map<string, Blob>();
let sequence = 0;
const clone = <T>(value: T): T => structuredClone(value);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const nowISO = () => new Date().toISOString();
export function newId(prefix = "id"): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? `${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 12)}`}`;
}
function fail(code: string, message: string): never {
  throw new DemoApiError(code, message);
}

function defaultStorage(): DemoStorage {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    return {
      getItem: () =>
        fail(
          "LOCAL_STORAGE_FAILED",
          "O navegador não permite acessar o armazenamento local.",
        ),
      setItem: () =>
        fail(
          "LOCAL_STORAGE_FAILED",
          "O navegador não permite salvar dados locais.",
        ),
    };
  }
  return memoryStorage;
}

function createEmptyDatabase(): DemoDatabase {
  return {
    teacher: {
      id: "teacher-local",
      name: "Professor",
      email: "",
      subject: "",
      institution: "",
    },
    assessments: [],
    materials: [],
    applications: [],
    attempts: [],
  };
}

function materialDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("avaliacoes-online-materials-v1", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("files");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new DemoApiError(
          "MATERIAL_STORAGE_FAILED",
          "Não foi possível abrir o armazenamento local de arquivos.",
        ),
      );
  });
}
async function saveFile(id: string, blob: Blob): Promise<void> {
  const data = await blob.arrayBuffer();
  const database = await materialDatabase();
  if (!database) {
    fileFallback.set(id, blob);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction("files", "readwrite");
    transaction
      .objectStore("files")
      .put({ version: 1, data, mimeType: blob.type }, id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(
        new DemoApiError(
          "MATERIAL_STORAGE_FAILED",
          "Não foi possível salvar o arquivo neste navegador.",
        ),
      );
    };
    transaction.onabort = transaction.onerror;
  });
}
async function readFile(id: string): Promise<Blob | null> {
  const database = await materialDatabase();
  if (!database) return fileFallback.get(id) ?? null;
  return new Promise((resolve, reject) => {
    const request = database.transaction("files").objectStore("files").get(id);
    request.onsuccess = () => {
      database.close();
      const stored = request.result;
      resolve(
        stored instanceof Blob
          ? stored
          : stored?.version === 1 && stored.data instanceof ArrayBuffer
            ? new Blob([stored.data], {
                type: stored.mimeType || "application/octet-stream",
              })
            : null,
      );
    };
    request.onerror = () => {
      database.close();
      reject(
        new DemoApiError(
          "MATERIAL_STORAGE_FAILED",
          "Não foi possível ler o arquivo salvo neste navegador.",
        ),
      );
    };
  });
}

export function validateAssessment(input: Assessment): Assessment {
  const assessment = clone(input);
  assessment.title = assessment.title.trim();
  assessment.subject = assessment.subject.trim();
  if (!assessment.title)
    fail("INVALID_ASSESSMENT", "Informe o título da avaliação.");
  if (!assessment.subject)
    fail("INVALID_ASSESSMENT", "Informe a disciplina da avaliação.");
  if (!Array.isArray(assessment.questions) || !assessment.questions.length)
    fail("INVALID_ASSESSMENT", "Adicione pelo menos uma questão.");
  const questionIds = new Set<string>();
  assessment.questions = assessment.questions.map((question, index) => {
    const item = clone(question);
    item.prompt = item.prompt.trim();
    if (!item.id || questionIds.has(item.id))
      fail(
        "INVALID_QUESTION",
        `A questão ${index + 1} precisa de um identificador único.`,
      );
    questionIds.add(item.id);
    if (!item.prompt)
      fail("INVALID_QUESTION", `Informe o enunciado da questão ${index + 1}.`);
    if (!Number.isFinite(item.points) || item.points <= 0)
      fail(
        "INVALID_QUESTION",
        `A pontuação da questão ${index + 1} deve ser maior que zero.`,
      );
    if (!["single", "boolean", "open"].includes(item.type))
      fail(
        "INVALID_QUESTION",
        `Escolha um tipo válido para a questão ${index + 1}.`,
      );
    if (item.type === "open") {
      item.options = [];
      item.correctAnswer = null;
      return item;
    }
    if (item.type === "boolean") {
      item.options = ["Verdadeiro", "Falso"];
      if (item.correctAnswer === "true") item.correctAnswer = "Verdadeiro";
      if (item.correctAnswer === "false") item.correctAnswer = "Falso";
    } else {
      item.options = item.options.map((option) => option.trim());
      if (
        item.options.length < 2 ||
        item.options.some((option) => !option) ||
        new Set(item.options).size !== item.options.length
      )
        fail(
          "INVALID_QUESTION",
          `A questão ${index + 1} precisa de pelo menos duas alternativas diferentes e preenchidas.`,
        );
    }
    if (!item.correctAnswer || !item.options.includes(item.correctAnswer))
      fail("INVALID_QUESTION", `Selecione o gabarito da questão ${index + 1}.`);
    return item;
  });
  assessment.materialIds = [...new Set(assessment.materialIds)];
  return assessment;
}

export function sanitizeApplication(
  application: Application,
): PublicApplication {
  const {
    allowedEmails: _allowedEmails,
    assessmentId: _assessmentId,
    snapshot,
    ...publicApplication
  } = clone(application);
  const {
    archived: _archived,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    questions,
    ...publicAssessment
  } = snapshot;
  const safeSnapshot: PublicAssessment = {
    ...publicAssessment,
    questions: questions.map(
      ({ correctAnswer: _correctAnswer, ...question }) => question,
    ),
  };
  return { ...publicApplication, snapshot: safeSnapshot };
}

export function sanitizeAttempt(attempt: Attempt): PublicAttempt {
  const { answers, score, feedback, ...publicAttempt } = clone(attempt);
  const answerValues = Object.fromEntries(
    Object.entries(answers).map(([id, answer]) => [
      id,
      { questionId: answer.questionId, value: answer.value },
    ]),
  );
  const result: PublicAttempt = { ...publicAttempt, answers: answerValues };
  if (
    attempt.resultsReleased &&
    attempt.correctionStatus === "graded" &&
    ["submitted", "expired"].includes(attempt.status)
  ) {
    result.score = score;
    result.feedback = feedback;
    result.answerFeedback = Object.fromEntries(
      Object.entries(answers)
        .filter(([, answer]) => answer.feedback)
        .map(([id, answer]) => [id, answer.feedback!]),
    );
  }
  return result;
}

export function createDemoApi(options: DemoApiOptions = {}) {
  const storage = options.storage ?? defaultStorage();
  const stateStorageKey = options.storageKey ?? storageKey;
  const now = options.now ?? Date.now;
  const latency = options.latency ?? 40;
  const pause = () =>
    latency > 0
      ? new Promise<void>((resolve) => setTimeout(resolve, latency))
      : Promise.resolve();
  const persist = (state: StoredState) => {
    try {
      storage.setItem(stateStorageKey, JSON.stringify(state));
    } catch {
      fail(
        "LOCAL_STORAGE_FAILED",
        "Não foi possível salvar os dados locais. Verifique o espaço e as permissões deste navegador.",
      );
    }
  };
  const load = (): StoredState => {
    let raw: string | null = null;
    try {
      raw = storage.getItem(stateStorageKey);
    } catch {
      fail(
        "LOCAL_STORAGE_FAILED",
        "Não foi possível acessar os dados locais deste navegador.",
      );
    }
    if (raw) {
      try {
        const state = JSON.parse(raw) as StoredState;
        if (
          state.version === 1 &&
          state.database?.teacher &&
          Array.isArray(state.database.assessments) &&
          Array.isArray(state.database.applications) &&
          Array.isArray(state.database.attempts) &&
          Array.isArray(state.database.materials)
        )
          return {
            ...state,
            challenges: state.challenges ?? [],
            answerSavedAt: state.answerSavedAt ?? {},
          };
      } catch {
        /* Dados inválidos são substituídos pelos exemplos iniciais. */
      }
    }
    const state: StoredState = {
      version: 1,
      database: clone(options.initialDatabase ?? createSeedDatabase(now())),
      challenges: [],
      answerSavedAt: {},
    };
    persist(state);
    return state;
  };
  const findApplication = (state: StoredState, code: string) =>
    state.database.applications.find(
      (item) => item.code === code.trim().toUpperCase(),
    ) ??
    fail(
      "APP_NOT_FOUND",
      "Esse código não corresponde a uma aplicação. Confira o link ou o código informado.",
    );
  const applicationById = (state: StoredState, id: string) =>
    state.database.applications.find((item) => item.id === id) ??
    fail("APP_NOT_FOUND", "A aplicação não foi encontrada.");
  const attemptById = (state: StoredState, id: string) =>
    state.database.attempts.find((item) => item.id === id) ??
    fail(
      "ATTEMPT_NOT_FOUND",
      "Esta participação não foi encontrada neste navegador.",
    );
  const available = (application: Application) => {
    if (
      application.status === "closed" ||
      now() >= Date.parse(application.endAt)
    )
      fail(
        "APP_CLOSED",
        "Esta aplicação está encerrada e não aceita novas participações.",
      );
    if (now() < Date.parse(application.startAt))
      fail(
        "APP_NOT_OPEN",
        `Esta aplicação ainda não está aberta. A abertura está marcada para ${new Date(application.startAt).toLocaleString("pt-BR")}.`,
      );
  };
  const correctObjective = (attempt: Attempt, application: Application) => {
    let score = 0;
    let pending = false;
    for (const question of application.snapshot.questions) {
      const answer = attempt.answers[question.id];
      if (question.type === "open") {
        if (answer?.value.trim() && answer.pointsAwarded === undefined)
          pending = true;
        score += answer?.pointsAwarded ?? 0;
      } else if (answer) {
        answer.pointsAwarded =
          answer.value === question.correctAnswer ? question.points : 0;
        score += answer.pointsAwarded;
      }
    }
    attempt.correctionStatus = pending ? "pending" : "graded";
    attempt.score = pending ? null : Math.round(score * 100) / 100;
  };
  const end = (
    attempt: Attempt,
    application: Application,
    kind: Attempt["status"],
    endedAt = now(),
  ) => {
    if (attempt.status !== "in_progress") return;
    attempt.status = kind;
    attempt.endedAt = new Date(
      Math.min(endedAt, Date.parse(attempt.deadlineAt)),
    ).toISOString();
    correctObjective(attempt, application);
  };
  const synchronizeDeadlines = (state: StoredState) => {
    let changed = false;
    for (const attempt of state.database.attempts) {
      if (attempt.status !== "in_progress") continue;
      const application = applicationById(state, attempt.applicationId);
      if (
        now() >= Date.parse(attempt.deadlineAt) ||
        application.status === "closed"
      ) {
        // Apenas o último rascunho salvo dentro do prazo pode compor as respostas finais.
        try {
          const raw = storage.getItem(`ao.demo.draft.${attempt.id}`);
          const draft = raw
            ? (JSON.parse(raw) as {
                answers?: Record<string, unknown>;
                savedAt?: string;
              })
            : null;
          const savedAt = Date.parse(draft?.savedAt ?? "");
          if (
            draft?.answers &&
            typeof draft.answers === "object" &&
            !Array.isArray(draft.answers) &&
            Number.isFinite(savedAt) &&
            savedAt >= Date.parse(attempt.startedAt) &&
            savedAt <= Math.min(now(), Date.parse(attempt.deadlineAt)) &&
            savedAt >= (state.answerSavedAt[attempt.id] ?? 0)
          ) {
            const entries = Object.entries(draft.answers);
            const valid = entries.every(([id, value]) => {
              const question = application.snapshot.questions.find(
                (item) => item.id === id,
              );
              return (
                question &&
                typeof value === "string" &&
                (!value ||
                  question.type === "open" ||
                  question.options.includes(value))
              );
            });
            if (valid)
              attempt.answers = Object.fromEntries(
                entries
                  .filter(([, value]) => (value as string).trim())
                  .map(([id, value]) => [
                    id,
                    { questionId: id, value: value as string },
                  ]),
              );
          }
        } catch {
          /* Um rascunho inválido não altera as respostas sincronizadas. */
        }
        end(attempt, application, "expired");
        changed = true;
      }
    }
    if (changed) persist(state);
  };
  const readState = () => {
    const state = load();
    synchronizeDeadlines(state);
    return state;
  };

  return {
    async getTeacher(): Promise<Teacher> {
      await pause();
      return clone(readState().database.teacher);
    },
    async updateTeacher(input: Omit<Teacher, "id">): Promise<Teacher> {
      await pause();
      const fields = ["name", "email", "subject", "institution"] as const;
      if (fields.some((field) => typeof input[field] !== "string"))
        fail("INVALID_PROFILE", "Preencha os dados do perfil.");
      const profile = {
        name: input.name.trim(),
        email: normalizeEmail(input.email),
        subject: input.subject.trim(),
        institution: input.institution.trim(),
      };
      if (!profile.name || profile.name.length > 120)
        fail("INVALID_PROFILE", "Informe um nome com até 120 caracteres.");
      if (!emailPattern.test(profile.email) || profile.email.length > 254)
        fail("INVALID_EMAIL", "Informe um e-mail válido.");
      if (!profile.subject || profile.subject.length > 120)
        fail(
          "INVALID_PROFILE",
          "Informe uma disciplina com até 120 caracteres.",
        );
      if (!profile.institution || profile.institution.length > 200)
        fail(
          "INVALID_PROFILE",
          "Informe uma instituição com até 200 caracteres.",
        );
      const state = readState();
      state.database.teacher = { id: state.database.teacher.id, ...profile };
      persist(state);
      return clone(state.database.teacher);
    },
    async login(email: string): Promise<Teacher> {
      await pause();
      if (!emailPattern.test(normalizeEmail(email)))
        fail(
          "INVALID_EMAIL",
          "Informe um e-mail válido para continuar.",
        );
      return clone(readState().database.teacher);
    },
    async listAssessments(): Promise<Assessment[]> {
      await pause();
      return clone(readState().database.assessments);
    },
    async saveAssessment(input: Assessment): Promise<Assessment> {
      await pause();
      let state = readState();
      const assessment = validateAssessment(input);
      if (
        assessment.materialIds.some(
          (id) =>
            !state.database.materials.some((material) => material.id === id),
        )
      )
        fail(
          "INVALID_MATERIAL",
          "Um dos materiais associados não foi encontrado.",
        );
      const existing = state.database.assessments.find(
        (item) => item.id === assessment.id,
      );
      const updated: Assessment = {
        ...assessment,
        id: existing?.id ?? (assessment.id || newId("assessment")),
        createdAt: existing?.createdAt ?? new Date(now()).toISOString(),
        updatedAt: new Date(now()).toISOString(),
      };
      if (existing)
        state.database.assessments[
          state.database.assessments.indexOf(existing)
        ] = updated;
      else state.database.assessments.push(updated);
      persist(state);
      return clone(updated);
    },
    async duplicateAssessment(id: string): Promise<Assessment> {
      await pause();
      const state = readState();
      const original =
        state.database.assessments.find((item) => item.id === id) ??
        fail("ASSESSMENT_NOT_FOUND", "A avaliação não foi encontrada.");
      const copied: Assessment = {
        ...clone(original),
        id: newId("assessment"),
        title: `${original.title} (cópia)`,
        archived: false,
        questions: original.questions.map((question) => ({
          ...clone(question),
          id: newId("question"),
        })),
        createdAt: new Date(now()).toISOString(),
        updatedAt: new Date(now()).toISOString(),
      };
      state.database.assessments.push(copied);
      persist(state);
      return clone(copied);
    },
    async archiveAssessment(id: string): Promise<void> {
      await pause();
      const state = readState();
      const assessment =
        state.database.assessments.find((item) => item.id === id) ??
        fail("ASSESSMENT_NOT_FOUND", "A avaliação não foi encontrada.");
      assessment.archived = true;
      assessment.updatedAt = new Date(now()).toISOString();
      persist(state);
    },
    async listMaterials(): Promise<Material[]> {
      await pause();
      return clone(readState().database.materials);
    },
    async saveMaterial(input: Material, file?: File): Promise<Material> {
      await pause();
      let state = readState();
      const material = clone(input);
      material.title = material.title.trim();
      material.subject = material.subject.trim();
      if (!material.title || !material.subject)
        fail(
          "INVALID_MATERIAL",
          "Preencha o título e a disciplina do material.",
        );
      material.id ||= newId("material");
      material.createdAt ||= new Date(now()).toISOString();
      if (material.type === "link") {
        let url: URL;
        try {
          url = new URL(material.url ?? "");
        } catch {
          fail(
            "INVALID_URL",
            "Informe um link completo, começando com https:// ou http://.",
          );
        }
        if (!["https:", "http:"].includes(url!.protocol))
          fail("INVALID_URL", "Use um link com https:// ou http://.");
        material.url = url!.toString();
        delete material.fileName;
        delete material.mimeType;
        delete material.size;
      } else if (material.type === "file") {
        if (
          !file &&
          !state.database.materials.some(
            (item) => item.id === material.id && item.type === "file",
          )
        )
          fail(
            "INVALID_FILE",
            "Selecione o arquivo que será salvo localmente.",
          );
        if (file) {
          await saveFile(material.id, file);
          state = readState();
          material.fileName = file.name;
          material.mimeType = file.type || "application/octet-stream";
          material.size = file.size;
        }
        delete material.url;
      } else fail("INVALID_MATERIAL", "Escolha um tipo válido de material.");
      const index = state.database.materials.findIndex(
        (item) => item.id === material.id,
      );
      if (index >= 0) state.database.materials[index] = material;
      else state.database.materials.push(material);
      persist(state);
      return clone(material);
    },
    async getMaterialBlob(id: string): Promise<Blob | null> {
      await pause();
      const material = readState().database.materials.find(
        (item) => item.id === id,
      );
      if (!material || material.type !== "file") return null;
      return (
        (await readFile(id)) ??
        (seedMaterialContent[id]
          ? new Blob([seedMaterialContent[id]], {
              type: material.mimeType ?? "text/plain",
            })
          : null)
      );
    },
    async listApplications(): Promise<Application[]> {
      await pause();
      return clone(readState().database.applications);
    },
    async publishApplication(input: ApplicationInput): Promise<Application> {
      await pause();
      const state = readState();
      const assessment =
        state.database.assessments.find(
          (item) => item.id === input.assessmentId,
        ) ?? fail("ASSESSMENT_NOT_FOUND", "Selecione uma avaliação existente.");
      if (assessment.archived)
        fail(
          "ASSESSMENT_ARCHIVED",
          "Uma avaliação arquivada não pode receber novas aplicações.",
        );
      const snapshot = validateAssessment(assessment);
      const start = Date.parse(input.startAt);
      const finish = Date.parse(input.endAt);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(finish) ||
        finish <= start
      )
        fail(
          "INVALID_PERIOD",
          "Informe um período válido: o encerramento deve ocorrer depois da abertura.",
        );
      if (finish <= now())
        fail(
          "INVALID_PERIOD",
          "O encerramento da aplicação precisa estar no futuro.",
        );
      if (
        !Number.isInteger(input.durationMinutes) ||
        input.durationMinutes < 1 ||
        input.durationMinutes > 1440
      )
        fail(
          "INVALID_DURATION",
          "A duração deve ser um número inteiro entre 1 e 1.440 minutos.",
        );
      if (!["name", "email"].includes(input.accessMode))
        fail(
          "INVALID_ACCESS",
          "Escolha a identificação por nome ou por e-mail autorizado.",
        );
      const emails = [
        ...new Set(input.allowedEmails.map(normalizeEmail).filter(Boolean)),
      ];
      if (
        input.accessMode === "email" &&
        (!emails.length || emails.some((email) => !emailPattern.test(email)))
      )
        fail(
          "INVALID_EMAIL_LIST",
          "Adicione pelo menos um e-mail autorizado e confira os endereços da lista.",
        );
      let code = newId("code")
        .replace(/[^a-z0-9]/gi, "")
        .slice(-8)
        .toUpperCase();
      while (state.database.applications.some((item) => item.code === code))
        code = newId("code")
          .replace(/[^a-z0-9]/gi, "")
          .slice(-8)
          .toUpperCase();
      const application: Application = {
        id: newId("application"),
        assessmentId: assessment.id,
        snapshot: clone(snapshot),
        code,
        startAt: new Date(start).toISOString(),
        endAt: new Date(finish).toISOString(),
        durationMinutes: input.durationMinutes,
        accessMode: input.accessMode,
        allowedEmails: input.accessMode === "email" ? emails : [],
        appRequired: Boolean(input.appRequired),
        status: "published",
        createdAt: new Date(now()).toISOString(),
      };
      state.database.applications.push(application);
      persist(state);
      return clone(application);
    },
    async closeApplication(id: string): Promise<void> {
      await pause();
      const state = readState();
      applicationById(state, id).status = "closed";
      synchronizeDeadlines(state);
      persist(state);
    },
    async listAttempts(): Promise<Attempt[]> {
      await pause();
      return clone(readState().database.attempts);
    },
    async getAttempt(id: string): Promise<Attempt> {
      await pause();
      return clone(attemptById(readState(), id));
    },
    async gradeAttempt(
      id: string,
      grades: Record<string, number>,
      feedback: string,
    ): Promise<Attempt> {
      await pause();
      const state = readState();
      const attempt = attemptById(state, id);
      if (attempt.status === "in_progress")
        fail(
          "ATTEMPT_IN_PROGRESS",
          "Aguarde o encerramento da participação para corrigir as respostas.",
        );
      if (attempt.status === "abandoned")
        fail(
          "ATTEMPT_ABANDONED",
          "Uma participação encerrada por desistência não recebe correção ou resultado.",
        );
      const application = applicationById(state, attempt.applicationId);
      for (const question of application.snapshot.questions.filter(
        (item) => item.type === "open",
      )) {
        const answer = attempt.answers[question.id];
        const grade =
          grades[question.id] ?? (answer?.value.trim() ? undefined : 0);
        if (
          grade === undefined ||
          !Number.isFinite(grade) ||
          grade < 0 ||
          grade > question.points
        )
          fail(
            "INVALID_GRADE",
            `Informe uma nota entre 0 e ${question.points} para cada questão aberta.`,
          );
        if (answer) answer.pointsAwarded = grade;
      }
      attempt.feedback = feedback.trim();
      correctObjective(attempt, application);
      persist(state);
      return clone(attempt);
    },
    async setResultsReleased(id: string, released: boolean): Promise<Attempt> {
      await pause();
      const state = readState();
      const attempt = attemptById(state, id);
      if (
        released &&
        (!["submitted", "expired"].includes(attempt.status) ||
          attempt.correctionStatus !== "graded")
      )
        fail(
          "RESULT_NOT_READY",
          "Finalize a correção de uma participação entregue ou expirada antes de liberar o resultado ao aluno.",
        );
      attempt.resultsReleased = released;
      persist(state);
      return clone(attempt);
    },
    async getPublicApplication(code: string): Promise<PublicApplication> {
      await pause();
      return sanitizeApplication(findApplication(readState(), code));
    },
    async requestEmailCode(
      code: string,
      email: string,
    ): Promise<{ demoCode: string; verificationId: string }> {
      await pause();
      const state = readState();
      const application = findApplication(state, code);
      available(application);
      if (application.accessMode !== "email")
        fail(
          "EMAIL_NOT_REQUIRED",
          "Esta aplicação usa a identificação por nome.",
        );
      const normalized = normalizeEmail(email);
      if (!emailPattern.test(normalized))
        fail("INVALID_EMAIL", "Informe um e-mail válido.");
      if (!application.allowedEmails.includes(normalized))
        fail(
          "EMAIL_NOT_ALLOWED",
          "Este e-mail não está na lista autorizada pelo professor.",
        );
      const challenge: EmailChallenge = {
        id: newId("verification"),
        applicationId: application.id,
        email: normalized,
        code: `${Math.floor(100000 + Math.random() * 900000)}`,
        expiresAt: now() + 10 * 60_000,
      };
      state.challenges = state.challenges.filter(
        (item) => item.expiresAt > now(),
      );
      state.challenges.push(challenge);
      persist(state);
      return { demoCode: challenge.code, verificationId: challenge.id };
    },
    async verifyEmailCode(
      verificationId: string,
      code: string,
    ): Promise<string> {
      await pause();
      const state = readState();
      const challenge = state.challenges.find(
        (item) => item.id === verificationId,
      );
      if (!challenge || challenge.used || challenge.expiresAt <= now())
        fail(
          "VERIFICATION_EXPIRED",
          "O código expirou. Solicite um novo código.",
        );
      if (challenge.code !== code.trim())
        fail(
          "INVALID_VERIFICATION_CODE",
          "O código informado está incorreto. Confira e tente novamente.",
        );
      challenge.token = newId("verified");
      persist(state);
      return challenge.token;
    },
    async startAttempt(
      code: string,
      input: {
        name: string;
        email?: string;
        verificationToken?: string;
        appState?: NativeAppState;
      },
    ): Promise<PublicAttempt> {
      await pause();
      let state = readState();
      let application = findApplication(state, code);
      available(application);
      const name = input.name.trim();
      if (!name || name.length > 120)
        fail("INVALID_NAME", "Informe seu nome, com até 120 caracteres.");
      await authorizeResume(
        input.appState ?? "pending",
        application.appRequired,
      );
      state = readState();
      application = findApplication(state, code);
      available(application);
      let email: string | undefined;
      if (application.accessMode === "email") {
        email = normalizeEmail(input.email ?? "");
        if (!application.allowedEmails.includes(email))
          fail(
            "EMAIL_NOT_ALLOWED",
            "Este e-mail não está na lista autorizada pelo professor.",
          );
        const challenge = state.challenges.find(
          (item) =>
            item.token === input.verificationToken &&
            item.applicationId === application.id &&
            item.email === email,
        );
        if (
          !input.verificationToken ||
          !challenge ||
          challenge.used ||
          challenge.expiresAt <= now()
        )
          fail(
            "EMAIL_NOT_VERIFIED",
            "Verifique seu e-mail antes de iniciar a atividade.",
          );
        challenge.used = true;
      }
      const id = newId("attempt");
      const startedAt = now();
      const attempt: Attempt = {
        id,
        applicationId: application.id,
        name,
        ...(email ? { email } : {}),
        identifier: `AV-${id
          .replace(/[^a-z0-9]/gi, "")
          .slice(-8)
          .toUpperCase()}`,
        startedAt: new Date(startedAt).toISOString(),
        deadlineAt: new Date(
          Math.min(
            Date.parse(application.endAt),
            startedAt + application.durationMinutes * 60_000,
          ),
        ).toISOString(),
        status: "in_progress",
        correctionStatus: "pending",
        resultsReleased: false,
        answers: {},
        feedback: "",
        score: null,
      };
      state.database.attempts.push(attempt);
      persist(state);
      return sanitizeAttempt(attempt);
    },
    async resumeAttempt(
      id: string,
      appState: NativeAppState = "pending",
    ): Promise<PublicAttempt> {
      await pause();
      const state = readState();
      const attempt = attemptById(state, id);
      if (attempt.status === "in_progress")
        await authorizeResume(
          appState,
          applicationById(state, attempt.applicationId).appRequired,
        );
      return sanitizeAttempt(attempt);
    },
    async saveAnswers(
      id: string,
      answers: Record<string, string>,
      simulateFailure = false,
    ): Promise<PublicAttempt> {
      const requestedAt = now();
      await pause();
      const state = readState();
      const attempt = attemptById(state, id);
      if (attempt.status !== "in_progress")
        fail(
          "ATTEMPT_FINISHED",
          "Esta participação já foi encerrada. As respostas finais foram preservadas.",
        );
      if (simulateFailure)
        fail(
          "SYNC_FAILED",
          "Não foi possível enviar as respostas. Elas continuam salvas neste dispositivo; tente novamente.",
        );
      const application = applicationById(state, attempt.applicationId);
      const updated: Attempt["answers"] = {};
      for (const [questionId, value] of Object.entries(answers)) {
        const question = application.snapshot.questions.find(
          (item) => item.id === questionId,
        );
        if (!question || typeof value !== "string")
          fail(
            "INVALID_ANSWER",
            "Uma das respostas não corresponde às questões desta aplicação.",
          );
        if (
          question.type !== "open" &&
          value &&
          !question.options.includes(value)
        )
          fail("INVALID_ANSWER", "Selecione uma das alternativas disponíveis.");
        if (value.trim()) updated[questionId] = { questionId, value };
      }
      attempt.answers = updated;
      state.answerSavedAt[id] = requestedAt;
      persist(state);
      return sanitizeAttempt(attempt);
    },
    async finishAttempt(
      id: string,
      kind: "submitted" | "abandoned" = "submitted",
    ): Promise<PublicAttempt> {
      await pause();
      const state = readState();
      const attempt = attemptById(state, id);
      if (!["submitted", "abandoned"].includes(kind))
        fail("INVALID_STATUS", "Escolha entregar ou desistir da participação.");
      end(attempt, applicationById(state, attempt.applicationId), kind);
      persist(state);
      return sanitizeAttempt(attempt);
    },
    async getPublicAttempt(id: string): Promise<PublicAttempt> {
      await pause();
      return sanitizeAttempt(attemptById(readState(), id));
    },
    async getPublicMaterials(code: string): Promise<Material[]> {
      await pause();
      const state = readState();
      const application = findApplication(state, code);
      return clone(
        state.database.materials.filter((material) =>
          application.snapshot.materialIds.includes(material.id),
        ),
      );
    },
  };
}

const runtimeDatabase =
  import.meta.env.VITE_LOUSA_TEST_TOOLS === "true"
    ? createSeedDatabase()
    : createEmptyDatabase();

const testToolsEnabled = import.meta.env.VITE_LOUSA_TEST_TOOLS === "true";
export const demoApi = createDemoApi({
  initialDatabase: runtimeDatabase,
  storageKey: testToolsEnabled ? undefined : "lousa.local.v2",
});

export const {
  getTeacher,
  updateTeacher,
  login,
  listAssessments,
  saveAssessment,
  duplicateAssessment,
  archiveAssessment,
  listMaterials,
  saveMaterial,
  getMaterialBlob,
  listApplications,
  publishApplication,
  closeApplication,
  listAttempts,
  getAttempt,
  gradeAttempt,
  setResultsReleased,
  getPublicApplication,
  requestEmailCode,
  verifyEmailCode,
  startAttempt,
  resumeAttempt,
  saveAnswers,
  finishAttempt,
  getPublicAttempt,
  getPublicMaterials,
} = demoApi;
