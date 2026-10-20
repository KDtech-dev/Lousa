import type { Teacher } from "../types";

export type ProfileInput = Omit<Teacher, "id">;
export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

export const profileFields = [
  { name: "name", label: "Nome completo", maxLength: 120 },
  { name: "email", label: "E-mail", maxLength: 254 },
  { name: "subject", label: "Disciplina", maxLength: 120 },
  { name: "institution", label: "Instituição", maxLength: 200 },
] as const;

export function validateProfile(input: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of profileFields) {
    if (!input[field.name].trim())
      errors[field.name] = `Preencha ${field.label.toLowerCase()}.`;
    else if (input[field.name].trim().length > field.maxLength)
      errors[field.name] = `Use até ${field.maxLength} caracteres.`;
  }
  if (
    input.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  )
    errors.email = "Informe um e-mail válido.";
  return errors;
}

export function focusProfileError(
  form: HTMLFormElement,
  errors: ProfileErrors,
) {
  const first = profileFields.find((field) => errors[field.name]);
  if (first)
    (form.elements.namedItem(first.name) as HTMLInputElement | null)?.focus();
}
