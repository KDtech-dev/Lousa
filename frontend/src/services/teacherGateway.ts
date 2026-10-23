import { demoApi, newId } from "./demoApi";
import type {
  Application,
  Assessment,
  Attempt,
  Material,
  Question,
  Teacher,
} from "../types";

export type RuntimeMode = "demo" | "api";
const configuredMode = import.meta.env.VITE_LOUSA_MODE?.trim().toLowerCase();
export const runtimeMode: RuntimeMode =
  configuredMode === "demo" ? "demo" : "api";
export const isDemoMode = runtimeMode === "demo";
export const isTestToolsEnabled =
  import.meta.env.VITE_LOUSA_TEST_TOOLS === "true";

export interface TeacherDashboardData {
  teacher: Teacher;
  assessments: Assessment[];
  applications: Application[];
  attempts: Attempt[];
  materials: Material[];
}

export interface GenerateActivityInput {
  prompt: string;
  subject: string;
  questionCount: number;
}

export interface GeneratedActivity {
  activity: Assessment;
  source: RuntimeMode;
}

export class IntegrationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
  }
}

const env = import.meta.env;
const sessionKey = "ao.teacher.session";
let logoutAfterNavigation = false;

export function requestLogoutAfterNavigation() {
  logoutAfterNavigation = true;
}

export function cancelPendingLogout() {
  logoutAfterNavigation = false;
}

export function consumePendingLogout(): boolean {
  const pending = logoutAfterNavigation;
  logoutAfterNavigation = false;
  return pending;
}

function configuredPath(_name: string, value?: string): string {
  const path = value?.trim();
  if (!path) {
    throw new IntegrationError(
      "CONTRACT_NOT_CONFIGURED",
      "Este recurso está temporariamente indisponível. Tente novamente mais tarde.",
    );
  }
  return path;
}

