import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { demoApi } from "../services/demoApi";
import { messageOf } from "../services/format";
import { ErrorNotice } from "../components/Feedback";
import AuthDemoLayout, { AuthUnavailable } from "./AuthDemoLayout";
import { isTestToolsEnabled } from "../services/teacherGateway";
import {
  focusProfileError,
  profileFields,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "./profileForm";

type SignupErrors = ProfileErrors & {
  password?: string;
  confirmation?: string;
};

export default function SignupPage() {
  const [profile, setProfile] = useState<ProfileInput>({
    name: "",
    email: "",
    subject: "",
    institution: "",
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<SignupErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const next: SignupErrors = validateProfile(profile);
    if (password.length < 8)
      next.password = "Use uma senha fictícia com pelo menos 8 caracteres.";
    if (!confirmation || confirmation !== password)
      next.confirmation = "Repita a mesma senha fictícia.";
    setErrors(next);
    setError("");
    if (Object.keys(next).length) {
      if (profileFields.some((field) => next[field.name]))
        focusProfileError(form, next);
      else
        (
          form.elements.namedItem(
            next.password ? "password" : "confirmation",
          ) as HTMLInputElement
        )?.focus();
      return;
    }
    setBusy(true);
    try {
      await demoApi.updateTeacher(profile);
      localStorage.setItem("ao.teacher.session", "demo");
      setPassword("");
      setConfirmation("");
      navigate("/conta", { replace: true });
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!isTestToolsEnabled)
    return (
      <AuthUnavailable
        title="Cadastro indisponível."
        description="Não é possível criar uma conta agora. Tente novamente mais tarde."
      />
    );

  return (
    <AuthDemoLayout>
      <h2>Comece pelo seu perfil.</h2>
      <p className="muted">
        Configure o professor desta demonstração. As atividades de exemplo
        continuam disponíveis neste navegador.
      </p>
      <form className="auth-fields" onSubmit={submit} noValidate>
        {profileFields.map((field) => (
          <label
            className="field"
            key={field.name}
            htmlFor={`signup-${field.name}`}
          >
            <span id={`signup-${field.name}-label`}>{field.label}</span>
            <input
              id={`signup-${field.name}`}
              name={field.name}
              type={field.name === "email" ? "email" : "text"}
              required
              maxLength={field.maxLength}
              value={profile[field.name]}
              disabled={busy}
              autoComplete="off"
              aria-labelledby={`signup-${field.name}-label`}
              aria-invalid={!!errors[field.name]}
              aria-describedby={
                errors[field.name]
                  ? `signup-${field.name}-error`
                  : field.name === "email"
                    ? "signup-demo-help"
                    : undefined
              }
              onChange={(event) => {
                setProfile((current) => ({
                  ...current,
                  [field.name]: event.target.value,
                }));
                setErrors((current) => ({
                  ...current,
                  [field.name]: undefined,
                }));
              }}
            />
            {errors[field.name] && (
              <small id={`signup-${field.name}-error`} className="field-error">
                {errors[field.name]}
              </small>
            )}
          </label>
        ))}
        <label className="field" htmlFor="signup-password">
          <span id="signup-password-label">Senha demonstrativa</span>
          <input
            id="signup-password"
            name="password"
            type="password"
            value={password}
            required
            minLength={8}
            disabled={busy}
            autoComplete="off"
            aria-labelledby="signup-password-label"
            aria-invalid={!!errors.password}
            aria-describedby={`signup-password-help${errors.password ? " signup-password-error" : ""}`}
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
          />
          <small id="signup-password-help">
            Use uma senha fictícia de pelo menos 8 caracteres. Ela será
            descartada ao entrar.
          </small>
          {errors.password && (
            <small id="signup-password-error" className="field-error">
              {errors.password}
            </small>
          )}
        </label>
        <label className="field" htmlFor="signup-confirmation">
          <span id="signup-confirmation-label">
            Confirmar senha demonstrativa
          </span>
          <input
            id="signup-confirmation"
            name="confirmation"
            type="password"
            value={confirmation}
            required
            disabled={busy}
            autoComplete="off"
            aria-labelledby="signup-confirmation-label"
            aria-invalid={!!errors.confirmation}
            aria-describedby={
              errors.confirmation ? "signup-confirmation-error" : undefined
            }
            onChange={(event) => {
              setConfirmation(event.target.value);
              setErrors((current) => ({ ...current, confirmation: undefined }));
            }}
          />
          {errors.confirmation && (
            <small id="signup-confirmation-error" className="field-error">
              {errors.confirmation}
            </small>
          )}
        </label>
        <p id="signup-demo-help" className="auth-demo-help">
          Use dados fictícios. Este formulário atualiza o perfil local; o
          cadastro e o acesso são simulados.
        </p>
        {error && <ErrorNotice message={error} />}
        <button className="button primary login-submit" disabled={busy}>
          {busy ? "Preparando seu espaço…" : "Criar perfil demonstrativo"}
          <ArrowRight size={18} />
        </button>
      </form>
    </AuthDemoLayout>
  );
}
