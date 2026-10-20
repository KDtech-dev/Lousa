export const formatDate = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat(
    "pt-BR",
    options ?? { day: "2-digit", month: "short" },
  ).format(new Date(value));
export const formatDateTime = (value: string) =>
  formatDate(value, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export const formatPoints = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
export const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
