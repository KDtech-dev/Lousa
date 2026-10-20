import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, KeyRound, Mail, Monitor } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import { isDemoMode, isTestToolsEnabled } from "../services/teacherGateway";

export default function ParticipatePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  function enter(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Informe o código compartilhado pelo professor.");
      return;
    }
    navigate(`/p/${encodeURIComponent(code.trim().toUpperCase())}`);
  }
  return (
    <PublicLayout>
      <div className="participate-intro">
        <span className="student-leaf">
          <BookOpen size={28} strokeWidth={1.6} />
        </span>
        <span className="eyebrow">O PRÓXIMO APRENDIZADO COMEÇA AQUI</span>
        <h1>
          Vamos descobrir
          <br />o que você já sabe?
        </h1>
        <p>
          Digite o código recebido do professor
          <br />
          para acessar sua atividade.
        </p>
      </div>
      <section className="card code-entry">
        <form onSubmit={enter} noValidate>
          <label className="field" htmlFor="access-code">
            Código da atividade
          </label>
          <div className="code-input">
            <KeyRound size={19} />
            <input
              id="access-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              placeholder="Ex.: BIO101"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={32}
              aria-invalid={!!error}
              aria-describedby={error ? "code-error" : "code-help"}
            />
          </div>
          {error && (
            <p id="code-error" className="field-error">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            Acessar atividade <ArrowRight size={17} />
          </button>
          <p id="code-help">
            {isDemoMode && !isTestToolsEnabled
              ? "Informe um código criado neste dispositivo."
              : "Você não precisa criar uma conta para participar."}
          </p>
        </form>
      </section>
      {isTestToolsEnabled && (
        <section className="student-demo-examples">
          <span className="eyebrow">EXPLORE A DEMONSTRAÇÃO</span>
          <p>Escolha uma atividade para experimentar os fluxos.</p>
          <div className="student-demo-links">
            <Link to="/p/BIO101">
              <BookOpen size={17} />
              <strong>BIO101</strong>
              <span>Acesso por nome</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/p/MAT202">
              <Mail size={17} />
              <strong>MAT202</strong>
              <span>E-mail autorizado</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/p/FIS303">
              <Monitor size={17} />
              <strong>FIS303</strong>
              <span>Aplicativo simulado</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
