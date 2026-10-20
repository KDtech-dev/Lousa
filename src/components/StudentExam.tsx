import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  CloudOff,
  LoaderCircle,
  Save,
} from "lucide-react";
import { formatPoints } from "../services/format";
import type { Material, PublicApplication, PublicAttempt } from "../types";
import PublicMaterials from "./PublicMaterials";
import { ErrorNotice } from "./Feedback";
import { isTestToolsEnabled } from "../services/teacherGateway";

interface StudentExamProps {
  application: PublicApplication;
  attempt: PublicAttempt;
  materials: Material[];
  answers: Record<string, string>;
  remainingSeconds: number;
  saveState: "saved" | "local" | "saving" | "error";
  saveError: string;
  suspended: boolean;
  busy: boolean;
  onAnswer: (id: string, value: string) => void;
  onDeliver: () => void;
  onAbandon: () => void;
  onSync: () => void;
}
export default function StudentExam({
  application,
  attempt,
  materials,
  answers,
  remainingSeconds,
  saveState,
  saveError,
  suspended,
  busy,
  onAnswer,
  onDeliver,
  onAbandon,
  onSync,
}: StudentExamProps) {
  const [index, setIndex] = useState(0);
  const [review, setReview] = useState(false);
  const questions = application.snapshot.questions;
  const current = questions[index];
  const answered = questions.filter(
    (question) => !!answers[question.id]?.trim(),
  ).length;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const time = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const saveLabels = isTestToolsEnabled
    ? {
        saved: "Salvo localmente · sincronização simulada concluída",
        local: "Salvo neste navegador · aguardando sincronização simulada",
        saving: "Salvo localmente · sincronizando na demonstração…",
        error: "Verifique o salvamento das respostas",
      }
    : {
        saved: "Respostas salvas neste dispositivo",
        local: "Alterações salvas neste dispositivo",
        saving: "Salvando neste dispositivo…",
        error: "Verifique o salvamento das respostas",
      };
  const SaveIcon =
    saveState === "saved"
      ? Check
      : saveState === "saving"
        ? LoaderCircle
        : saveState === "error"
          ? CloudOff
          : Save;
  return (
    <div className="exam-workspace">
      <div className="exam-topline">
        <div>
          <span className="eyebrow">{application.snapshot.subject}</span>
          <h1>{application.snapshot.title}</h1>
          <p>
            {attempt.name} <span>·</span> {attempt.identifier}
          </p>
        </div>
        <div
          className={`exam-timer ${remainingSeconds < 300 ? "is-urgent" : ""}`}
          role="timer"
          aria-live="off"
          aria-label={`Tempo restante: ${minutes} minutos e ${seconds} segundos`}
        >
          <Clock3 size={19} />
          <span>
            <small>Tempo restante</small>
            <strong>{time}</strong>
          </span>
        </div>
      </div>
      <div className="exam-save-status" role="status">
        <SaveIcon size={15} className={saveState === "saving" ? "spin" : ""} />
        {saveLabels[saveState]}
        {saveState === "error" && (
          <button
            className="button ghost small"
            onClick={onSync}
            disabled={busy}
          >
            {isTestToolsEnabled ? "Tentar sincronizar" : "Tentar salvar novamente"}
          </button>
        )}
      </div>
      {saveError && <ErrorNotice message={saveError} />}
      {suspended && (
        <div className="notice warning" role="alert">
          <CloudOff size={21} />
          <div>
            <strong>Participação suspensa na simulação.</strong>
            <br />
            Suas respostas foram preservadas. Selecione “Pronto” nos controles
            do aplicativo e solicite a retomada. O prazo continua contando.
          </div>
        </div>
      )}
      <div className="exam-grid">
        <aside className="card exam-sidebar">
          <h2>Sua atividade</h2>
          <p>
            {answered} de {questions.length} questões respondidas
          </p>
          <div className="exam-progress">
            <span
              style={{ width: `${(answered / questions.length) * 100}%` }}
            />
          </div>
          <nav
            className="question-navigation"
            aria-label="Navegar entre questões"
          >
            {questions.map((question, i) => (
              <button
                disabled={suspended || busy}
                key={question.id}
                className={`question-number ${answers[question.id]?.trim() ? "answered" : ""} ${i === index && !review ? "current" : ""}`}
                onClick={() => {
                  setIndex(i);
                  setReview(false);
                }}
                aria-label={`Questão ${i + 1}, ${answers[question.id]?.trim() ? "respondida" : "pendente"}`}
                aria-current={i === index && !review ? "step" : undefined}
              >
                {i + 1}
                {answers[question.id]?.trim() && <Check size={9} />}
              </button>
            ))}
          </nav>
          <div className="question-legend">
            <span>
              <i className="legend-answered" /> Respondida
            </span>
            <span>
              <i /> Pendente
            </span>
          </div>
          <button
            className={`button ${review ? "primary" : "secondary"} exam-review-button`}
            onClick={() => setReview(true)}
            disabled={suspended || busy}
          >
            <ClipboardCheck size={16} /> Revisar atividade
          </button>
          <PublicMaterials materials={materials} />
          <button
            className="exam-abandon"
            onClick={onAbandon}
            disabled={suspended || busy}
          >
            Desistir desta participação
          </button>
        </aside>
        <section
          className="card exam-question-card"
          aria-labelledby={review ? "review-title" : "question-title"}
        >
          <fieldset className="exam-interaction" disabled={suspended || busy}>
            {review ? (
              <>
                <span className="eyebrow">ANTES DE ENTREGAR</span>
                <h2 id="review-title">Uma última revisão.</h2>
                <p className="muted">
                  Confira suas respostas. Você pode voltar às questões para
                  ajustar qualquer uma.
                </p>
                <div className="review-list">
                  {questions.map((question, i) => (
                    <button
                      key={question.id}
                      className="review-item"
                      onClick={() => {
                        setIndex(i);
                        setReview(false);
                      }}
                    >
                      <span
                        className={`review-number ${answers[question.id]?.trim() ? "is-answered" : ""}`}
                      >
                        {i + 1}
                      </span>
                      <span>
                        <strong>{question.prompt}</strong>
                        <small>
                          {answers[question.id]?.trim() || "Questão em branco"}
                        </small>
                      </span>
                      <span
                        className={`badge ${answers[question.id]?.trim() ? "green" : "amber"}`}
                      >
                        {answers[question.id]?.trim()
                          ? "Respondida"
                          : "Pendente"}
                      </span>
                    </button>
                  ))}
                </div>
                {answered < questions.length && (
                  <div className="notice warning">
                    {questions.length - answered}{" "}
                    {questions.length - answered === 1
                      ? "questão está em branco"
                      : "questões estão em branco"}
                    .{" "}
                    {isTestToolsEnabled
                      ? "Você poderá entregar mesmo assim, após confirmar."
                      : "Você poderá encerrar e salvar as respostas neste dispositivo."}
                  </div>
                )}
                <div className="exam-question-footer">
                  <button
                    className="button secondary"
                    onClick={() => setReview(false)}
                  >
                    <ArrowLeft size={16} /> Voltar às questões
                  </button>
                  <button className="button primary" onClick={onDeliver}>
                    <Check size={16} />
                    {isTestToolsEnabled ? "Entregar atividade" : "Encerrar atividade"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="question-meta">
                  <span className="eyebrow">
                    QUESTÃO {String(index + 1).padStart(2, "0")} DE{" "}
                    {String(questions.length).padStart(2, "0")}
                  </span>
                  <span className="badge gray">
                    {formatPoints(current.points)}{" "}
                    {current.points === 1 ? "ponto" : "pontos"}
                  </span>
                </div>
                <h2 id="question-title">{current.prompt}</h2>
                <p className="question-instruction">
                  {current.type === "open"
                    ? "Responda com suas próprias palavras."
                    : current.type === "boolean"
                      ? "Escolha verdadeiro ou falso."
                      : "Selecione uma alternativa."}
                </p>
                {current.type === "open" ? (
                  <label className="field">
                    Sua resposta
                    <textarea
                      value={answers[current.id] ?? ""}
                      onChange={(event) =>
                        onAnswer(current.id, event.target.value)
                      }
                      placeholder="Escreva sua resposta aqui…"
                      rows={8}
                    />
                  </label>
                ) : (
                  <div
                    className="exam-options"
                    role="radiogroup"
                    aria-labelledby="question-title"
                  >
                    {current.options.map((option, i) => (
                      <label
                        key={option}
                        className={`exam-option ${answers[current.id] === option ? "selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name={current.id}
                          checked={answers[current.id] === option}
                          onChange={() => onAnswer(current.id, option)}
                        />
                        <span className="option-letter">
                          {current.type === "single"
                            ? String.fromCharCode(65 + i)
                            : i === 0
                              ? "V"
                              : "F"}
                        </span>
                        <span>{option}</span>
                      </label>
                    ))}
                    {answers[current.id] && (
                      <button
                        className="clear-answer"
                        type="button"
                        onClick={() => onAnswer(current.id, "")}
                      >
                        Limpar resposta
                      </button>
                    )}
                  </div>
                )}
                <div className="exam-question-footer">
                  <button
                    className="button secondary"
                    onClick={() => setIndex(index - 1)}
                    disabled={index === 0}
                  >
                    <ArrowLeft size={16} /> Anterior
                  </button>
                  <span className="question-page-label">
                    {index + 1} / {questions.length}
                  </span>
                  {index < questions.length - 1 ? (
                    <button
                      className="button primary"
                      onClick={() => setIndex(index + 1)}
                    >
                      Próxima <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      onClick={() => setReview(true)}
                    >
                      Revisar <ClipboardCheck size={16} />
                    </button>
                  )}
                </div>
              </>
            )}
          </fieldset>
        </section>
      </div>
    </div>
  );
}
