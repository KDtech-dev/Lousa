import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileQuestion,
  Monitor,
  ShieldAlert,
  Users,
} from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import StudentIdentity, {
  type StudentIdentityData,
} from "../components/StudentIdentity";
import NativeAppControls from "../components/NativeAppControls";
import PublicMaterials from "../components/PublicMaterials";
import StudentExam from "../components/StudentExam";
import AttemptReceipt from "../components/AttemptReceipt";
import ConfirmDialog from "../components/ConfirmDialog";
import { ErrorNotice, Loading } from "../components/Feedback";
import { demoApi } from "../services/demoApi";
import { isTestToolsEnabled } from "../services/teacherGateway";
import { formatDateTime, formatPoints, messageOf } from "../services/format";
import { canStart } from "../services/nativeApp";
import {
  attemptPointer,
  useStudentAttempt,
} from "../services/useStudentAttempt";
import type { Material, NativeAppState, PublicApplication } from "../types";

export default function StudentPage() {
  const { codigo = "" } = useParams();
  const code = codigo.trim().toUpperCase();
  const [application, setApplication] = useState<PublicApplication | null>(
    null,
  );
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [identity, setIdentity] = useState<StudentIdentityData | null>(null);
  const [phase, setPhase] = useState<"identify" | "instructions" | "exam">(
    "identify",
  );
  const [nativeState, setNativeState] = useState<NativeAppState>("pending");
  const [suspended, setSuspended] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"submitted" | "abandoned" | null>(
    null,
  );
  const session = useStudentAttempt();

  useEffect(() => {
    let cancelled = false;
    session.reset();
    setConfirm(null);
    setActionError("");
    setLoading(true);
    setError("");
    setApplication(null);
    setPhase("identify");
    setIdentity(null);
    setNativeState("pending");
    setSuspended(false);
    setAccepted(false);
    async function load() {
      try {
        const [app, allowedMaterials] = await Promise.all([
          demoApi.getPublicApplication(code),
          demoApi.getPublicMaterials(code),
        ]);
        if (cancelled) return;
        setApplication(app);
        setMaterials(allowedMaterials);
        const savedId = localStorage.getItem(attemptPointer(code));
        if (savedId) {
          const saved = await demoApi.getPublicAttempt(savedId);
          if (saved.applicationId !== app.id)
            throw new Error(
              "O identificador salvo não pertence a esta atividade.",
            );
          if (cancelled) return;
          session.restore(saved);
          setIdentity({ name: saved.name, email: saved.email });
          if (saved.status === "in_progress") {
            if (app.appRequired) {
              setPhase("instructions");
              setSuspended(true);
            } else {
              const resumed = await demoApi.resumeAttempt(saved.id);
              if (!cancelled) {
                session.restore(resumed);
                setPhase("exam");
              }
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(messageOf(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [code, session.restore, session.reset]);

  async function begin() {
    if (!application || !identity || !accepted) return;
    setBusy(true);
    setActionError("");
    try {
      const saved =
        session.attempt?.status === "in_progress"
          ? await demoApi.resumeAttempt(session.attempt.id, nativeState)
          : await demoApi.startAttempt(code, {
              ...identity,
              appState: nativeState,
            });
      localStorage.setItem(attemptPointer(code), saved.id);
      session.restore(saved);
      setPhase("exam");
      setSuspended(false);
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  function changeNativeState(state: NativeAppState) {
    setNativeState(state);
    if (phase === "exam" && state !== "ready") {
      setSuspended(true);
      setConfirm(null);
    }
  }
  async function resume() {
    if (!session.attempt) return;
    setBusy(true);
    setActionError("");
    try {
      session.restore(
        await demoApi.resumeAttempt(session.attempt.id, nativeState),
      );
      setSuspended(false);
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    if (!confirm || suspended) return;
    setActionError("");
    try {
      await session.finish(confirm);
      setConfirm(null);
    } catch (e) {
      setActionError(messageOf(e));
    }
  }
  function prepareNew() {
    localStorage.removeItem(attemptPointer(code));
    setIdentity(null);
    setPhase("identify");
    setNativeState("pending");
    setAccepted(false);
    setSuspended(false);
    setActionError("");
    // Uma nova participação exige ação explícita; os registros anteriores são preservados.
    window.location.reload();
  }
  const ended = !!session.attempt && session.attempt.status !== "in_progress";
  const notOpen = application && Date.now() < Date.parse(application.startAt);
  const closed =
    application &&
    (application.status === "closed" ||
      Date.now() >= Date.parse(application.endAt));
  const unanswered = application
    ? application.snapshot.questions.filter(
        (question) => !session.answers[question.id]?.trim(),
      ).length
    : 0;

  return (
    <PublicLayout code={code}>
      {loading ? (
        <Loading label="Buscando sua atividade…" />
      ) : error ? (
        <section className="card student-unavailable">
          <ShieldAlert size={34} />
          <h1>Não foi possível acessar.</h1>
          <p>{error}</p>
          <Link to="/participar" className="button primary">
            <ArrowLeft size={16} /> Conferir o código
          </Link>
        </section>
      ) : application && ended && session.attempt ? (
        <AttemptReceipt
          application={application}
          attempt={session.attempt}
          onRefresh={session.restore}
          onNew={prepareNew}
        />
      ) : application && (notOpen || closed) ? (
        <section className="card student-unavailable">
          <CalendarClock size={35} />
          <span className="eyebrow">{application.snapshot.subject}</span>
          <h1>
            {notOpen
              ? "Nos encontramos em breve."
              : "Esta atividade foi encerrada."}
          </h1>
          <p>{application.snapshot.title}</p>
          <div className="notice info">
            {notOpen
              ? `A atividade estará disponível a partir de ${formatDateTime(application.startAt)}.`
              : `O período desta aplicação terminou. Novas participações não estão disponíveis.`}
          </div>
          <Link to="/participar" className="button secondary">
            <ArrowLeft size={16} /> Acessar outra atividade
          </Link>
        </section>
      ) : (
        application && (
          <>
            {phase !== "exam" && (
              <div className="student-activity-heading">
                <span className="badge green">
                  {application.snapshot.subject}
                </span>
                <h1>{application.snapshot.title}</h1>
                <p>{application.snapshot.description}</p>
                <div className="student-steps">
                  <span className={phase === "identify" ? "current" : "done"}>
                    <i>
                      {phase === "instructions" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        "1"
                      )}
                    </i>{" "}
                    Identificação
                  </span>
                  <b />
                  <span className={phase === "instructions" ? "current" : ""}>
                    <i>2</i> Preparação
                  </span>
                  <b />
                  <span>
                    <i>3</i> Atividade
                  </span>
                </div>
              </div>
            )}
            {phase === "identify" && (
              <StudentIdentity
                application={application}
                onContinue={(data) => {
                  setIdentity(data);
                  setPhase("instructions");
                  setActionError("");
                }}
              />
            )}
            {phase === "instructions" && (
              <div className="preparation-grid">
                <section className="card preparation-card">
                  <span className="eyebrow">SEU PRÓXIMO PASSO</span>
                  <h2>
                    {session.attempt?.status === "in_progress"
                      ? "Vamos retomar sua atividade."
                      : `Tudo pronto, ${identity?.name.split(" ")[0]}?`}
                  </h2>
                  <p className="muted">
                    Reserve um momento tranquilo e leia as orientações antes de
                    começar.
                  </p>
                  <div className="preparation-stats">
                    <span>
                      <Clock3 size={18} />
                      <strong>{application.durationMinutes} min</strong>
                      <small>Duração máxima</small>
                    </span>
                    <span>
                      <FileQuestion size={18} />
                      <strong>
                        {application.snapshot.questions.length} questões
                      </strong>
                      <small>Para você responder</small>
                    </span>
                    <span>
                      <BookOpen size={18} />
                      <strong>
                        {formatPoints(
                          application.snapshot.questions.reduce(
                            (sum, question) => sum + question.points,
                            0,
                          ),
                        )}{" "}
                        pontos
                      </strong>
                      <small>Pontuação total</small>
                    </span>
                  </div>
                  <div className="student-instructions">
                    <h3>Orientações do professor</h3>
                    <p>
                      {application.snapshot.instructions ||
                        "Leia os enunciados com atenção e revise suas respostas."}
                    </p>
                  </div>
                  <ul className="student-rules">
                    <li>
                      <CalendarClock size={16} />
                      <span>
                        Disponível até{" "}
                        <strong>{formatDateTime(application.endAt)}</strong>.
                      </span>
                    </li>
                    <li>
                      <Users size={16} />
                      <span>
                        Identificação por{" "}
                        {application.accessMode === "email"
                          ? isTestToolsEnabled
                            ? `e-mail verificado na demonstração (${identity?.email})`
                            : `e-mail informado (${identity?.email})`
                          : "nome informado"}
                        .
                      </span>
                    </li>
                    <li>
                      <Clock3 size={16} />
                      <span>
                        O prazo usa um horário final absoluto. Recarregar a
                        página não reinicia o tempo.{" "}
                        {session.attempt?.status === "in_progress" && (
                          <strong>
                            Seu prazo termina em{" "}
                            {formatDateTime(session.attempt.deadlineAt)}.
                          </strong>
                        )}
                      </span>
                    </li>
                    {application.appRequired && (
                      <li>
                        <Monitor size={16} />
                        <span>
                          {isTestToolsEnabled
                            ? "Aplicativo obrigatório nesta simulação. É necessário selecionar o estado “Pronto” para iniciar ou retomar."
                            : "Esta atividade exige um aplicativo que não está disponível no momento. Entre em contato com o professor."}
                        </span>
                      </li>
                    )}
                  </ul>
                  <PublicMaterials materials={materials} />
                  <label className="checkbox-label instructions-consent">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(event) => setAccepted(event.target.checked)}
                    />
                    Li as orientações e estou pronto para{" "}
                    {session.attempt?.status === "in_progress"
                      ? "retomar"
                      : "começar"}
                    .
                  </label>
                  {actionError && <ErrorNotice message={actionError} />}
                  <button
                    className="button primary begin-button"
                    disabled={
                      !accepted ||
                      busy ||
                      (application.appRequired && !isTestToolsEnabled) ||
                      (application.appRequired && !canStart(nativeState))
                    }
                    onClick={begin}
                  >
                    {busy
                      ? "Preparando…"
                      : session.attempt?.status === "in_progress"
                        ? "Autorizar retomada e continuar"
                        : "Começar atividade"}
                    <ArrowRight size={17} />
                  </button>
                  <small className="preparation-note">
                    O cronômetro{" "}
                    {session.attempt?.status === "in_progress"
                      ? "continua contando durante a preparação"
                      : "começa ao iniciar"}
                    . Ao esgotar o prazo, as respostas salvas{" "}
                    {isTestToolsEnabled
                      ? "serão entregues automaticamente."
                      : "permanecem neste dispositivo."}
                  </small>
                </section>
                {application.appRequired && !isTestToolsEnabled ? (
                  <aside className="preparation-aside">
                    <span className="student-leaf">
                      <ShieldAlert size={28} />
                    </span>
                    <h3>Acesso indisponível.</h3>
                    <p>
                      A atividade depende de um aplicativo que não está
                      disponível agora. Entre em contato com o professor.
                    </p>
                  </aside>
                ) : application.appRequired ? (
                  <NativeAppControls
                    value={nativeState}
                    onChange={changeNativeState}
                  />
                ) : (
                  <aside className="preparation-aside">
                    <span className="student-leaf">
                      <BookOpen size={28} />
                    </span>
                    <h3>Uma questão por vez.</h3>
                    <p>
                      Você pode navegar entre as questões, revisar suas
                      respostas e acompanhar o que ainda falta.
                    </p>
                    <p>
                      {isTestToolsEnabled
                        ? "O salvamento distingue os dados locais da sincronização simulada."
                        : "As respostas ficam salvas neste dispositivo."}
                    </p>
                    {!isTestToolsEnabled && (
                      <span className="badge green">Sem conta permanente</span>
                    )}
                  </aside>
                )}
              </div>
            )}
            {phase === "exam" && session.attempt && (
              <>
                <StudentExam
                  application={application}
                  attempt={session.attempt}
                  materials={materials}
                  answers={session.answers}
                  remainingSeconds={session.remainingSeconds}
                  saveState={session.saveState}
                  saveError={session.saveError}
                  onAnswer={session.updateAnswer}
                  suspended={suspended}
                  busy={session.busy || busy}
                  onSync={() => session.sync().catch(() => {})}
                  onDeliver={() => {
                    setActionError("");
                    setConfirm("submitted");
                  }}
                  onAbandon={() => {
                    setActionError("");
                    setConfirm("abandoned");
                  }}
                />
                {actionError && <ErrorNotice message={actionError} />}
                {isTestToolsEnabled && <div className="exam-demo-controls">
                  {application.appRequired && (
                    <NativeAppControls
                      value={nativeState}
                      onChange={changeNativeState}
                      suspended={suspended}
                      onResume={resume}
                      busy={busy}
                    />
                  )}
                  <details className="save-demo-scenario">
                    <summary>Controles de demonstração · salvamento</summary>
                    <p>
                      Use este cenário para testar a recuperação. As respostas
                      são mantidas localmente e a sincronização retorna um erro
                      simulado.
                    </p>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={session.simulateFailure}
                        onChange={(event) =>
                          session.setSimulateFailure(event.target.checked)
                        }
                      />
                      Simular falha na sincronização
                    </label>
                  </details>
                </div>}
              </>
            )}
            {confirm && (
              <ConfirmDialog
                title={
                  confirm === "submitted"
                    ? isTestToolsEnabled
                      ? "Entregar sua atividade?"
                      : "Encerrar atividade neste dispositivo?"
                    : "Confirmar desistência?"
                }
                onClose={() => {
                  if (!session.busy) setConfirm(null);
                }}
              >
                <p className="muted">
                  {confirm === "submitted"
                    ? isTestToolsEnabled
                      ? "Após a entrega, as respostas desta participação não poderão ser alteradas."
                      : "As respostas serão salvas neste dispositivo e não poderão ser alteradas. O envio ao professor não está disponível no momento."
                    : "Sua participação será encerrada. As respostas registradas serão preservadas e você não poderá retomar esta tentativa."}
                </p>
                {confirm === "submitted" && unanswered > 0 && (
                  <div className="notice warning">
                    <FileQuestion size={20} />
                    <span>
                      <strong>
                        {unanswered}{" "}
                        {unanswered === 1
                          ? "questão está em branco"
                          : "questões estão em branco"}
                        .
                      </strong>
                      <br />
                      {isTestToolsEnabled
                        ? "Você pode voltar para responder ou confirmar a entrega."
                        : "Você pode voltar para responder ou salvar as respostas agora."}
                    </span>
                  </div>
                )}
                {actionError && <ErrorNotice message={actionError} />}
                <div className="modal-footer">
                  <button
                    className="button secondary"
                    disabled={session.busy}
                    onClick={() => setConfirm(null)}
                  >
                    Voltar à atividade
                  </button>
                  <button
                    className={`button ${confirm === "abandoned" ? "danger" : "primary"}`}
                    disabled={session.busy}
                    onClick={finish}
                  >
                    {session.busy
                      ? "Registrando…"
                      : confirm === "submitted"
                        ? isTestToolsEnabled
                          ? "Confirmar entrega"
                          : "Salvar respostas"
                        : "Confirmar desistência"}
                  </button>
                </div>
              </ConfirmDialog>
            )}
          </>
        )
      )}
    </PublicLayout>
  );
}