function resolveUrl(path: string): string {
  const base = (env.VITE_LOUSA_API_BASE_URL || window.location.origin).replace(
    /\/+$/,
    "",
  );
  return `${base}/${path.replace(/^\/+/, "")}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    const method = (init.method ?? "GET").toUpperCase();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !(init.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    const csrfPath = env.VITE_LOUSA_API_CSRF_PATH?.trim();
    if (csrfPath && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrf = await fetch(resolveUrl(csrfPath), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!csrf.ok) {
        throw new IntegrationError(
          "CSRF_SETUP_FAILED",
          "Não foi possível preparar o acesso com segurança. Tente novamente.",
        );
      }
      const cookie = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("XSRF-TOKEN="));
      if (!cookie) {
        throw new IntegrationError(
          "CSRF_TOKEN_MISSING",
          "Não foi possível validar o acesso. Tente novamente.",
        );
      }
      headers.set("X-XSRF-TOKEN", decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)));
    }
    response = await fetch(resolveUrl(path), {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    throw new IntegrationError(
      "NETWORK_ERROR",
      "Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.",
    );
  }

  const responseText = await response.text();
  const body: unknown = responseText
    ? await Promise.resolve()
        .then(() => JSON.parse(responseText) as unknown)
        .catch(() => null)
    : null;
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : response.status === 401 || response.status === 422
          ? "E-mail ou senha inválidos. Confira os dados e tente novamente."
          : "Não foi possível concluir a operação. Tente novamente.";
    throw new IntegrationError(`HTTP_${response.status}`, message);
  }
  if (body === null && response.status === 204) return null as T;
  if (body === null) {
    throw new IntegrationError(
      "INVALID_RESPONSE",
      "Não foi possível concluir a operação. Tente novamente mais tarde.",
    );
  }
  return body as T;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapData(value: unknown): unknown {
  const object = objectValue(value);
  return object && "data" in object ? object.data : value;
}

function teacherFrom(value: unknown): Teacher {
  const root = objectValue(unwrapData(value));
  const nestedTeacher = root ? objectValue(root.teacher) : null;
  const candidate: Record<string, unknown> | null = nestedTeacher ?? root;
  if (!candidate) throw invalidResponse("perfil do professor");
  const role = candidate.role;
  if (role !== "teacher" && role !== "professor") {
    throw new IntegrationError(
      "FORBIDDEN_ROLE",
      "Esta conta não tem perfil de professor.",
    );
  }
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    !candidate.id.trim() ||
    !candidate.name.trim() ||
    !candidate.email.trim()
  ) {
    throw invalidResponse("perfil do professor");
  }
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    subject: typeof candidate.subject === "string" ? candidate.subject : "",
    institution:
      typeof candidate.institution === "string" ? candidate.institution : "",
  };
}

function invalidResponse(_expected: string): IntegrationError {
  return new IntegrationError(
    "INVALID_RESPONSE",
    "Não foi possível carregar estas informações. Tente novamente mais tarde.",
  );
}

function stringArrayFrom(value: unknown, expected: string): string[] {
  if (!Array.isArray(value)) throw invalidResponse(expected);
  const strings = value.filter((entry): entry is string => typeof entry === "string");
  if (strings.length !== value.length) throw invalidResponse(expected);
  return strings;
}

function questionsFrom(value: unknown): Question[] {
  if (!Array.isArray(value) || value.length === 0)
    throw invalidResponse("questões da atividade");
  return value.map((entry) => {
    const question = objectValue(entry);
    if (
      !question ||
      !["single", "boolean", "open"].includes(String(question.type)) ||
      typeof question.prompt !== "string" ||
      !question.prompt.trim() ||
      typeof question.points !== "number" ||
      !Number.isFinite(question.points) ||
      question.points <= 0 ||
      question.points > 10000
    ) {
      throw invalidResponse("questão");
    }
    const type = question.type as Question["type"];
    const options = Array.isArray(question.options)
      ? question.options.filter((option): option is string => typeof option === "string")
      : type === "boolean"
        ? ["Verdadeiro", "Falso"]
        : [];
    const hasValidOptionList =
      Array.isArray(question.options) &&
      options.length === question.options.length;
    const correctAnswer =
      typeof question.correctAnswer === "string" ? question.correctAnswer : null;
    if (
      type === "single" &&
      (options.length < 2 ||
        !hasValidOptionList ||
        options.some((option) => !option.trim()) ||
        new Set(options.map((option) => option.trim().toLocaleLowerCase("pt-BR"))).size !== options.length ||
        !correctAnswer ||
        !options.includes(correctAnswer))
    ) {
      throw invalidResponse("alternativas e gabarito da questão");
    }
    if (
      type === "boolean" &&
      !["Verdadeiro", "Falso"].includes(correctAnswer ?? "")
    ) {
      throw invalidResponse("gabarito da questão verdadeiro/falso");
    }
    return {
      id: typeof question.id === "string" ? question.id : newId("question"),
      type,
      prompt: question.prompt,
      options: type === "boolean" ? ["Verdadeiro", "Falso"] : options,
      correctAnswer: type === "open" ? null : correctAnswer,
      points: question.points,
    };
  });
}

function assessmentListFrom(value: unknown): Assessment[] {
  const list = unwrapData(value);
  if (!Array.isArray(list)) throw invalidResponse("lista de atividades");
  return list.map((entry) => {
    const candidate = objectValue(entry);
    if (
      !candidate ||
      typeof candidate.id !== "string" ||
      typeof candidate.title !== "string" ||
      !candidate.title.trim() ||
      typeof candidate.subject !== "string" ||
      !candidate.subject.trim() ||
      typeof candidate.description !== "string" ||
      typeof candidate.instructions !== "string" ||
      typeof candidate.archived !== "boolean" ||
      !Array.isArray(candidate.materialIds) ||
      typeof candidate.createdAt !== "string" ||
      typeof candidate.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(candidate.createdAt)) ||
      !Number.isFinite(Date.parse(candidate.updatedAt))
    ) {
      throw invalidResponse("atividade");
    }
    return {
      id: candidate.id,
      title: candidate.title,
      subject: candidate.subject,
      description:
        typeof candidate.description === "string" ? candidate.description : "",
      instructions:
        typeof candidate.instructions === "string" ? candidate.instructions : "",
      questions: questionsFrom(candidate.questions),
      materialIds: stringArrayFrom(candidate.materialIds, "materiais da atividade"),
      archived: candidate.archived,
      createdAt: candidate.createdAt,
      updatedAt: candidate.updatedAt,
    };
  });
}

function applicationsFrom(value: unknown): Application[] {
  if (!Array.isArray(value)) throw invalidResponse("aplicações do dashboard");
  return value.map((entry) => {
    const item = objectValue(entry);
    const snapshot = item ? objectValue(item.snapshot) : null;
    if (
      !item ||
      !snapshot ||
      typeof item.id !== "string" ||
      typeof item.assessmentId !== "string" ||
      typeof snapshot.title !== "string" ||
      typeof snapshot.subject !== "string" ||
      typeof item.code !== "string" ||
      typeof item.startAt !== "string" ||
      typeof item.endAt !== "string" ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(Date.parse(item.startAt)) ||
      !Number.isFinite(Date.parse(item.endAt)) ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      typeof item.durationMinutes !== "number" ||
      !Number.isFinite(item.durationMinutes) ||
      item.durationMinutes <= 0 ||
      (item.accessMode !== "name" && item.accessMode !== "email") ||
      !Array.isArray(item.allowedEmails) ||
      typeof item.appRequired !== "boolean" ||
      (item.status !== "published" && item.status !== "closed")
    ) {
      throw invalidResponse("aplicação do dashboard");
    }
    return {
      ...(item as unknown as Application),
      allowedEmails: stringArrayFrom(item.allowedEmails, "e-mails da aplicação"),
    };
  });
}

function attemptsFrom(value: unknown): Attempt[] {
  if (!Array.isArray(value)) throw invalidResponse("participações do dashboard");
  return value.map((entry) => {
    const item = objectValue(entry);
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.applicationId !== "string" ||
      typeof item.name !== "string" ||
      typeof item.startedAt !== "string" ||
      typeof item.deadlineAt !== "string" ||
      !Number.isFinite(Date.parse(item.startedAt)) ||
      !Number.isFinite(Date.parse(item.deadlineAt)) ||
      !["in_progress", "submitted", "abandoned", "expired"].includes(
        String(item.status),
      ) ||
      (item.correctionStatus !== "pending" && item.correctionStatus !== "graded")
    ) {
      throw invalidResponse("participação do dashboard");
    }
    return item as unknown as Attempt;
  });
}

function materialsFrom(value: unknown): Material[] {
  if (!Array.isArray(value)) throw invalidResponse("lista de materiais");
  return value.map((entry) => {
    const item = objectValue(entry);
    if (
      !item ||
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.subject !== "string" ||
      (item.type !== "file" && item.type !== "link") ||
      typeof item.createdAt !== "string" ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      (item.type === "link" && typeof item.url !== "string")
    ) {
      throw invalidResponse("material");
    }
    return item as unknown as Material;
  });
}

function dashboardFrom(value: unknown): TeacherDashboardData {
  const root = objectValue(unwrapData(value));
  if (!root) {
    throw invalidResponse("dashboard do professor");
  }
  return {
    teacher: teacherFrom(root.teacher),
    assessments: assessmentListFrom(root.assessments),
    applications: applicationsFrom(root.applications),
    attempts: attemptsFrom(root.attempts),
    materials: materialsFrom(root.materials),
  };
}

function generatedActivityFrom(value: unknown): Assessment {
  const root = objectValue(unwrapData(value));
  const nestedActivity = root ? objectValue(root.activity) : null;
  const candidate: Record<string, unknown> | null = nestedActivity ?? root;
  if (
    !candidate ||
    typeof candidate.title !== "string" ||
    !Array.isArray(candidate.questions) ||
    candidate.questions.length === 0
  ) {
    throw invalidResponse("atividade gerada");
  }
  const now = new Date().toISOString();
  const materialIds = Array.isArray(candidate.materialIds)
    ? stringArrayFrom(candidate.materialIds, "materiais da atividade gerada")
    : [];
  return {
    id: typeof candidate.id === "string" ? candidate.id : newId("assessment"),
    title: candidate.title,
    subject: typeof candidate.subject === "string" ? candidate.subject : "",
    description:
      typeof candidate.description === "string" ? candidate.description : "",
    instructions:
      typeof candidate.instructions === "string" ? candidate.instructions : "",
    questions: questionsFrom(candidate.questions),
    materialIds,
    archived: false,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function demoGeneratedActivity(input: GenerateActivityInput): Assessment {
  const now = new Date().toISOString();
  const amount = Math.max(1, Math.min(10, input.questionCount));
  const questions: Question[] = Array.from({ length: amount }, (_, index) => ({
    id: newId("question"),
    type: index % 3 === 2 ? "open" : index % 3 === 1 ? "boolean" : "single",
    prompt:
      index % 3 === 0
        ? `Questão demonstrativa ${index + 1}: desenvolva uma ideia relacionada a “${input.prompt.trim()}”.`
        : index % 3 === 1
          ? `Questão demonstrativa ${index + 1}: o tema “${input.prompt.trim()}” pode ser analisado em diferentes contextos.`
          : `Explique um aspecto de “${input.prompt.trim()}” com suas palavras.`,
    options:
      index % 3 === 0
        ? ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"]
        : index % 3 === 1
          ? ["Verdadeiro", "Falso"]
          : [],
    correctAnswer:
      index % 3 === 0 ? "Alternativa A" : index % 3 === 1 ? "Verdadeiro" : null,
    points: 1,
  }));
  return {
    id: newId("assessment"),
    title: `Atividade demonstrativa: ${input.prompt.trim().slice(0, 56)}`,
    subject: input.subject.trim(),
    description:
      "Conteúdo de exemplo criado pelo modo demonstrativo. Não foi usado um serviço de inteligência artificial.",
    instructions: "Revise e ajuste todas as questões antes de salvar.",
    questions,
    materialIds: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const teacherGateway = {
  async login(email: string, password: string): Promise<Teacher> {
    if (isDemoMode) {
      const teacher = await demoApi.login(email);
      localStorage.setItem(sessionKey, "demo");
      return teacher;
    }
    await request(
      configuredPath("VITE_LOUSA_API_LOGIN_PATH", env.VITE_LOUSA_API_LOGIN_PATH),
      { method: "POST", body: JSON.stringify({ email, password }) },
    );
    return teacherFrom(
      await request(
        configuredPath(
          "VITE_LOUSA_API_CURRENT_USER_PATH",
          env.VITE_LOUSA_API_CURRENT_USER_PATH,
        ),
      ),
    );
  },

  async verifyTeacherSession(): Promise<Teacher | null> {
    if (isDemoMode) {
      if (localStorage.getItem(sessionKey) !== "demo") return null;
      return demoApi.getTeacher();
    }
    try {
      const teacher = teacherFrom(
        await request(
          configuredPath(
            "VITE_LOUSA_API_CURRENT_USER_PATH",
            env.VITE_LOUSA_API_CURRENT_USER_PATH,
          ),
        ),
      );
      return teacher;
    } catch (error) {
      if (error instanceof IntegrationError && error.code === "HTTP_401")
        return null;
      throw error;
    }
  },

  async getTeacher(): Promise<Teacher> {
    const teacher = await this.verifyTeacherSession();
    if (!teacher)
      throw new IntegrationError("UNAUTHENTICATED", "Entre novamente para continuar.");
    return teacher;
  },

  async logout(): Promise<void> {
    if (isDemoMode) {
      localStorage.removeItem(sessionKey);
      return;
    }
    await request(
      configuredPath(
        "VITE_LOUSA_API_LOGOUT_PATH",
        env.VITE_LOUSA_API_LOGOUT_PATH,
      ),
      { method: "POST" },
    );
  },

  async getDashboard(): Promise<TeacherDashboardData> {
    if (isDemoMode) {
      const [teacher, assessments, applications, attempts, materials] =
        await Promise.all([
          demoApi.getTeacher(),
          demoApi.listAssessments(),
          demoApi.listApplications(),
          demoApi.listAttempts(),
          demoApi.listMaterials(),
        ]);
      return { teacher, assessments, applications, attempts, materials };
    }
    return dashboardFrom(
      await request(
        configuredPath(
          "VITE_LOUSA_API_DASHBOARD_PATH",
          env.VITE_LOUSA_API_DASHBOARD_PATH,
        ),
      ),
    );
  },

  async listActivities(): Promise<Assessment[]> {
    if (isDemoMode) return demoApi.listAssessments();
    return assessmentListFrom(
      await request(
        configuredPath(
          "VITE_LOUSA_API_ACTIVITIES_PATH",
          env.VITE_LOUSA_API_ACTIVITIES_PATH,
        ),
      ),
    );
  },

  async saveActivity(
    activity: Assessment,
    isNew = false,
  ): Promise<Assessment> {
    if (isDemoMode) return demoApi.saveAssessment(activity);
    const collection = configuredPath(
      "VITE_LOUSA_API_ACTIVITIES_PATH",
      env.VITE_LOUSA_API_ACTIVITIES_PATH,
    );
    const path = isNew
      ? collection
      : `${collection.replace(/\/+$/, "")}/${encodeURIComponent(activity.id)}`;
    const response = await request(path, {
      method: isNew ? "POST" : "PUT",
      body: JSON.stringify(activity),
    });
    const root = objectValue(unwrapData(response));
    const nestedActivity = root ? objectValue(root.activity) : null;
    const candidate: Record<string, unknown> | null = nestedActivity ?? root;
    if (!candidate || typeof candidate.id !== "string")
      throw invalidResponse("atividade salva com identificador");
    return generatedActivityFrom(response);
  },

  async listMaterials(): Promise<Material[] | null> {
    if (isDemoMode) return demoApi.listMaterials();
    const path = env.VITE_LOUSA_API_MATERIALS_PATH?.trim();
    if (!path) return null;
    return materialsFrom(unwrapData(await request(path)));
  },

  async duplicateActivity(id: string): Promise<Assessment> {
    if (isDemoMode) return demoApi.duplicateAssessment(id);
    throw new IntegrationError(
      "CONTRACT_NOT_CONFIGURED",
      "A cópia de atividades não está disponível no momento.",
    );
  },

  async archiveActivity(id: string): Promise<void> {
    if (isDemoMode) return demoApi.archiveAssessment(id);
    throw new IntegrationError(
      "CONTRACT_NOT_CONFIGURED",
      "O arquivamento de atividades não está disponível no momento.",
    );
  },

  async generateActivityFromPrompt(
    input: GenerateActivityInput,
  ): Promise<GeneratedActivity> {
    if (isDemoMode && isTestToolsEnabled)
      return { activity: demoGeneratedActivity(input), source: "demo" };
    if (isDemoMode)
      throw new IntegrationError(
        "GENERATION_UNAVAILABLE",
        "A geração de atividades não está disponível no momento.",
      );
    const response = await request(
      configuredPath(
        "VITE_LOUSA_API_GENERATE_PROMPT_PATH",
        env.VITE_LOUSA_API_GENERATE_PROMPT_PATH,
      ),
      { method: "POST", body: JSON.stringify(input) },
    );
    return { activity: generatedActivityFrom(response), source: "api" };
  },

  async generateActivityFromMaterial(
    file: File,
    input: Omit<GenerateActivityInput, "prompt">,
  ): Promise<GeneratedActivity> {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new IntegrationError("INVALID_FILE", "Selecione um arquivo PDF.");
    }
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new IntegrationError("FILE_TOO_LARGE", "O PDF deve ter até 25 MB.");
    }
    if (isDemoMode && isTestToolsEnabled) {
      return {
        activity: demoGeneratedActivity({
          prompt: `conteúdo de demonstração baseado no arquivo ${file.name}`,
          subject: input.subject,
          questionCount: input.questionCount,
        }),
        source: "demo",
      };
    }
    if (isDemoMode)
      throw new IntegrationError(
        "GENERATION_UNAVAILABLE",
        "A geração de atividades não está disponível no momento.",
      );
    const form = new FormData();
    form.append("material", file);
    form.append("subject", input.subject);
    form.append("questionCount", String(input.questionCount));
    const response = await request(
      configuredPath(
        "VITE_LOUSA_API_GENERATE_MATERIAL_PATH",
        env.VITE_LOUSA_API_GENERATE_MATERIAL_PATH,
      ),
      { method: "POST", body: form },
    );
    return { activity: generatedActivityFrom(response), source: "api" };
  },
};
