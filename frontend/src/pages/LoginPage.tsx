import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  FileCheck2,
  GraduationCap,
  Leaf,
} from "lucide-react";
import { messageOf } from "../services/format";
import { ErrorNotice } from "../components/Feedback";
import {
  isDemoMode,
  isTestToolsEnabled,
  teacherGateway,
} from "../services/teacherGateway";
import "../styles/login.css";

export default function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState(
    isDemoMode && isTestToolsEnabled ? "marina@exemplo.com" : "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    (location.state as { authError?: string } | null)?.authError ?? "",
  );
  const [busy, setBusy] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useLayoutEffect(() => {
    if (!isDemoMode) return;
    try {
      localStorage.removeItem("ao.teacher.session");
    } catch {
      setError("Não foi possível encerrar o acesso neste dispositivo.");
    }
  }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (
      (!isDemoMode || isTestToolsEnabled) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      setError("Informe um e-mail válido.");
      emailInput.current?.focus();
      return;
    }
    if (!isDemoMode && !password) {
      setError("Informe sua senha.");
      return;
    }
    setBusy(true);
    try {
      await teacherGateway.login(
        isDemoMode && !isTestToolsEnabled ? "local@lousa.invalid" : email.trim(),
        password,
      );
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <span className="brand-icon">
            <FileCheck2 size={24} />
          </span>
          <span>Lousa</span>
        </div>
        <div className="login-story-content">
          <span className="login-eyebrow">
            <Leaf size={16} /> MAIS ESPAÇO PARA APRENDER
          </span>
          <h1>
            Seu ensino.
            <br />
            Novas possibilidades.
          </h1>
          <p>
            Prepare atividades, acompanhe descobertas e transforme respostas em
            próximos passos.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <div className="illustration-orbit" />
            <div className="illustration-paper">
              <span className="paper-icon">
                <BookOpen size={31} />
              </span>
              <div className="paper-line long" />
              <div className="paper-line" />
              <div className="paper-answer">
                <span>
                  <Check size={14} />
                </span>
                <div className="paper-line" />
              </div>
              <div className="paper-answer">
                <span />
                <div className="paper-line" />
              </div>
              <div className="paper-answer">
                <span />
                <div className="paper-line" />
              </div>
            </div>
            <span className="illustration-bubble">
              <GraduationCap size={28} />
            </span>
            <div className="illustration-note">
              <Check size={16} /> Aprendizagem em movimento
            </div>
          </div>
        </div>
        <p className="login-story-footer">
          Da primeira pergunta à próxima descoberta.
        </p>
      </section>
      <section className="login-form-area">
        <div className="login-form">
          <span
            className={`badge ${isDemoMode && !isTestToolsEnabled ? "green" : "blue"}`}
          >
            {isDemoMode && !isTestToolsEnabled
              ? "ACESSO LOCAL"
              : "ACESSO DO PROFESSOR"}
          </span>
          <h2>
            {isDemoMode && !isTestToolsEnabled
              ? "Acesse o painel neste dispositivo."
              : "Bem-vindo ao seu espaço."}
          </h2>
          <p className="muted">
            {isDemoMode && isTestToolsEnabled
              ? "Explore o painel do professor com atividades, materiais e resultados de exemplo."
              : isDemoMode
                ? "Acesse seu espaço de trabalho neste dispositivo."
                : "Entre com o e-mail e a senha da sua conta de professor."}
          </p>
          <form onSubmit={login} noValidate>
            {(!isDemoMode || isTestToolsEnabled) && (
              <>
                <label className="field">
                  <span id="login-email-label">
                    {isDemoMode && isTestToolsEnabled
                      ? "E-mail demonstrativo"
                      : "E-mail"}
                  </span>
                  <input
                    ref={emailInput}
                    type="email"
                    required
                    maxLength={254}
                    disabled={busy}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    autoComplete="username"
                    aria-labelledby="login-email-label"
                    aria-invalid={!!error}
                    aria-describedby={`login-help${error ? " login-error" : ""}`}
                  />
                </label>
                <small id="login-help" className="field-help">
                  {isDemoMode
                    ? "Use o e-mail preenchido ou outro e-mail fictício válido."
                    : "Use o e-mail cadastrado para sua conta de professor."}
                </small>
                <label className="field">
                  <span>Senha</span>
                  <input
                    type="password"
                    value={password}
                    required={!isDemoMode}
                    disabled={busy}
                    autoComplete="current-password"
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    aria-invalid={!!error && !password && !isDemoMode}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                </label>
              </>
            )}
            {error && (
              <div id="login-error">
                <ErrorNotice message={error} />
              </div>
            )}
            <button className="button primary login-submit" disabled={busy}>
              {busy
                ? "Acessando…"
                : isDemoMode && isTestToolsEnabled
                  ? "Entrar na demonstração"
                  : isDemoMode
                    ? "Acessar painel local"
                    : "Entrar"}
              <ArrowRight size={18} />
            </button>
          </form>
          {isDemoMode && isTestToolsEnabled ? (
            <>
              <div className="login-account-links">
                <Link to="/cadastro">Criar perfil demonstrativo</Link>
                <Link to="/recuperar-acesso">Recuperar acesso</Link>
              </div>
              <div className="login-demo-info">
                <FileCheck2 size={20} />
                <p>
                  Este é um ambiente de teste. O acesso é simulado e os dados
                  ficam neste navegador.
                </p>
              </div>
              <div className="login-student">
                <span>Vai responder uma atividade?</span>
                <Link to="/participar">
                  Acessar como aluno <ArrowRight size={15} />
                </Link>
              </div>
            </>
          ) : isDemoMode ? (
            <div className="login-demo-info">
              <FileCheck2 size={20} />
              <p>
                Este acesso não valida uma conta. As alterações ficam salvas
                somente neste dispositivo.
              </p>
            </div>
          ) : (
            <div className="login-demo-info">
              <FileCheck2 size={20} />
              <p>
                O acesso é liberado após a validação da conta e do perfil de
                professor.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
