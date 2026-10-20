import { Check, CheckCircle2, Clock3, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { PublicApplication, PublicAttempt } from "../types";
import { demoApi } from "../services/demoApi";
import { formatDateTime, formatPoints, messageOf } from "../services/format";
import { ErrorNotice } from "./Feedback";
import { isTestToolsEnabled } from "../services/teacherGateway";

export default function AttemptReceipt({
  attempt,
  application,
  onRefresh,
  onNew,
}: {
  attempt: PublicAttempt;
  application: PublicApplication;
  onRefresh: (attempt: PublicAttempt) => void;
  onNew: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const abandoned = attempt.status === "abandoned";
  const expired = attempt.status === "expired";
  const total = application.snapshot.questions.reduce(
    (sum, question) => sum + question.points,
    0,
  );
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      onRefresh(await demoApi.getPublicAttempt(attempt.id));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(attempt.identifier);
      setCopied(true);
    } catch {
      setError(
        "Não foi possível copiar. Selecione o identificador exibido abaixo.",
      );
    }
  }
  return (
    <section className="card receipt-card">
      <span className={`receipt-icon ${abandoned ? "is-abandoned" : ""}`}>
        {expired ? (
          <Clock3 size={30} />
        ) : abandoned ? (
          <RotateCcw size={30} />
        ) : (
          <CheckCircle2 size={32} />
        )}
      </span>
      <span className="eyebrow">
        {abandoned
          ? "PARTICIPAÇÃO ENCERRADA"
          : expired
            ? "PRAZO ENCERRADO"
            : isTestToolsEnabled
              ? "ENTREGA CONFIRMADA"
              : "RESPOSTAS SALVAS NESTE DISPOSITIVO"}
      </span>
      <h1>
        {abandoned
          ? "Sua desistência foi registrada."
          : expired
            ? "O prazo foi encerrado."
            : "Muito bem. Sua parte está feita."}
      </h1>
      <p>
        {abandoned
          ? "As respostas registradas foram preservadas. Esta participação não pode ser retomada."
          : expired
            ? isTestToolsEnabled
              ? "A participação foi finalizada automaticamente com as respostas salvas até o prazo, inclusive os rascunhos locais válidos."
              : "O prazo encerrou. As respostas salvas permanecem neste dispositivo."
            : isTestToolsEnabled
              ? "Suas respostas foram recebidas na demonstração. Agora o professor pode acompanhar e corrigir sua atividade."
              : "Suas respostas foram salvas neste dispositivo. O envio ao professor não está disponível no momento."}
      </p>
      <div className="receipt-data">
        <span>
          Atividade<strong>{application.snapshot.title}</strong>
        </span>
        <span>
          Participante<strong>{attempt.name}</strong>
        </span>
        <span>
          Registrado em
          <strong>
            {formatDateTime(attempt.endedAt ?? attempt.startedAt)}
          </strong>
        </span>
        <span>
          Situação
          <strong>
            {abandoned
              ? "Desistência"
              : expired
                ? "Finalizada por prazo"
                : isTestToolsEnabled
                  ? "Entregue"
                  : "Salva neste dispositivo"}
          </strong>
        </span>
        <span className="receipt-id">
          Seu identificador
          <strong>
            {attempt.identifier}
            <button
              onClick={copy}
              className="icon-button"
              aria-label="Copiar identificador"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </strong>
        </span>
      </div>
      {!abandoned &&
        (attempt.resultsReleased && attempt.score !== undefined ? (
          <div className="released-result">
            <span className="eyebrow">RESULTADO LIBERADO</span>
            <div className="released-score">
              {formatPoints(attempt.score ?? 0)}
              <span>/ {formatPoints(total)} pontos</span>
            </div>
            {attempt.feedback && (
              <div>
                <h3>Feedback do professor</h3>
                <p>{attempt.feedback}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="notice info">
            <Clock3 size={19} />
            <div>
              <strong>
                {attempt.correctionStatus === "pending"
                  ? "Aguardando correção do professor."
                  : "Aguardando liberação do resultado."}
              </strong>
              <br />A nota e o feedback aparecem aqui somente após a liberação.
            </div>
          </div>
        ))}
      {error && <ErrorNotice message={error} />}
      <div className="receipt-actions">
        {!abandoned && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={refresh}
          >
            <RotateCcw size={15} />
            {busy ? "Consultando…" : "Consultar resultado"}
          </button>
        )}
        <a href="/participar" className="button ghost">
          Acessar outra atividade
        </a>
      </div>
      {isTestToolsEnabled && (
        <details className="receipt-demo-new">
          <summary>Demonstração: testar outra participação</summary>
          <p>
            A participação atual continuará registrada. Uma nova tentativa terá um
            identificador próprio, mesmo usando o mesmo nome.
          </p>
          <button className="button secondary small" onClick={onNew}>
            Preparar uma nova participação
          </button>
        </details>
      )}
    </section>
  );
}
