import type { Assessment, Question } from "../types";

export interface AssessmentDraft {
  version: 1;
  baseUpdatedAt: string | null;
  savedAt: string;
  assessment: Assessment;
}

export const assessmentDraftKey = (id?: string) =>
  `lousa.teacher.assessment-draft.v1.${id || "new"}`;

export function assessmentContent(assessment: Assessment) {
  return JSON.stringify({
    title: assessment.title,
    subject: assessment.subject,
    description: assessment.description,
    instructions: assessment.instructions,
    questions: assessment.questions,
    materialIds: assessment.materialIds,
  });
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const question = value as Question;
  return (
    typeof question.id === "string" &&
    ["single", "boolean", "open"].includes(question.type) &&
    typeof question.prompt === "string" &&
    typeof question.points === "number" &&
    Number.isFinite(question.points) &&
    Array.isArray(question.options) &&
    question.options.every((option) => typeof option === "string") &&
    (question.correctAnswer === null ||
      typeof question.correctAnswer === "string")
  );
}

export function readAssessmentDraft(id?: string): AssessmentDraft | null {
  const raw = localStorage.getItem(assessmentDraftKey(id));
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as AssessmentDraft;
    const assessment = record?.assessment;
    if (
      record.version !== 1 ||
      !Number.isFinite(Date.parse(record.savedAt)) ||
      !(
        record.baseUpdatedAt === null ||
        typeof record.baseUpdatedAt === "string"
      ) ||
      !assessment ||
      typeof assessment.id !== "string" ||
      (id && assessment.id !== id) ||
      ![
        assessment.title,
        assessment.subject,
        assessment.description,
        assessment.instructions,
        assessment.createdAt,
        assessment.updatedAt,
      ].every((value) => typeof value === "string") ||
      typeof assessment.archived !== "boolean" ||
      !Array.isArray(assessment.questions) ||
      !assessment.questions.every(isQuestion) ||
      !Array.isArray(assessment.materialIds) ||
      !assessment.materialIds.every((value) => typeof value === "string")
    )
      return null;
    return record;
  } catch {
    return null;
  }
}

export function saveAssessmentDraft(
  assessment: Assessment,
  base: Assessment | null,
  id?: string,
) {
  const record: AssessmentDraft = {
    version: 1,
    baseUpdatedAt: id ? (base?.updatedAt ?? null) : null,
    savedAt: new Date().toISOString(),
    assessment,
  };
  localStorage.setItem(assessmentDraftKey(id), JSON.stringify(record));
}

export function removeAssessmentDraft(id?: string) {
  localStorage.removeItem(assessmentDraftKey(id));
}

export function restoreAssessmentDraft(
  base: Assessment,
  record: AssessmentDraft,
  editing: boolean,
): Assessment {
  return {
    ...base,
    ...(editing
      ? {}
      : { id: record.assessment.id, createdAt: record.assessment.createdAt }),
    title: record.assessment.title,
    subject: record.assessment.subject,
    description: record.assessment.description,
    instructions: record.assessment.instructions,
    questions: record.assessment.questions,
    materialIds: record.assessment.materialIds,
  };
}
