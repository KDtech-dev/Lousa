import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  Copy,
  FileQuestion,
  Plus,
  Search,
} from "lucide-react";
import ContentDialog from "../components/ContentDialog";
import { teacherGateway } from "../services/teacherGateway";
import type { Assessment } from "../types";
import "../styles/content.css";

export default function AssessmentsPage() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      setAssessments(await teacherGateway.listActivities());
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as avaliações. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const subjects = [...new Set(assessments.map((item) => item.subject))].sort();
  const visible = useMemo(
    () =>
      assessments
        .filter(
          (item) =>
            item.archived === (tab === "archived") &&
            (subject === "all" || item.subject === subject) &&
            `${item.title} ${item.subject} ${item.description}`
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [assessments, query, subject, tab],
  );
  async function duplicate(id: string) {
    setBusy(id);
    setNotice(null);
    try {
      await teacherGateway.duplicateActivity(id);
      await refresh();
      setNotice({
        type: "success",
        text: "Cópia criada. Edite a avaliação para personalizá-la.",
      });
      setTab("active");
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível duplicar a avaliação.",
      });
    } finally {
      setBusy(null);
    }
  }
  async function archive() {
    if (!archiveTarget) return;
    setBusy(archiveTarget.id);
    setNotice(null);
    try {
      await teacherGateway.archiveActivity(archiveTarget.id);
      await refresh();
      setArchiveTarget(null);
      setNotice({
        type: "success",
        text: "Avaliação arquivada. As aplicações publicadas foram preservadas.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível arquivar a avaliação.",
      });
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="content-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEU BANCO DE ATIVIDADES</span>
          <h1>Suas avaliações</h1>
          <p className="muted">
            Crie uma vez. Personalize e aplique quando precisar.
          </p>
        </div>
        <Link to="/avaliacoes/nova" className="button primary">
          <Plus size={18} /> Nova avaliação
        </Link>
      </div>
      {notice && (
        <div
          className={`notice ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          {notice.text}
          {notice.type === "error" && (
            <button
              className="button ghost small"
              onClick={() => {
                setLoading(true);
                void refresh();
              }}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      <div className="content-toolbar">
        <div className="content-tabs" aria-label="Situação das avaliações">
          <button
            className={tab === "active" ? "active" : ""}
            aria-pressed={tab === "active"}
            onClick={() => setTab("active")}
          >
            Ativas{" "}
            <span>{assessments.filter((item) => !item.archived).length}</span>
          </button>
          <button
            className={tab === "archived" ? "active" : ""}
            aria-pressed={tab === "archived"}
            onClick={() => setTab("archived")}
          >
            Arquivadas{" "}
            <span>{assessments.filter((item) => item.archived).length}</span>
          </button>
        </div>
        <div className="content-filters">
          <label className="content-filter-field">
            <span>Buscar avaliação</span>
            <span className="content-search">
              <Search size={17} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar avaliação..."
                aria-label="Buscar avaliação"
              />
            </span>
          </label>
          <label className="content-filter-field">
            <span>Filtrar por disciplina</span>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              aria-label="Filtrar por disciplina"
            >
              <option value="all">Todas as disciplinas</option>
              {subjects.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {loading ? (
        <div className="card empty-state" role="status">
          Carregando suas avaliações...
        </div>
      ) : visible.length === 0 ? (
        <div className="card empty-state">
          <FileQuestion size={36} />
          <h2>
            {query || subject !== "all"
              ? "Nenhuma avaliação encontrada"
              : tab === "archived"
                ? "Nenhuma avaliação arquivada"
                : "Comece com sua primeira avaliação"}
          </h2>
          <p className="muted">
            {query || subject !== "all"
              ? "Ajuste a busca ou os filtros para ver mais resultados."
              : tab === "archived"
                ? "Suas avaliações arquivadas aparecerão aqui."
                : "Organize questões, instruções e materiais em um só lugar."}
          </p>
          {!query && tab === "active" && (
            <Link to="/avaliacoes/nova" className="button primary">
              <Plus size={17} /> Criar avaliação
            </Link>
          )}
        </div>
      ) : (
        <div className="assessment-grid">
          {visible.map((assessment, index) => (
            <article className="card assessment-card" key={assessment.id}>
              <div className={`assessment-art tone-${index % 4}`}>
                <BookOpen size={34} strokeWidth={1.5} />
                <span className="assessment-art-lines" aria-hidden="true" />
                <span className="badge">{assessment.subject}</span>
              </div>
              <div className="assessment-card-body">
                <div className="assessment-card-label">
                  <span className="eyebrow">
                    {assessment.archived ? "ARQUIVADA" : "AVALIAÇÃO"}
                  </span>
                  <span className="muted">
                    {assessment.questions.length}{" "}
                    {assessment.questions.length === 1 ? "questão" : "questões"}
                  </span>
                </div>
                <h2>
                  <Link to={`/avaliacoes/${assessment.id}`}>
                    {assessment.title}
                  </Link>
                </h2>
                <p className="assessment-description muted">
                  {assessment.description ||
                    "Adicione uma descrição para organizar esta avaliação."}
                </p>
                <div className="assessment-meta">
                  <span>
                    {assessment.questions
                      .reduce((sum, question) => sum + question.points, 0)
                      .toLocaleString("pt-BR")}{" "}
                    pontos
                  </span>
                  <span>
                    Atualizada em{" "}
                    {new Date(assessment.updatedAt).toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "short" },
                    )}
                  </span>
                </div>
              </div>
              <div className="assessment-card-footer">
                <button
                  className="button ghost small"
                  onClick={() => navigate(`/avaliacoes/${assessment.id}`)}
                >
                  Editar avaliação <ArrowUpRight size={15} />
                </button>
                <div>
                  <button
                    className="icon-button"
                    title="Duplicar avaliação"
                    aria-label={`Duplicar ${assessment.title}`}
                    disabled={busy !== null}
                    onClick={() => void duplicate(assessment.id)}
                  >
                    <Copy size={16} />
                  </button>
                  {!assessment.archived && (
                    <button
                      className="icon-button"
                      title="Arquivar avaliação"
                      aria-label={`Arquivar ${assessment.title}`}
                      disabled={busy !== null}
                      onClick={() => setArchiveTarget(assessment)}
                    >
                      <Archive size={16} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="content-footnote">
        <BookOpen size={17} />
        <p>
          As avaliações são reutilizáveis. Para disponibilizar uma aos alunos,
          crie uma <Link to="/aplicacoes">aplicação</Link>.
        </p>
      </div>
      {archiveTarget && (
        <ContentDialog
          labelledBy="archive-heading"
          onClose={() => setArchiveTarget(null)}
          dismissible={busy === null}
        >
          <span className="modal-symbol">
            <Archive size={24} />
          </span>
          <h2 id="archive-heading">Arquivar avaliação?</h2>
          <p className="muted">
            “{archiveTarget.title}” ficará na aba Arquivadas. As aplicações já
            publicadas continuam com suas questões originais.
          </p>
          {notice?.type === "error" && (
            <div className="notice error" role="alert">
              {notice.text}
            </div>
          )}
          <div className="content-modal-actions">
            <button
              autoFocus
              className="button secondary"
              disabled={busy !== null}
              onClick={() => setArchiveTarget(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={busy !== null}
              onClick={() => void archive()}
            >
              {busy ? "Arquivando..." : "Arquivar avaliação"}
            </button>
          </div>
        </ContentDialog>
      )}
    </div>
  );
}
