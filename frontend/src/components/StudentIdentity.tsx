import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { demoApi } from "../services/demoApi";
import { isTestToolsEnabled } from "../services/teacherGateway";
import { messageOf } from "../services/format";
import { ErrorNotice } from "./Feedback";
import type { PublicApplication } from "../types";

export interface StudentIdentityData {
  name: string;
  email?: string;
  verificationToken?: string;
}
export default function StudentIdentity({
  application,
  onContinue,
}: {
  application: PublicApplication;
  onContinue: (data: StudentIdentityData) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState<{
    demoCode: string;
    verificationId: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function identify(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length > 120) {
      setError("Informe seu nome, com até 120 caracteres.");
      return;
    }
    if (application.accessMode === "name") {
      onContinue({ name: name.trim() });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      if (!challenge)
        setChallenge(await demoApi.requestEmailCode(application.code, email));
      else {
        const verificationToken = await demoApi.verifyEmailCode(
          challenge.verificationId,
          code,
        );
        onContinue({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          verificationToken,
        });
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card identity-card">
      <div className="identity-icon">
        {application.accessMode === "email" ? (
          <Mail size={24} />
        ) : (
          <UserRound size={24} />
        )}
      </div>
      <span className="eyebrow">ANTES DE COMEÇAR</span>
      <h2>Como podemos chamar você?</h2>
      <p className="muted">
        {application.accessMode === "email"
          ? "Esta atividade exige um e-mail autorizado pelo professor."
          : "Seu nome será usado para identificar esta participação."}
      </p>
      {application.accessMode === "email" && !isTestToolsEnabled ? (
        <div className="notice warning" role="status">
          A verificação de e-mail não está disponível no momento. Entre em
          contato com o professor para obter outro acesso.
        </div>
      ) : (
      <form onSubmit={identify} noValidate>
        <label className="field">
          Seu nome
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome e sobrenome"
            autoComplete="name"
            maxLength={120}
            required
          />
        </label>
        {application.accessMode === "email" && (
          <>
            <label className="field">
              E-mail autorizado
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setChallenge(null);
                  setCode("");
                  setError("");
                }}
                placeholder="seu.email@exemplo.com"
                autoComplete="email"
                required
              />
            </label>
            {challenge && (
              <>
                <div className="notice info">
                  <Mail size={18} />
                  <div>
                    <strong>
                      Código de demonstração:{" "}
                      <span className="email-demo-code">
                        {challenge.demoCode}
                      </span>
                    </strong>
                    <br />
                    Nenhum e-mail foi enviado. Digite o código acima para
                    simular a verificação. Ele vale por 10 minutos.
                  </div>
                </div>
                <label className="field">
                  Código de verificação
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="6 dígitos"
                    maxLength={6}
                    required
                  />
                </label>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => {
                    setChallenge(null);
                    setCode("");
                    setError("");
                  }}
                >
                  Solicitar novo código demonstrativo
                </button>
              </>
            )}
          </>
        )}
        {error && <ErrorNotice message={error} />}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Verificando…"
            : application.accessMode === "email" && !challenge
              ? "Simular envio de código"
              : "Continuar"}
          <ArrowRight size={17} />
        </button>
      </form>
      )}
      <Link className="identity-back" to="/participar">
        <ArrowLeft size={14} /> Usar outro código
      </Link>
      <p className="identity-small">
        <CheckCircle2 size={13} /> Você não precisa de uma conta permanente.
      </p>
    </section>
  );
}
