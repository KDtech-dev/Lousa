import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Copy,
  CalendarDays,
  Clock3,
  Monitor,
  Users,
  Mail,
  ArrowUpRight,
  FileText,
  Check,
  LockKeyhole,
  Send,
  Eye,
  CircleStop,
  Link2,
  LoaderCircle,
} from "lucide-react";
import ManagementDialog from "../components/ManagementDialog";
import {
  isDemoMode,
  isTestToolsEnabled,
} from "../services/teacherGateway";
import {
  closeApplication,
  listApplications,
  listAssessments,
  listMaterials,
  publishApplication,
} from "../services/demoApi";
import type {
  Application,
  ApplicationInput,
  Assessment,
  Material,
} from "../types";
import {
  applicationState,
  errorMessage,
  formatDate,
  formatPoints,
  localDateInput,
} from "./managementUtils";
import "../styles/management.css";

interface ApplicationForm {
  assessmentId: string;
  startAt: string;
  endAt: string;
  durationMinutes: string;
  accessMode: "name" | "email";
  emails: string;
  appRequired: boolean;
}
type FieldErrors = Partial<Record<keyof ApplicationForm, string>>;
type Notice = { kind: "success" | "error"; text: string };

function initialForm(): ApplicationForm {
  return {
    assessmentId: "",
    startAt: localDateInput(new Date()),
    endAt: localDateInput(new Date(Date.now() + 7 * 24 * 60 * 60_000)),
    durationMinutes: "60",
    accessMode: "name",
    emails: "",
    appRequired: false,
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [closing, setClosing] = useState<Application | null>(null);
  const [closeError, setCloseError] = useState("");
  const [inspecting, setInspecting] = useState<Application | null>(null);
  const [copyingId, setCopyingId] = useState("");

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [nextApplications, nextAssessments, nextMaterials] =
        await Promise.all([
          listApplications(),
          listAssessments(),
          listMaterials(),
        ]);
      setApplications(nextApplications);
      setAssessments(nextAssessments);
      setMaterials(nextMaterials);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeAssessments = assessments.filter(
    (assessment) => !assessment.archived,
  );
  const selectedAssessment = activeAssessments.find(
    (assessment) => assessment.id === form.assessmentId,
  );
  const filtered = useMemo(
    () =>
      applications
        .filter((application) => {
          const matchesSearch =
            `${application.snapshot.title} ${application.snapshot.subject} ${application.code}`
              .toLocaleLowerCase("pt-BR")
              .includes(search.toLocaleLowerCase("pt-BR"));
          return (
            matchesSearch &&
            (statusFilter === "all" ||
              applicationState(application) === statusFilter)
          );
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [applications, search, statusFilter],
  );

  function update<K extends keyof ApplicationForm>(
    key: K,
    value: ApplicationForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setFormError("");
  }

  function openCreation() {
    setForm(initialForm());
    setErrors({});
    setFormError("");
    setCreating(true);
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    const validation: FieldErrors = {};
    const start = new Date(form.startAt).getTime();
    const end = new Date(form.endAt).getTime();
    const duration = Number(form.durationMinutes);
    const emails = [
      ...new Set(
        form.emails
          .split(/[\s,;]+/)
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (!selectedAssessment)
      validation.assessmentId = "Selecione uma avaliação.";
    else if (!selectedAssessment.questions.length)
      validation.assessmentId =
        "Adicione questões à avaliação antes de publicar.";
    if (!Number.isFinite(start))
      validation.startAt = "Informe uma data e um horário de início.";
    if (!Number.isFinite(end))
      validation.endAt = "Informe uma data e um horário de encerramento.";
    else if (Number.isFinite(start) && end <= start)
      validation.endAt = "O encerramento deve ocorrer depois do início.";
    else if (end <= Date.now())
      validation.endAt = "O encerramento deve estar no futuro.";
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440)
      validation.durationMinutes =
        "Informe uma duração inteira entre 1 e 1.440 minutos.";
    if (form.accessMode === "email") {
      if (!emails.length)
        validation.emails = "Informe ao menos um e-mail autorizado.";
      else if (
        emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      )
        validation.emails =
          "Revise a lista: há um e-mail com formato inválido.";
    }
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const input: ApplicationInput = {
      assessmentId: form.assessmentId,
      startAt: new Date(start).toISOString(),
      endAt: new Date(end).toISOString(),
      durationMinutes: duration,
      accessMode: form.accessMode,
      allowedEmails: form.accessMode === "email" ? emails : [],
      appRequired: form.appRequired,
    };
    setSaving(true);
    setFormError("");
    try {
      const application = await publishApplication(input);
      setApplications((previous) => [application, ...previous]);
      setCreating(false);
      setNotice({
        kind: "success",
        text: isDemoMode
          ? `Aplicação salva neste dispositivo. O acesso dos alunos fica restrito a este navegador. Código: ${application.code}.`
          : `Aplicação publicada. Compartilhe o código ${application.code} ou copie o link.`,
      });
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function copy(application: Application, codeOnly = false) {
    const value = codeOnly
      ? application.code
      : `${window.location.origin}/p/${encodeURIComponent(application.code)}`;
    try {
      if (!navigator.clipboard)
        throw new Error(
          "Não foi possível copiar automaticamente. Abra os detalhes e copie o link ou o código manualmente.",
        );
      await navigator.clipboard.writeText(value);
      setCopyingId(`${application.id}-${codeOnly ? "code" : "link"}`);
      setNotice({
        kind: "success",
        text: codeOnly ? "Código copiado." : "Link de participação copiado.",
      });
      window.setTimeout(() => setCopyingId(""), 1800);
    } catch {
      setNotice({
        kind: "error",
        text: "Não foi possível copiar automaticamente. Abra os detalhes e copie o link ou o código manualmente.",
      });
    }
  }

  async function confirmClose() {
    if (!closing) return;
    setSaving(true);
    setCloseError("");
    try {
      await closeApplication(closing.id);
      setApplications((previous) =>
        previous.map((application) =>
          application.id === closing.id
            ? { ...application, status: "closed" }
            : application,
        ),
      );
      setNotice({
        kind: "success",
        text: "Aplicação encerrada. As participações registradas estão disponíveis nos resultados.",
      });
      setClosing(null);
    } catch (error) {
      setCloseError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mg-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COMPARTILHAR E ACOMPANHAR</p>
          <h1>Aplicações</h1>
          <p className="muted">
            Escolha quando, como e para quem suas avaliações ficam disponíveis.
          </p>
        </div>
        <button
          className="button primary"
          onClick={openCreation}
          disabled={loading || !!loadError}
        >
          <Plus size={18} /> Nova aplicação
        </button>
      </div>

      {isDemoMode && !isTestToolsEnabled && (
        <div className="notice info local-data-note" role="note">
          As atividades e respostas desta área ficam disponíveis somente neste
          dispositivo.
        </div>
      )}

      {notice && (
        <div
          className={`notice ${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
          <button
            className="mg-notice-close"
            onClick={() => setNotice(null)}
            aria-label="Dispensar mensagem"
          >
            ×
          </button>
        </div>
      )}
      {loadError ? (
        <div className="notice error" role="alert">
          {loadError}
          <button
            className="button small secondary"
            onClick={() => void load()}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="mg-summary-row">
            <div className="card mg-summary">
              <span className="mg-summary-icon">
                <Send size={19} />
              </span>
              <div>
                <strong>
                  {
                    applications.filter(
                      (application) =>
                        applicationState(application) === "available",
                    ).length
                  }
                </strong>
                <span>Disponíveis agora</span>
              </div>
            </div>
            <div className="card mg-summary">
              <span className="mg-summary-icon mg-icon-blue">
                <CalendarDays size={19} />
              </span>
              <div>
                <strong>
                  {
                    applications.filter(
                      (application) =>
                        applicationState(application) === "scheduled",
                    ).length
                  }
                </strong>
                <span>Agendadas</span>
              </div>
            </div>
            <div className="card mg-summary">
              <span className="mg-summary-icon mg-icon-gray">
                <CircleStop size={19} />
              </span>
              <div>
                <strong>
                  {
                    applications.filter(
                      (application) =>
                        applicationState(application) === "closed",
                    ).length
                  }
                </strong>
                <span>Encerradas</span>
              </div>
            </div>
          </div>

          <div className="card mg-list-panel">
            <div className="mg-toolbar">
              <label className="mg-search mg-labelled-search">
                <span className="mg-filter-label">Pesquisar aplicações</span>
                <span className="mg-search-control">
                  <Search size={18} aria-hidden="true" />
                  <input
                    aria-label="Pesquisar aplicações"
                    className="search-input"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por título, disciplina ou código"
                  />
                </span>
              </label>
              <label className="mg-filter mg-labelled-filter">
                <span className="mg-filter-label">Filtrar por situação</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">Todas as situações</option>
                  <option value="available">Disponíveis</option>
                  <option value="scheduled">Agendadas</option>
                  <option value="closed">Encerradas</option>
                </select>
              </label>
            </div>
            {loading ? (
              <div className="empty-state" role="status">
                <LoaderCircle className="mg-spin" size={26} />
                <p>Carregando aplicações…</p>
              </div>
            ) : !filtered.length ? (
              <div className="empty-state">
                <Send size={32} />
                <h3>
                  {applications.length
                    ? "Nenhuma aplicação encontrada"
                    : "Sua próxima avaliação começa aqui"}
                </h3>
                <p>
                  {applications.length
                    ? "Experimente outro termo ou situação."
                    : "Publique uma avaliação para compartilhar um link com os alunos."}
                </p>
                {!applications.length && (
                  <button className="button primary" onClick={openCreation}>
                    <Plus size={16} /> Criar aplicação
                  </button>
                )}
              </div>
            ) : (
              <div className="mg-application-list">
                {filtered.map((application) => {
                  const state = applicationState(application);
                  const total = application.snapshot.questions.reduce(
                    (sum, question) => sum + question.points,
                    0,
                  );
                  return (
                    <article className="mg-application" key={application.id}>
                      <div className="mg-application-top">
                        <div className="mg-application-title">
                          <span className="mg-document-icon">
                            <FileText size={23} />
                          </span>
                          <div>
                            <p className="mg-subject">
                              {application.snapshot.subject}
                            </p>
                            <h2>{application.snapshot.title}</h2>
                            <p className="muted">
                              {application.snapshot.questions.length} questões{" "}
                              <span aria-hidden="true">·</span>{" "}
                              {formatPoints(total)} pontos
                            </p>
                          </div>
                        </div>
                        <span
                          className={`badge ${state === "available" ? "green" : state === "scheduled" ? "blue" : "gray"}`}
                        >
                          {state === "available"
                            ? "Disponível"
                            : state === "scheduled"
                              ? "Agendada"
                              : "Encerrada"}
                        </span>
                      </div>
                      <div className="mg-application-meta">
                        <span>
                          <CalendarDays size={15} />
                          <span>
                            {formatDate(application.startAt)}{" "}
                            <span className="muted">até</span>{" "}
                            {formatDate(application.endAt)}
                          </span>
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {application.durationMinutes} min
                        </span>
                        <span>
                          {application.accessMode === "email" ? (
                            <Mail size={15} />
                          ) : (
                            <Users size={15} />
                          )}
                          {application.accessMode === "email"
                            ? `${application.allowedEmails.length} e-mails autorizados`
                            : "Identificação por nome"}
                        </span>
                        <span>
                          <Monitor size={15} />
                          {application.appRequired
                            ? isTestToolsEnabled
                              ? "Aplicativo obrigatório · simulado"
                              : "Aplicativo indisponível"
                            : "Navegador comum"}
                        </span>
                      </div>
                      <div className="mg-application-bottom">
                        <button
                          className="mg-code"
                          title="Copiar código de participação"
                          onClick={() => void copy(application, true)}
                        >
                          <span className="muted">CÓDIGO</span>
                          <strong>{application.code}</strong>
                          {copyingId === `${application.id}-code` ? (
                            <Check size={15} />
                          ) : (
                            <Copy size={15} />
                          )}
                        </button>
                        <div className="mg-inline-actions">
                          <button
                            className="button ghost small"
                            onClick={() => setInspecting(application)}
                          >
                            <Eye size={15} /> Detalhes
                          </button>
                          <Link
                            className="button ghost small"
                            to={`/resultados?application=${application.id}`}
                          >
                            Resultados <ArrowUpRight size={15} />
                          </Link>
                          <button
                            className="button secondary small"
                            onClick={() => void copy(application)}
                          >
                            {copyingId === `${application.id}-link` ? (
                              <Check size={15} />
                            ) : (
                              <Link2 size={15} />
                            )}{" "}
                            Copiar link
                          </button>
                          {state !== "closed" && (
                            <button
                              className="icon-button mg-stop-button"
                              aria-label={`Encerrar ${application.snapshot.title}`}
                              title="Encerrar aplicação"
                              onClick={() => {
                                setCloseError("");
                                setClosing(application);
                              }}
                            >
                              <CircleStop size={19} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mg-footnote">
            <LockKeyhole size={14} />
            Cada aplicação preserva uma cópia da avaliação. Alterações no editor
            não modificam as questões publicadas.
          </p>
        </>
      )}

      {creating && (
        <ManagementDialog
          title="Nova aplicação"
          subtitle={
            isDemoMode && !isTestToolsEnabled
              ? "Configure o período. O acesso ficará disponível somente neste dispositivo."
              : "Configure o acesso e compartilhe a avaliação com seus alunos."
          }
          onClose={() => {
            if (!saving) setCreating(false);
          }}
          wide
        >
          <form onSubmit={(event) => void publish(event)} noValidate>
            {formError && (
              <div className="notice error" role="alert">
                {formError}
              </div>
            )}
            <section className="mg-form-section">
              <h3>
                <span>1</span>Avaliação e disponibilidade
              </h3>
              <label className="field">
                Avaliação
                <select
                  value={form.assessmentId}
                  onChange={(event) =>
                    update("assessmentId", event.target.value)
                  }
                  aria-invalid={!!errors.assessmentId}
                  aria-describedby={
                    errors.assessmentId
                      ? "application-assessment-error"
                      : undefined
                  }
                >
                  <option value="">Selecione uma avaliação</option>
                  {activeAssessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title} · {assessment.subject}
                    </option>
                  ))}
                </select>
                {errors.assessmentId && (
                  <span
                    id="application-assessment-error"
                    className="mg-field-error"
                  >
                    {errors.assessmentId}
                  </span>
                )}
              </label>
              {!activeAssessments.length && (
                <p className="notice info">
                  Crie uma avaliação com questões em{" "}
                  <Link to="/avaliacoes" onClick={() => setCreating(false)}>
                    Avaliações
                  </Link>{" "}
                  para publicá-la.
                </p>
              )}
              {selectedAssessment && (
                <div className="mg-selected-assessment">
                  <FileText size={19} />
                  <span>
                    {selectedAssessment.questions.length} questões ·{" "}
                    {formatPoints(
                      selectedAssessment.questions.reduce(
                        (sum, question) => sum + question.points,
                        0,
                      ),
                    )}{" "}
                    pontos
                    <span className="muted">
                      {" "}
                      Uma cópia será preservada na publicação.
                    </span>
                  </span>
                </div>
              )}
              <div className="form-grid mg-date-grid">
                <label className="field">
                  Disponível a partir de
                  <input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(event) => update("startAt", event.target.value)}
                    aria-invalid={!!errors.startAt}
                    aria-describedby={
                      errors.startAt ? "application-start-error" : undefined
                    }
                  />
                  {errors.startAt && (
                    <span
                      id="application-start-error"
                      className="mg-field-error"
                    >
                      {errors.startAt}
                    </span>
                  )}
                </label>
                <label className="field">
                  Disponível até
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(event) => update("endAt", event.target.value)}
                    aria-invalid={!!errors.endAt}
                    aria-describedby={
                      errors.endAt ? "application-end-error" : undefined
                    }
                  />
                  {errors.endAt && (
                    <span id="application-end-error" className="mg-field-error">
                      {errors.endAt}
                    </span>
                  )}
                </label>
              </div>
              <label className="field mg-duration-field">
                Duração por aluno (minutos)
                <input
                  type="number"
                  min="1"
                  max="1440"
                  step="1"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    update("durationMinutes", event.target.value)
                  }
                  aria-invalid={!!errors.durationMinutes}
                  aria-describedby="application-duration-help"
                />
                <span
                  id="application-duration-help"
                  className={
                    errors.durationMinutes ? "mg-field-error" : "mg-field-help"
                  }
                >
                  {errors.durationMinutes ||
                    "O prazo da tentativa respeita também o encerramento da aplicação."}
                </span>
              </label>
            </section>
            <section className="mg-form-section">
              <h3>
                <span>2</span>Identificação dos alunos
              </h3>
              <fieldset className="mg-choice-grid">
                <legend className="mg-sr-only">
                  Como o aluno se identifica
                </legend>
                <label
                  className={`mg-choice ${form.accessMode === "name" ? "mg-choice-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="accessMode"
                    value="name"
                    checked={form.accessMode === "name"}
                    onChange={() => update("accessMode", "name")}
                  />
                  <Users size={20} />
                  <span>
                    <strong>Nome informado</strong>
                    <small>Quem tiver o link ou código pode participar.</small>
                  </span>
                </label>
                {isTestToolsEnabled && (
                  <label
                    className={`mg-choice ${form.accessMode === "email" ? "mg-choice-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="accessMode"
                      value="email"
                      checked={form.accessMode === "email"}
                      onChange={() => update("accessMode", "email")}
                    />
                    <Mail size={20} />
                    <span>
                      <strong>E-mails autorizados</strong>
                      <small>
                        Acesso com verificação demonstrativa de e-mail.
                      </small>
                    </span>
                  </label>
                )}
              </fieldset>
              {form.accessMode === "email" && (
                <label className="field mg-emails-field">
                  Lista de e-mails autorizados
                  <textarea
                    rows={4}
                    value={form.emails}
                    onChange={(event) => update("emails", event.target.value)}
                    placeholder={"ana@example.com\nbruno@example.com"}
                    aria-invalid={!!errors.emails}
                    aria-describedby="application-emails-help"
                  />
                  <span
                    id="application-emails-help"
                    className={
                      errors.emails ? "mg-field-error" : "mg-field-help"
                    }
                  >
                    {errors.emails ||
                      "Separe os e-mails por linha, vírgula ou ponto e vírgula. Nenhum e-mail real será enviado."}
                  </span>
                </label>
              )}
            </section>
            {isTestToolsEnabled && (
              <section className="mg-form-section">
                <h3>
                  <span>3</span>Ambiente da avaliação
                </h3>
                <label className="mg-app-choice">
                  <span className="mg-app-choice-icon">
                    <Monitor size={23} />
                  </span>
                  <span>
                    <strong>Exigir aplicativo para começar</strong>
                    <small>Opção independente da identificação do aluno.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.appRequired}
                    onChange={(event) =>
                      update("appRequired", event.target.checked)
                    }
                  />
                </label>
                {form.appRequired && (
                  <div className="notice info mg-app-notice">
                    <strong>Integração demonstrativa</strong>
                    <p>
                      A preparação usará estados simulados do aplicativo. Windows
                      11 e Linux Mint são sistemas previstos; o aplicativo nativo
                      será desenvolvido em outra etapa.
                    </p>
                  </div>
                )}
              </section>
            )}
            <footer className="mg-dialog-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setCreating(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                type="submit"
                disabled={saving || !activeAssessments.length}
              >
                {saving ? (
                  <LoaderCircle size={17} className="mg-spin" />
                ) : (
                  <Send size={17} />
                )}
                {saving
                  ? isDemoMode && !isTestToolsEnabled
                    ? "Salvando…"
                    : "Publicando…"
                  : isDemoMode && !isTestToolsEnabled
                    ? "Salvar aplicação neste dispositivo"
                    : "Publicar aplicação"}
              </button>
            </footer>
          </form>
        </ManagementDialog>
      )}

      {closing && (
        <ManagementDialog
          title="Encerrar aplicação?"
          subtitle={closing.snapshot.title}
          onClose={() => {
            if (!saving) setClosing(null);
          }}
        >
          <p className="mg-dialog-copy">
            O link e o código deixarão de aceitar novos acessos. As respostas já
            registradas serão preservadas nos resultados.
          </p>
          {closeError && (
            <div className="notice error" role="alert">
              {closeError}
            </div>
          )}
          <div className="mg-dialog-actions">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setClosing(null)}
            >
              Manter disponível
            </button>
            <button
              className="button danger"
              disabled={saving}
              onClick={() => void confirmClose()}
            >
              {saving ? "Encerrando…" : "Encerrar aplicação"}
            </button>
          </div>
        </ManagementDialog>
      )}

      {inspecting && (
        <ManagementDialog
          title={inspecting.snapshot.title}
          subtitle="Cópia preservada no momento da publicação."
          onClose={() => setInspecting(null)}
          wide
        >
          {notice?.kind === "error" && (
            <div className="notice error" role="alert">
              {notice.text}
            </div>
          )}
          <div className="mg-detail-grid">
            <div>
              <span className="mg-detail-label">
                Período de disponibilidade
              </span>
              <p>
                {formatDate(inspecting.startAt)} até{" "}
                {formatDate(inspecting.endAt)}
              </p>
            </div>
            <div>
              <span className="mg-detail-label">Duração e ambiente</span>
              <p>
                {inspecting.durationMinutes} minutos ·{" "}
                {inspecting.appRequired
                  ? isTestToolsEnabled
                    ? "Aplicativo obrigatório (simulado)"
                    : "Aplicativo indisponível"
                  : "Navegador comum"}
              </p>
            </div>
          </div>
          <label className="field">
            Link de participação
            <input
              readOnly
              value={`${window.location.origin}/p/${encodeURIComponent(inspecting.code)}`}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <div className="mg-detail-code">
            <span>
              Código: <strong>{inspecting.code}</strong>
            </span>
            <a
              className="button secondary small"
              href={`/p/${encodeURIComponent(inspecting.code)}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir como aluno <ArrowUpRight size={15} />
            </a>
          </div>
          {inspecting.accessMode === "email" && (
            <details className="mg-snapshot-details">
              <summary>
                {inspecting.allowedEmails.length} e-mails autorizados
              </summary>
              <ul>
                {inspecting.allowedEmails.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            </details>
          )}
          <section className="mg-snapshot-section">
            <h3>Instruções da avaliação</h3>
            <p className="mg-preserve-lines">
              {inspecting.snapshot.instructions ||
                "Nenhuma instrução adicional."}
            </p>
            {inspecting.snapshot.materialIds.length > 0 && (
              <>
                <h3>Materiais associados</h3>
                <ul>
                  {inspecting.snapshot.materialIds.map((id) => (
                    <li key={id}>
                      {materials.find((material) => material.id === id)
                        ?.title || "Material indisponível"}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h3>Questões publicadas</h3>
            {inspecting.snapshot.questions.map((question, index) => (
              <div className="mg-snapshot-question" key={question.id}>
                <span className="mg-question-number">{index + 1}</span>
                <div>
                  <p>{question.prompt}</p>
                  <span className="muted">
                    {question.type === "single"
                      ? "Alternativa única"
                      : question.type === "boolean"
                        ? "Verdadeiro ou falso"
                        : "Resposta aberta"}{" "}
                    · {formatPoints(question.points)} pontos
                  </span>
                </div>
              </div>
            ))}
          </section>
          <footer className="mg-dialog-actions">
            <button
              className="button secondary"
              onClick={() => setInspecting(null)}
            >
              Fechar
            </button>
            <button
              className="button primary"
              onClick={() => void copy(inspecting)}
            >
              {copyingId === `${inspecting.id}-link` ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
              {copyingId === `${inspecting.id}-link`
                ? "Link copiado"
                : "Copiar link"}
            </button>
          </footer>
        </ManagementDialog>
      )}
    </div>
  );
}
