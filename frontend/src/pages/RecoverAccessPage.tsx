import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import AuthDemoLayout, { AuthUnavailable } from "./AuthDemoLayout";
import { isTestToolsEnabled } from "../services/teacherGateway";

export default function RecoverAccessPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [resetStep, setResetStep] = useState<"none" | "form" | "completed">(
    "none",
  );
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    password?: string;
    confirmation?: string;
  }>({});
  const input = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const passwordConfirmationInput = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const wasConfirmed = useRef(false);
  useEffect(() => {
    if (resetStep === "form") passwordInput.current?.focus();
    else if (confirmed) confirmation.current?.focus();
    else if (wasConfirmed.current) input.current?.focus();
    wasConfirmed.current = confirmed;
  }, [confirmed, resetStep]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail fictício válido.");
      input.current?.focus();
      return;
    }
    setError("");
    setEmail("");
    setConfirmed(true);
  }

  function restart() {
    setPassword("");
    setPasswordConfirmation("");
    setPasswordErrors({});
    setResetStep("none");
    setConfirmed(false);
  }

  function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: { password?: string; confirmation?: string } = {};
    if (password.length < 8)
      next.password = "Use uma senha fictícia com pelo menos 8 caracteres.";
    if (!passwordConfirmation || passwordConfirmation !== password)
      next.confirmation = "Repita a mesma senha fictícia.";
    setPasswordErrors(next);
    if (next.password) {
      passwordInput.current?.focus();
      return;
    }
    if (next.confirmation) {
      passwordConfirmationInput.current?.focus();
      return;
    }
    setPassword("");
    setPasswordConfirmation("");
    setResetStep("completed");
  }

  if (!isTestToolsEnabled)
    return (
      <AuthUnavailable
        title="Recuperação de acesso indisponível."
        description="Não é possível recuperar o acesso agora. Tente novamente mais tarde."
      />
    );

  return (
    <AuthDemoLayout>
      <h2>{resetStep === "form" ? "Redefinir senha." : "Recuperar acesso."}</h2>
      <p className="muted">
        {resetStep === "form"
          ? "Experimente uma nova senha fictícia. Os campos são descartados ao concluir esta simulação."
          : "Experimente o pedido de recuperação de senha com um e-mail fictício."}
      </p>
      {resetStep === "form" ? (
        <form className="auth-fields" onSubmit={resetPassword} noValidate>
          <label className="field" htmlFor="recovery-password">
            <span id="recovery-password-label">Nova senha demonstrativa</span>
            <input
              ref={passwordInput}
              id="recovery-password"
              type="password"
              required
              minLength={8}
              value={password}
              autoComplete="off"
              aria-labelledby="recovery-password-label"
              aria-invalid={!!passwordErrors.password}
              aria-describedby={`recovery-password-help${passwordErrors.password ? " recovery-password-error" : ""}`}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordErrors((current) => ({
                  ...current,
                  password: undefined,
                }));
              }}
            />
            {passwordErrors.password && (
              <small id="recovery-password-error" className="field-error">
                {passwordErrors.password}
              </small>
            )}
          </label>
          <label className="field" htmlFor="recovery-password-confirmation">
            <span id="recovery-password-confirmation-label">
              Confirmar nova senha
            </span>
            <input
              ref={passwordConfirmationInput}
              id="recovery-password-confirmation"
              type="password"
              required
              value={passwordConfirmation}
              autoComplete="off"
              aria-labelledby="recovery-password-confirmation-label"
              aria-invalid={!!passwordErrors.confirmation}
              aria-describedby={
                passwordErrors.confirmation
                  ? "recovery-password-confirmation-error"
                  : "recovery-password-help"
              }
              onChange={(event) => {
                setPasswordConfirmation(event.target.value);
                setPasswordErrors((current) => ({
                  ...current,
                  confirmation: undefined,
                }));
              }}
            />
            {passwordErrors.confirmation && (
              <small
                id="recovery-password-confirmation-error"
                className="field-error"
              >
                {passwordErrors.confirmation}
              </small>
            )}
          </label>
          <p id="recovery-password-help" className="auth-demo-help">
            Use uma senha fictícia de pelo menos 8 caracteres. Nenhuma senha
            será armazenada ou alterada.
          </p>
          <button className="button primary login-submit">
            Simular redefinição <ArrowRight size={18} />
          </button>
          <button
            className="button ghost small"
            type="button"
            onClick={restart}
          >
            Experimentar novamente
          </button>
        </form>
      ) : confirmed ? (
        <div
          className="auth-confirmation"
          ref={confirmation}
          tabIndex={-1}
          role="status"
        >
          <span className="auth-confirmation-icon">
            <CheckCircle2 size={28} />
          </span>
          <h3>
            {resetStep === "completed"
              ? "Redefinição demonstrativa concluída."
              : "Solicitação demonstrativa concluída."}
          </h3>
          <p>
            {resetStep === "completed"
              ? "Nenhuma senha real foi alterada. A senha fictícia foi descartada; você pode voltar e entrar na demonstração sem senha."
              : "Nenhum e-mail foi enviado e nenhuma senha foi alterada. Nesta demonstração, você pode voltar e entrar sem senha."}
          </p>
          {resetStep !== "completed" && (
            <button
              className="button secondary login-submit"
              onClick={() => setResetStep("form")}
            >
              Testar redefinição de senha <ArrowRight size={18} />
            </button>
          )}
          <Link to="/login" className="button primary login-submit">
            Voltar para entrar <ArrowRight size={18} />
          </Link>
          <button className="button ghost small" onClick={restart}>
            Experimentar novamente
          </button>
        </div>
      ) : (
        <form className="auth-fields" onSubmit={submit} noValidate>
          <label className="field" htmlFor="recovery-email">
            <span id="recovery-email-label">E-mail demonstrativo</span>
            <input
              ref={input}
              id="recovery-email"
              type="email"
              required
              value={email}
              autoComplete="off"
              maxLength={254}
              aria-labelledby="recovery-email-label"
              aria-invalid={!!error}
              aria-describedby={`recovery-help${error ? " recovery-email-error" : ""}`}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
            />
            {error && (
              <small id="recovery-email-error" className="field-error">
                {error}
              </small>
            )}
          </label>
          <p id="recovery-help" className="auth-demo-help">
            O envio e a recuperação são simulados. Use um e-mail fictício; ele
            não será armazenado.
          </p>
          <button className="button primary login-submit">
            Simular recuperação <Mail size={18} />
          </button>
        </form>
      )}
    </AuthDemoLayout>
  );
}
