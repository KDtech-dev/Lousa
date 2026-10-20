import type { Application, Attempt } from "../types";

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPoints(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function applicationState(
  application: Application,
): "available" | "scheduled" | "closed" {
  if (
    application.status === "closed" ||
    new Date(application.endAt).getTime() <= Date.now()
  )
    return "closed";
  return new Date(application.startAt).getTime() > Date.now()
    ? "scheduled"
    : "available";
}

export function attemptState(attempt: Attempt): {
  text: string;
  color: string;
} {
  if (attempt.status === "in_progress")
    return { text: "Em andamento", color: "blue" };
  if (attempt.status === "abandoned")
    return { text: "Desistência", color: "gray" };
  return attempt.correctionStatus === "graded"
    ? { text: "Corrigida", color: "green" }
    : { text: "Aguardando correção", color: "amber" };
}

export function localDateInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
