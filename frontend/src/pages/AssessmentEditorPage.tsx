import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  FileText,
  Link2,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { newId } from "../services/demoApi";
import ContentDialog from "../components/ContentDialog";
import QuestionEditor from "../components/QuestionEditor";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import { useUnsavedChanges } from "../services/useUnsavedChanges";
import {
  assessmentContent,
  assessmentDraftKey,
  readAssessmentDraft,
  removeAssessmentDraft,
  restoreAssessmentDraft,
  saveAssessmentDraft,
  type AssessmentDraft,
} from "../services/assessmentDrafts";
import type {
  Assessment,
  Material,
  PublicAssessment,
  Question,
} from "../types";
import {
  isDemoMode,
  isTestToolsEnabled,
  teacherGateway,
  type GeneratedActivity,
} from "../services/teacherGateway";
import "../styles/content.css";

function blankQuestion(): Question {
  return {
    id: newId("question"),
    type: "single",
    prompt: "",
    options: ["", "", "", ""],
    correctAnswer: null,
    points: 1,
  };
}
function blankAssessment(): Assessment {
  const now = new Date().toISOString();
  return {
    id: newId("assessment"),
    title: "",
    subject: "",
    description: "",
    instructions: "",
    questions: [blankQuestion()],
    materialIds: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}
type QuestionErrorField = "prompt" | "points" | "options" | "correctAnswer";
function validate(draft: Assessment) {
  const errors: Record<string, string> = {};
  const questionFields: Record<string, QuestionErrorField> = {};
  if (!draft.title.trim()) errors.title = "Informe um título para a avaliação.";
  if (!draft.subject.trim()) errors.subject = "Informe a disciplina.";
  if (draft.questions.length === 0)
    errors.questions = "Adicione pelo menos uma questão.";
  draft.questions.forEach((question) => {
    if (!question.prompt.trim()) {
      errors[question.id] = "Escreva o enunciado desta questão.";
      questionFields[question.id] = "prompt";
    } else if (
      !Number.isFinite(question.points) ||
      question.points <= 0 ||
      question.points > 10000
    ) {
      errors[question.id] = "A pontuação deve ser maior que zero e até 10.000.";
      questionFields[question.id] = "points";
    } else if (question.type === "single") {
      if (
        question.options.length < 2 ||
        question.options.some((option) => !option.trim())
      ) {
        errors[question.id] =
          "Preencha todas as alternativas. São necessárias pelo menos duas.";
        questionFields[question.id] = "options";
      } else if (
        new Set(
          question.options.map((option) =>
            option.trim().toLocaleLowerCase("pt-BR"),
          ),
        ).size !== question.options.length
      ) {
        errors[question.id] = "As alternativas devem ter textos diferentes.";
        questionFields[question.id] = "options";
      } else if (
        !question.correctAnswer ||
        !question.options.includes(question.correctAnswer)
      ) {
        errors[question.id] = "Marque a alternativa correta.";
        questionFields[question.id] = "correctAnswer";
      }
    } else if (
      question.type === "boolean" &&
      !["Verdadeiro", "Falso"].includes(question.correctAnswer || "")
    ) {
      errors[question.id] = "Selecione Verdadeiro ou Falso para o gabarito.";
      questionFields[question.id] = "correctAnswer";
    }
  });
  return { errors, questionFields };
}

function StudentPreview({
  assessment,
  materials,
  onClose,
}: {
  assessment: PublicAssessment;
  materials: Material[];
  onClose: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <ContentDialog
      labelledBy="preview-title"
      className="preview-modal"
      onClose={onClose}
    >
      <div className="preview-header">
        <span className="badge green">
          <Eye size={14} /> Visualização do aluno
        </span>
        <button
          autoFocus
          className="icon-button"
          onClick={onClose}
          aria-label="Fechar visualização"
        >
          <X size={21} />
        </button>
      </div>
      <span className="eyebrow">{assessment.subject || "DISCIPLINA"}</span>
      <h2 id="preview-title">{assessment.title || "Avaliação sem título"}</h2>
      <p className="muted">
        {assessment.questions.length} questões ·{" "}
        {assessment.questions
          .reduce((sum, question) => sum + question.points, 0)
          .toLocaleString("pt-BR")}{" "}
        pontos
      </p>
      {assessment.description && <p>{assessment.description}</p>}
      {assessment.instructions && (
        <div className="preview-instructions">
          <h3>Instruções</h3>
          <p>{assessment.instructions}</p>
        </div>
      )}
      {materials.length > 0 && (
        <div className="preview-instructions">
          <h3>Materiais de apoio</h3>
          {materials.map((material) => (
            <p key={material.id}>
              {material.type === "link" ? (
                <Link2 size={15} />
              ) : (
                <FileText size={15} />
              )}{" "}
              {material.title}
            </p>
          ))}
        </div>
      )}
      <div className="preview-questions">
        {assessment.questions.map((question, index) => (
          <fieldset key={question.id}>
            <legend>
              <span className="question-number">{index + 1}</span>
              <strong>{question.prompt || "Enunciado da questão"}</strong>
              <span className="muted">
                {question.points} {question.points === 1 ? "ponto" : "pontos"}
              </span>
            </legend>
            {question.type === "open" ? (
              <label className="field">
                <span>Sua resposta</span>
                <textarea
                  rows={4}
                  placeholder="Escreva sua resposta..."
                  value={answers[question.id] || ""}
                  onChange={(event) =>
                    setAnswers({
                      ...answers,
                      [question.id]: event.target.value,
                    })
                  }
                />
              </label>
            ) : (
              (question.type === "boolean"
                ? ["Verdadeiro", "Falso"]
                : question.options
              ).map((option, optionIndex) => (
                <label className="preview-option" key={optionIndex}>
                  <input
                    type="radio"
                    name={`preview-${question.id}`}
                    checked={answers[question.id] === String(optionIndex)}
                    onChange={() =>
                      setAnswers({
                        ...answers,
                        [question.id]: String(optionIndex),
                      })
                    }
                  />
                  <span>{option || `Alternativa ${optionIndex + 1}`}</span>
                </label>
              ))
            )}
          </fieldset>
        ))}
      </div>
      <p className="notice info">
        Esta é uma prévia. As respostas preenchidas aqui não são salvas como
        participação.
      </p>
      <button className="button primary" onClick={onClose}>
        Voltar ao editor
      </button>
    </ContentDialog>
  );
}

export default function AssessmentEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = Boolean(
    (location.state as { saved?: boolean } | null)?.saved,
  );
  const editing = Boolean(id && id !== "nova");
  const draftId = editing ? id : undefined;
  const routeKey = assessmentDraftKey(draftId);
  const [draft, setDraft] = useState<Assessment>(blankAssessment);
  const [baseline, setBaseline] = useState<Assessment | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [draftError, setDraftError] = useState("");
  const [restored, setRestored] = useState(false);
  const [conflictingDraft, setConflictingDraft] =
    useState<AssessmentDraft | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const draftPresent = useRef(false);
  const focusInvalid = useRef(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsEndpointMissing, setMaterialsEndpointMissing] = useState(false);
  const [creationMode, setCreationMode] = useState<"manual" | "prompt" | "pdf">("manual");
  const [activityPrompt, setActivityPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] =
    useState<GeneratedActivity["source"] | null>(null);
  const generationLock = useRef(false);
  const materialInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [questionFields, setQuestionFields] = useState<
    Record<string, QuestionErrorField>
  >({});
  const [preview, setPreview] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const ready = !loading && loadedKey === routeKey && !!baseline;
  const dirty =
    ready && assessmentContent(draft) !== assessmentContent(baseline!);
  const blocker = useUnsavedChanges(dirty);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadedKey(null);
    setBaseline(null);
    setDraftState("idle");
    setDraftError("");
    setRestored(false);
    setConflictingDraft(null);
    setDiscardOpen(false);
    draftPresent.current = false;
    setLoadError("");
    setNotice(null);
    setErrors({});
    setQuestionFields({});
    Promise.all([
      editing ? teacherGateway.listActivities() : Promise.resolve([]),
      teacherGateway.listMaterials(),
    ])
      .then(([all, available]) => {
        if (!alive) return;
        setMaterials(available ?? []);
        setMaterialsEndpointMissing(available === null);
        const assessment = editing
          ? all.find((item) => item.id === id)
          : blankAssessment();
        if (!assessment) {
          setLoadError("Esta avaliação não foi encontrada.");
          return;
        }
        const base = structuredClone(assessment);
        setBaseline(base);
        setDraft(base);
        setLoadedKey(routeKey);
        let draftRecovered = false;
        try {
          const record = readAssessmentDraft(draftId);
          if (record) {
            draftPresent.current = true;
            const recovered = restoreAssessmentDraft(base, record, editing);
            if (assessmentContent(recovered) !== assessmentContent(base)) {
              draftRecovered = true;
              if (editing && record.baseUpdatedAt !== base.updatedAt)
                setConflictingDraft(record);
              else {
                setDraft(recovered);
                setRestored(true);
              }
            }
          }
        } catch {
          setDraftState("error");
          setDraftError(
            "Não foi possível consultar o rascunho local. Mantenha esta página aberta até salvar a avaliação.",
          );
        }
        if (justCreated && !draftRecovered)
          setNotice({
            type: "success",
            text: isDemoMode
              ? isTestToolsEnabled
                ? "Avaliação criada e salva neste navegador. Ela já pode ser usada em uma aplicação."
                : "Atividade salva neste dispositivo. Ela pode ser usada em uma aplicação neste mesmo dispositivo."
              : "Atividade criada e salva.",
          });
      })
      .catch((error: unknown) => {
        if (alive)
          setLoadError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o editor. Tente recarregar a página.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, editing, justCreated, draftId, routeKey]);

  useEffect(() => {
    if (!ready || conflictingDraft) return;
    try {
      if (dirty) {
        saveAssessmentDraft(draft, baseline, draftId);
        draftPresent.current = true;
        setDraftState("saved");
        setDraftError("");
      } else if (draftPresent.current) {
        removeAssessmentDraft(draftId);
        draftPresent.current = false;
        setDraftState("idle");
        setRestored(false);
      }
    } catch {
      setDraftState("error");
      setDraftError(
        "Não foi possível salvar o rascunho neste navegador. Suas alterações continuam nesta página; salve a avaliação antes de sair.",
      );
    }
  }, [ready, dirty, draft, baseline, draftId, conflictingDraft]);

  useEffect(() => {
    if (!focusInvalid.current) return;
    focusInvalid.current = false;
    const invalid = document.querySelector<HTMLElement>(
      '.assessment-editor-layout [aria-invalid="true"]',
    );
    (invalid ?? document.getElementById("add-first-question"))?.focus();
  }, [errors]);

  useEffect(() => {
    if (!createdId) return;
    navigate(`/avaliacoes/${createdId}`, {
      replace: true,
      state: { saved: true },
    });
    setCreatedId(null);
  }, [createdId, navigate]);

  function discardDraft() {
    if (!baseline) return;
    try {
      removeAssessmentDraft(draftId);
      draftPresent.current = false;
      setDraft(structuredClone(baseline));
      setRestored(false);
      setConflictingDraft(null);
      setDraftError("");
      setDraftState("idle");
      setErrors({});
      setQuestionFields({});
      setNotice(null);
      setDiscardOpen(false);
    } catch {
      setDraftError(
        "Não foi possível descartar o rascunho local. Suas alterações foram mantidas; tente novamente.",
      );
      setDraftState("error");
      setDiscardOpen(false);
    }
  }
  function patch(value: Partial<Assessment>) {
    setDraft((current) => ({ ...current, ...value }));
    setNotice(null);
    setErrors((current) => {
      const next = { ...current };
      for (const field of Object.keys(value)) delete next[field];
      return next;
    });
  }
  function updateQuestion(question: Question) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((item) =>
        item.id === question.id ? question : item,
      ),
    }));
    setNotice(null);
    setErrors((current) => ({ ...current, [question.id]: "" }));
  }
  function moveQuestion(index: number, direction: -1 | 1) {
    const questions = [...draft.questions];
    [questions[index], questions[index + direction]] = [
      questions[index + direction],
      questions[index],
    ];
    patch({ questions });
  }
  async function generate(mode: "prompt" | "pdf") {
    if (generationLock.current || generating) return;
    if (mode === "prompt" && !activityPrompt.trim()) {
      setNotice({
        type: "error",
        text: "Descreva a atividade antes de solicitar a geração.",
      });
      return;
    }
    if (mode === "pdf" && !materialFile) {
      setNotice({ type: "error", text: "Selecione um arquivo PDF." });
      return;
    }
    generationLock.current = true;
    setGenerating(true);
    setNotice(null);
    try {
      const result =
        mode === "prompt"
          ? await teacherGateway.generateActivityFromPrompt({
              prompt: activityPrompt.trim(),
              subject: draft.subject,
              questionCount,
            })
          : await teacherGateway.generateActivityFromMaterial(
              materialFile!,
              { subject: draft.subject, questionCount },
            );
      setDraft({
        ...result.activity,
        id: draft.id,
        subject: result.activity.subject || draft.subject,
        createdAt: draft.createdAt,
        updatedAt: new Date().toISOString(),
        archived: false,
        materialIds: [],
      });
      setGenerationResult(result.source);
      setErrors({});
      setQuestionFields({});
      setNotice({
        type: "success",
        text:
          result.source === "demo"
            ? "Resultado de demonstração: conteúdo de exemplo, sem uso de inteligência artificial. Revise e edite as questões antes de salvar."
            : "Atividade gerada. Revise e edite as questões antes de salvar.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar a atividade. Tente novamente.",
      });
    } finally {
      generationLock.current = false;
      setGenerating(false);
    }
  }
  async function save() {
    if (saving || generating || conflictingDraft) return;
    const validation = validate(draft);
    setErrors(validation.errors);
    setQuestionFields(validation.questionFields);
    setNotice(null);
    if (Object.keys(validation.errors).length) {
      focusInvalid.current = true;
      setNotice({
        type: "error",
        text: "Confira os campos destacados antes de salvar a avaliação.",
      });
      return;
    }
    setSaving(true);
    const next: Assessment = {
      ...draft,
      title: draft.title.trim(),
      subject: draft.subject.trim(),
      description: draft.description.trim(),
      instructions: draft.instructions.trim(),
      updatedAt: new Date().toISOString(),
      questions: draft.questions.map((question) => ({
        ...question,
        prompt: question.prompt.trim(),
        options: question.options.map((option) => option.trim()),
        correctAnswer:
          question.type === "open"
            ? null
            : question.correctAnswer?.trim() || null,
      })),
    };
    try {
      const saved = await teacherGateway.saveActivity(next, !editing);
      setBaseline(saved);
      setDraft(saved);
      setRestored(false);
      try {
        removeAssessmentDraft(draftId);
        draftPresent.current = false;
        setDraftState("idle");
        setDraftError("");
      } catch {
        setDraftError(
          "A avaliação foi salva, mas não foi possível limpar o rascunho local. A versão confirmada permanece disponível.",
        );
        setDraftState("error");
      }
      if (!editing) setCreatedId(saved.id);
      else
        setNotice({
          type: "success",
          text: isDemoMode
            ? "Atividade salva neste dispositivo. As aplicações já publicadas preservam sua versão original."
            : "Atividade salva.",
        });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar. Seus campos continuam no editor; tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }
  const totalPoints = draft.questions.reduce(
    (sum, question) =>
      sum + (Number.isFinite(question.points) ? question.points : 0),
    0,
  );
  const publicPreview: PublicAssessment = {
    id: draft.id,
    title: draft.title,
    subject: draft.subject,
    description: draft.description,
    instructions: draft.instructions,
    materialIds: draft.materialIds,
    questions: draft.questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: [...question.options],
      points: question.points,
    })),
  };
  if (loading)
    return (
      <div className="card empty-state" role="status">
        Carregando o editor de avaliação...
      </div>
    );
  if (loadError)
    return (
      <div className="card empty-state">
        <FileText size={34} />
        <h1>Avaliação indisponível</h1>
        <p className="field-error" role="alert">
          {loadError}
        </p>
        <Link className="button primary" to="/avaliacoes">
          Voltar às avaliações
        </Link>
      </div>
    );
  return (
    <div className="content-page">
      <Link to="/avaliacoes" className="content-back">
        <ArrowLeft size={16} /> Avaliações
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">BANCO DE AVALIAÇÕES</span>
          <h1>{editing ? "Editar avaliação" : "Nova avaliação"}</h1>
          <p className="muted">
            Prepare as questões e os materiais para a sua turma.
          </p>
        </div>
        <div className="content-heading-actions">
          <button
            className="button secondary"
            disabled={saving || generating || !!conflictingDraft}
            onClick={() => setPreview(true)}
          >
            <Eye size={17} /> Visualizar como aluno
          </button>
          <button
            className="button primary"
            disabled={saving || generating || !!conflictingDraft}
            onClick={() => void save()}
          >
            <Save size={17} />
            {saving ? "Salvando..." : "Salvar avaliação"}
          </button>
        </div>
      </div>
      {draft.archived && (
        <div className="notice info">
          Esta avaliação está arquivada. Para usar uma nova versão, faça uma
          cópia na lista de avaliações.
        </div>
      )}
      {notice && (
        <div
          className={`notice ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}
      {!editing && (
        <section className="card creation-method-card" aria-label="Modo de criação">
          <div className="content-section-title">
            <span className="section-icon"><Sparkles size={19} /></span>
            <div>
              <h2>Como deseja criar?</h2>
              <p className="muted">Todo conteúdo gerado pode ser revisado antes de salvar.</p>
            </div>
          </div>
          <div className="content-tabs creation-method-tabs" role="group" aria-label="Modo de criação">
            <button
              type="button"
              className={creationMode === "manual" ? "active" : ""}
              aria-pressed={creationMode === "manual"}
              disabled={generating}
              onClick={() => setCreationMode("manual")}
            >Criação manual</button>
            <button
              type="button"
              className={creationMode === "prompt" ? "active" : ""}
              aria-pressed={creationMode === "prompt"}
              disabled={generating}
              onClick={() => setCreationMode("prompt")}
            >Criar com prompt</button>
            <button
              type="button"
              className={creationMode === "pdf" ? "active" : ""}
              aria-pressed={creationMode === "pdf"}
              disabled={generating}
              onClick={() => setCreationMode("pdf")}
            >Criar com PDF</button>
          </div>
          {creationMode === "prompt" && (
            <div className="creation-generation-form">
              <label className="field">
                <span>Descreva a atividade</span>
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={activityPrompt}
                  disabled={generating}
                  placeholder="Ex.: Crie uma atividade de revisão sobre ecossistemas para o 7º ano, com situações do cotidiano."
                  onChange={(event) => setActivityPrompt(event.target.value)}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  <span>Quantidade de questões</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={questionCount}
                    disabled={generating}
                    onChange={(event) =>
                      setQuestionCount(
                        Math.max(1, Math.min(10, Number(event.target.value) || 1)),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>Disciplina para a atividade <span className="required">*</span></span>
                  <input
                    value={draft.subject}
                    disabled={generating}
                    maxLength={80}
                    placeholder="Ex.: Ciências"
                    onChange={(event) => patch({ subject: event.target.value })}
                  />
                </label>
              </div>
              <button
                type="button"
                className="button primary"
                disabled={generating || saving}
                onClick={() => void generate("prompt")}
              >
                {generating ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
                {generating ? "Gerando…" : "Gerar atividade"}
              </button>
            </div>
          )}
          {creationMode === "pdf" && (
            <div className="creation-generation-form">
              <p className="muted">
                Envie um PDF de referência. O arquivo será enviado junto ao pedido de geração e não será adicionado à biblioteca.
              </p>
              <label className="field">
                <span>Material em PDF</span>
                <input
                  ref={materialInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={generating}
                  onChange={(event) => {
                    setMaterialFile(event.target.files?.[0] ?? null);
                    setNotice(null);
                  }}
                />
              </label>
              {materialFile && (
                <div className="notice info selected-material-file">
                  <span><FileText size={17} /> {materialFile.name} · {(materialFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remover arquivo PDF"
                    disabled={generating}
                    onClick={() => {
                      setMaterialFile(null);
                      if (materialInput.current) materialInput.current.value = "";
                    }}
                  ><X size={17} /></button>
                </div>
              )}
              <div className="form-grid">
                <label className="field">
                  <span>Quantidade de questões</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={questionCount}
                    disabled={generating}
                    onChange={(event) =>
                      setQuestionCount(
                        Math.max(1, Math.min(10, Number(event.target.value) || 1)),
                      )
                    }
                  />
                </label>
                <label className="field">
                  <span>Disciplina para a atividade <span className="required">*</span></span>
                  <input
                    value={draft.subject}
                    disabled={generating}
                    maxLength={80}
                    placeholder="Ex.: Ciências"
                    onChange={(event) => patch({ subject: event.target.value })}
                  />
                </label>
              </div>
              <small className="field-help">
                Selecione um arquivo PDF.
              </small>
              <button
                type="button"
                className="button primary"
                disabled={generating || saving || !materialFile}
                onClick={() => void generate("pdf")}
              >
                {generating ? <LoaderCircle size={17} className="spin" /> : <Upload size={17} />}
                {generating ? "Enviando e gerando…" : "Enviar PDF e gerar atividade"}
              </button>
            </div>
          )}
          {generationResult && (
            <div className="notice info generation-review-note">
              <strong>Revise o resultado no editor abaixo.</strong>
              <span>
                {generationResult === "demo"
                  ? isTestToolsEnabled
                    ? " Este conteúdo foi criado pelo mock de demonstração."
                    : " A atividade ainda não foi salva nem publicada."
                  : " A atividade ainda não foi salva nem publicada."}
              </span>
            </div>
          )}
        </section>
      )}
      {conflictingDraft && baseline && (
        <div className="notice info editor-draft-notice">
          <div>
            <strong>Existe um rascunho de uma versão anterior.</strong>
            <p>
              A avaliação foi atualizada depois desse rascunho. Escolha qual
              conteúdo deseja continuar editando.
            </p>
          </div>
          <div className="content-heading-actions">
            <button
              className="button secondary small"
              onClick={() => {
                setDraft(
                  restoreAssessmentDraft(baseline, conflictingDraft, editing),
                );
                setConflictingDraft(null);
                setRestored(true);
              }}
            >
              Recuperar rascunho
            </button>
            <button
              className="button ghost small"
              onClick={() => setDiscardOpen(true)}
            >
              Usar versão salva
            </button>
          </div>
        </div>
      )}
      {dirty && (
        <div className="notice info editor-draft-notice">
          <div role="status">
            <strong>
              {restored
                ? "Seu rascunho foi recuperado."
                : "Alterações ainda não confirmadas."}
            </strong>
            <p>
              {draftState === "saved"
                ? "Rascunho salvo automaticamente neste navegador. Clique em Salvar avaliação para confirmar as alterações."
                : "Mantenha esta página aberta até confirmar as alterações."}
            </p>
          </div>
          <button
            className="button ghost small"
            disabled={saving}
            onClick={() => setDiscardOpen(true)}
          >
            Descartar rascunho
          </button>
        </div>
      )}
      {draftError && (
        <div className="notice error" role="alert">
          {draftError}
        </div>
      )}
      <fieldset
        className="editor-fields"
        disabled={saving || generating || !!conflictingDraft}
        aria-label="Conteúdo da avaliação"
      >
        <div className="assessment-editor-layout">
          <div className="assessment-editor-main">
            <section className="card editor-details">
              <div className="content-section-title">
                <span className="section-icon">
                  <BookOpen size={20} />
                </span>
                <div>
                  <h2>Informações da avaliação</h2>
                  <p className="muted">Uma boa organização começa por aqui.</p>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span id="assessment-title-label">
                    Título <span className="required">*</span>
                  </span>
                  <input
                    maxLength={160}
                    placeholder="Ex.: Ecossistemas e biodiversidade"
                    value={draft.title}
                    aria-labelledby="assessment-title-label"
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? "title-error" : undefined}
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                  {errors.title && (
                    <small className="field-error" id="title-error">
                      {errors.title}
                    </small>
                  )}
                </label>
                <label className="field">
                  <span id="assessment-subject-label">
                    Disciplina <span className="required">*</span>
                  </span>
                  <input
                    maxLength={80}
                    placeholder="Ex.: Ciências"
                    value={draft.subject}
                    aria-labelledby="assessment-subject-label"
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={
                      errors.subject ? "subject-error" : undefined
                    }
                    onChange={(event) => patch({ subject: event.target.value })}
                  />
                  {errors.subject && (
                    <small className="field-error" id="subject-error">
                      {errors.subject}
                    </small>
                  )}
                </label>
              </div>
              <label className="field">
                <span>Descrição</span>
                <textarea
                  maxLength={2000}
                  rows={2}
                  placeholder="Conte brevemente o que será trabalhado."
                  value={draft.description}
                  onChange={(event) =>
                    patch({ description: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>Instruções para o aluno</span>
                <textarea
                  maxLength={6000}
                  rows={3}
                  placeholder="Oriente o aluno sobre como responder à avaliação."
                  value={draft.instructions}
                  onChange={(event) =>
                    patch({ instructions: event.target.value })
                  }
                />
              </label>
            </section>
            <div className="questions-heading">
              <div>
                <h2>
                  Questões{" "}
                  <span className="badge gray">{draft.questions.length}</span>
                </h2>
                <p className="muted">
                  Defina o enunciado, a pontuação e o gabarito.
                </p>
              </div>
              <button
                id="add-first-question"
                className="button secondary small"
                disabled={draft.questions.length >= 100}
                onClick={() =>
                  patch({ questions: [...draft.questions, blankQuestion()] })
                }
              >
                <Plus size={16} /> Adicionar questão
              </button>
            </div>
            {errors.questions && (
              <p className="field-error" role="alert">
                {errors.questions}
              </p>
            )}
            {draft.questions.length === 0 && (
              <div className="card empty-state">
                <h3>Adicione sua primeira questão</h3>
                <p className="muted">
                  Escolha entre alternativa única, verdadeiro ou falso e
                  resposta aberta.
                </p>
              </div>
            )}
            {draft.questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                total={draft.questions.length}
                error={errors[question.id]}
                errorField={questionFields[question.id]}
                onChange={updateQuestion}
                onMove={(direction) => moveQuestion(index, direction)}
                onRemove={() => setRemoveTarget(question.id)}
              />
            ))}
            <button
              className="add-question-area"
              disabled={draft.questions.length >= 100}
              onClick={() =>
                patch({ questions: [...draft.questions, blankQuestion()] })
              }
            >
              <Plus size={20} /> Adicionar uma questão
            </button>
          </div>
          <aside className="editor-sidebar">
            <section className="card editor-summary">
              <h2>Resumo da avaliação</h2>
              <dl>
                <div>
                  <dt>Questões</dt>
                  <dd>{draft.questions.length}</dd>
                </div>
                <div>
                  <dt>Pontuação total</dt>
                  <dd>{totalPoints.toLocaleString("pt-BR")}</dd>
                </div>
                <div>
                  <dt>Correção manual</dt>
                  <dd>
                    {
                      draft.questions.filter(
                        (question) => question.type === "open",
                      ).length
                    }
                  </dd>
                </div>
              </dl>
              <div className="editor-tip">
                <Check size={18} />
                <p>
                  Ao publicar uma aplicação, uma cópia desta avaliação será
                  preservada.
                </p>
              </div>
              <Link className="button secondary" to="/aplicacoes">
                Ir para aplicações
              </Link>
            </section>
            <section className="card editor-materials">
              <div className="content-section-title">
                <FileText size={19} />
                <h2>Materiais de apoio</h2>
              </div>
              <p className="muted">Selecione o que o aluno poderá consultar.</p>
              {materialsEndpointMissing ? (
                <p className="muted">
                  A associação de materiais está temporariamente indisponível.
                </p>
              ) : materials.length === 0 ? (
                <p className="muted">Você ainda não cadastrou materiais.</p>
              ) : (
                materials.map((material) => (
                  <label className="material-checkbox" key={material.id}>
                    <input
                      type="checkbox"
                      checked={draft.materialIds.includes(material.id)}
                      onChange={(event) =>
                        patch({
                          materialIds: event.target.checked
                            ? [...draft.materialIds, material.id]
                            : draft.materialIds.filter(
                                (value) => value !== material.id,
                              ),
                        })
                      }
                    />
                    <span>
                      <strong>{material.title}</strong>
                      <small>
                        {material.type === "file"
                          ? "Arquivo neste dispositivo"
                          : "Link"}{" "}
                        · {material.subject}
                      </small>
                    </span>
                  </label>
                ))
              )}
              <Link to="/materiais" className="button ghost small">
                <Plus size={15} /> Gerenciar materiais
              </Link>
            </section>
            <p className="editor-local-note muted">
              {isTestToolsEnabled
                ? "As alterações são salvas neste dispositivo."
                : "As alterações ficam salvas como rascunho neste dispositivo."}
            </p>
          </aside>
        </div>
      </fieldset>
      <UnsavedChangesDialog
        blocker={blocker}
        description={
          draftState === "saved"
            ? "As alterações ainda não foram confirmadas na avaliação. O rascunho foi salvo neste navegador e estará disponível ao voltar."
            : "As alterações ainda não foram confirmadas e o rascunho local pode estar indisponível. Continue editando para salvar a avaliação antes de sair."
        }
      />
      {discardOpen && (
        <ContentDialog
          labelledBy="discard-draft-heading"
          onClose={() => setDiscardOpen(false)}
        >
          <h2 id="discard-draft-heading">Descartar rascunho?</h2>
          <p className="muted">
            As alterações pendentes serão removidas deste navegador.{" "}
            {editing
              ? "O editor voltará à última versão salva da avaliação."
              : "O editor voltará a uma avaliação em branco."}
          </p>
          <div className="content-modal-actions">
            <button
              className="button secondary"
              autoFocus
              onClick={() => setDiscardOpen(false)}
            >
              Continuar editando
            </button>
            <button className="button danger" onClick={discardDraft}>
              Descartar rascunho
            </button>
          </div>
        </ContentDialog>
      )}
      {preview && (
        <StudentPreview
          assessment={publicPreview}
          materials={materials.filter((material) =>
            draft.materialIds.includes(material.id),
          )}
          onClose={() => setPreview(false)}
        />
      )}
      {removeTarget && (
        <ContentDialog
          labelledBy="remove-question-title"
          onClose={() => setRemoveTarget(null)}
        >
          <h2 id="remove-question-title">Remover questão?</h2>
          <p className="muted">
            A questão será removida desta avaliação. As aplicações publicadas
            serão preservadas.
          </p>
          <div className="content-modal-actions">
            <button
              autoFocus
              className="button secondary"
              onClick={() => setRemoveTarget(null)}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              onClick={() => {
                patch({
                  questions: draft.questions.filter(
                    (question) => question.id !== removeTarget,
                  ),
                });
                setRemoveTarget(null);
              }}
            >
              Remover questão
            </button>
          </div>
        </ContentDialog>
      )}
    </div>
  );
}
