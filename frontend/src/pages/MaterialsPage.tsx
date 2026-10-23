import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  FolderOpen,
  HardDrive,
  Link2,
  Pencil,
  Plus,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import ContentDialog from "../components/ContentDialog";
import { demoApi, newId } from "../services/demoApi";
import type { Assessment, Material } from "../types";
import "../styles/content.css";

function validLink(value: string) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function fileSize(bytes?: number) {
  if (bytes == null) return "Arquivo local";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
type FileView = {
  material: Material;
  url: string;
  mime: string;
  text?: string;
};

function MaterialForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Material | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [subject, setSubject] = useState(initial?.subject || "");
  const [type, setType] = useState<"file" | "link">(initial?.type || "file");
  const [url, setUrl] = useState(initial?.url || "");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const fieldRefs = useRef<
    Partial<Record<"title" | "subject" | "url" | "file", HTMLInputElement>>
  >({});
  useEffect(() => {
    const firstInvalid = (["title", "subject", "url", "file"] as const).find(
      (field) => errors[field],
    );
    if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
  }, [errors]);
  async function submit() {
    if (saving) return;
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Informe o título do material.";
    if (!subject.trim()) nextErrors.subject = "Informe a disciplina.";
    if (type === "link" && !validLink(url))
      nextErrors.url =
        "Informe um endereço completo iniciado por https:// ou http://.";
    if (type === "file" && !file && initial?.type !== "file")
      nextErrors.file = "Selecione um arquivo para cadastrar.";
    if (file && file.size === 0)
      nextErrors.file = "Este arquivo está vazio. Selecione outro arquivo.";
    if (file && file.size > 25 * 1024 * 1024)
      nextErrors.file =
        "Selecione um arquivo de até 25 MB.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    const material: Material = {
      id: initial?.id || newId("material"),
      title: title.trim(),
      subject: subject.trim(),
      type,
      createdAt: initial?.createdAt || new Date().toISOString(),
      ...(type === "link"
        ? { url: validLink(url)! }
        : {
            fileName: file?.name || initial?.fileName,
            mimeType:
              file?.type || initial?.mimeType || "application/octet-stream",
            size: file?.size ?? initial?.size,
          }),
    };
    try {
      await demoApi.saveMaterial(
        material,
        type === "file" && file ? file : undefined,
      );
      await onSaved();
      onClose();
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar o material. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <ContentDialog
      labelledBy="material-form-heading"
      className="material-form-modal"
      onClose={onClose}
      dismissible={!saving}
    >
      <div className="material-modal-header">
        <span className="modal-symbol">
          <FolderOpen size={24} />
        </span>
        <button
          className="icon-button"
          aria-label="Fechar cadastro de material"
          disabled={saving}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <h2 id="material-form-heading">
        {initial ? "Editar material" : "Novo material"}
      </h2>
      <p className="muted">
        Compartilhe referências e arquivos com seus alunos.
      </p>
      <div className="material-type-picker" aria-label="Tipo de material">
        <button
          className={type === "file" ? "selected" : ""}
          disabled={saving}
          aria-pressed={type === "file"}
          onClick={() => {
            setType("file");
            setErrors({});
          }}
        >
          <FileText size={19} /> Arquivo{" "}
          {type === "file" && <Check size={16} />}
        </button>
        <button
          className={type === "link" ? "selected" : ""}
          disabled={saving}
          aria-pressed={type === "link"}
          onClick={() => {
            setType("link");
            setErrors({});
          }}
        >
          <Link2 size={19} /> Link {type === "link" && <Check size={16} />}
        </button>
      </div>
      <label className="field">
        <span id="material-title-label">
          Título <span className="required">*</span>
        </span>
        <input
          id="material-title"
          disabled={saving}
          ref={(element) => {
            fieldRefs.current.title = element || undefined;
          }}
          autoFocus
          maxLength={160}
          value={title}
          placeholder="Ex.: Guia de estudo de ecossistemas"
          aria-labelledby="material-title-label"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "material-title-error" : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        {errors.title && (
          <small id="material-title-error" className="field-error">
            {errors.title}
          </small>
        )}
      </label>
      <label className="field">
        <span id="material-subject-label">
          Disciplina <span className="required">*</span>
        </span>
        <input
          id="material-subject"
          disabled={saving}
          ref={(element) => {
            fieldRefs.current.subject = element || undefined;
          }}
          maxLength={80}
          value={subject}
          placeholder="Ex.: Ciências"
          aria-labelledby="material-subject-label"
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={
            errors.subject ? "material-subject-error" : undefined
          }
          onChange={(event) => setSubject(event.target.value)}
        />
        {errors.subject && (
          <small id="material-subject-error" className="field-error">
            {errors.subject}
          </small>
        )}
      </label>
      {type === "link" ? (
        <label className="field">
          <span id="material-url-label">
            Endereço do link <span className="required">*</span>
          </span>
          <input
            id="material-url"
            disabled={saving}
            ref={(element) => {
              fieldRefs.current.url = element || undefined;
            }}
            type="url"
            maxLength={2000}
            value={url}
            placeholder="https://exemplo.com/material"
            aria-labelledby="material-url-label"
            aria-invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? "material-url-error" : undefined}
            onChange={(event) => setUrl(event.target.value)}
          />
          {errors.url && (
            <small id="material-url-error" className="field-error">
              {errors.url}
            </small>
          )}
        </label>
      ) : (
        <div className="field">
          <span>
            Arquivo <span className="required">*</span>
          </span>
          <label className="file-drop-zone">
            <UploadCloud size={29} />
            <strong>
              {file?.name || initial?.fileName || "Escolha um arquivo"}
            </strong>
            <span>
              {file
                ? fileSize(file.size)
                : "Clique para selecionar · até 25 MB"}
            </span>
            <input
              id="material-file"
              disabled={saving}
              ref={(element) => {
                fieldRefs.current.file = element || undefined;
              }}
              type="file"
              aria-label="Selecionar arquivo do material"
              aria-invalid={Boolean(errors.file)}
              aria-describedby={
                errors.file
                  ? "material-file-error material-file-help"
                  : "material-file-help"
              }
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setErrors({});
              }}
            />
          </label>
          {errors.file && (
            <small id="material-file-error" className="field-error">
              {errors.file}
            </small>
          )}
          <small id="material-file-help" className="muted">
            {initial?.type === "file" && !file
              ? "O arquivo atual será mantido se você não escolher outro."
              : "O arquivo ficará disponível somente neste dispositivo."}
          </small>
        </div>
      )}
      <div className="notice info">
        <HardDrive size={17} />
        <span>
          Os arquivos ficam salvos neste dispositivo e não ficam disponíveis em
          outros aparelhos.
        </span>
      </div>
      {errors.submit && (
        <div className="notice error" role="alert">
          {errors.submit}
        </div>
      )}
      <div className="content-modal-actions">
        <button
          className="button secondary"
          disabled={saving}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button
          className="button primary"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? "Salvando..." : "Salvar material"}
        </button>
      </div>
    </ContentDialog>
  );
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("all");
  const [tab, setTab] = useState<"all" | "file" | "link">("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<Material | null | undefined>(
    undefined,
  );
  const [view, setView] = useState<FileView | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const [nextMaterials, nextAssessments] = await Promise.all([
        demoApi.listMaterials(),
        demoApi.listAssessments(),
      ]);
      setMaterials(nextMaterials);
      setAssessments(nextAssessments);
    } catch {
      setNotice({
        type: "error",
        text: "Não foi possível carregar a biblioteca. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const url = view?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [view]);
  const subjects = [
    ...new Set(materials.map((material) => material.subject)),
  ].sort();
  const visible = useMemo(
    () =>
      materials
        .filter(
          (material) =>
            (tab === "all" || material.type === tab) &&
            (subject === "all" || material.subject === subject) &&
            `${material.title} ${material.subject} ${material.fileName || ""}`
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [materials, query, tab, subject],
  );
  async function openFile(material: Material) {
    setOpening(material.id);
    setNotice(null);
    try {
      const blob = await demoApi.getMaterialBlob(material.id);
      if (!blob)
        throw new Error(
          "Este arquivo não está disponível neste navegador. Edite o material e selecione o arquivo novamente.",
        );
      const mime = blob.type || material.mimeType || "application/octet-stream";
      const text =
        mime.startsWith("text/") && mime !== "text/html"
          ? (await blob.text()).slice(0, 100000)
          : undefined;
      setView({ material, mime, text, url: URL.createObjectURL(blob) });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível abrir o arquivo.",
      });
    } finally {
      setOpening(null);
    }
  }
  return (
    <div className="content-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SUA BIBLIOTECA</span>
          <h1>Materiais de apoio</h1>
          <p className="muted">
            Boas referências deixam a aprendizagem ainda melhor.
          </p>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          <Plus size={18} /> Novo material
        </button>
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
      <div className="material-library-banner">
        <span className="library-banner-icon">
          <FolderOpen size={31} strokeWidth={1.5} />
        </span>
        <div>
          <h2>Todo o apoio que a sua turma precisa</h2>
          <p>Reúna arquivos e links e associe-os às suas avaliações.</p>
        </div>
        <span className="library-total">
          <strong>{materials.length}</strong>{" "}
          {materials.length === 1 ? "material" : "materiais"}
        </span>
      </div>
      <section className="card materials-table-card">
        <div className="content-toolbar materials-toolbar">
          <div className="content-tabs" aria-label="Tipo dos materiais">
            {(
              [
                ["all", "Todos"],
                ["file", "Arquivos"],
                ["link", "Links"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={tab === value ? "active" : ""}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
              >
                {label}
                <span>
                  {
                    materials.filter(
                      (material) => value === "all" || material.type === value,
                    ).length
                  }
                </span>
              </button>
            ))}
          </div>
          <div className="content-filters">
            <label className="content-filter-field">
              <span>Buscar material</span>
              <span className="content-search">
                <Search size={17} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar material..."
                  aria-label="Buscar material"
                />
              </span>
            </label>
            <label className="content-filter-field">
              <span>Filtrar materiais por disciplina</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                aria-label="Filtrar materiais por disciplina"
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
          <div className="empty-state" role="status">
            Carregando os materiais...
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={35} />
            <h2>
              {query || subject !== "all"
                ? "Nenhum material encontrado"
                : "Sua biblioteca começa aqui"}
            </h2>
            <p className="muted">
              {query || subject !== "all"
                ? "Ajuste os filtros ou tente outro termo de busca."
                : "Cadastre um arquivo ou link para compartilhar com sua turma."}
            </p>
            {!query && (
              <button
                className="button primary"
                onClick={() => setEditing(null)}
              >
                <Plus size={17} /> Adicionar material
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table materials-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Disciplina</th>
                  <th>Associado a</th>
                  <th>Adicionado em</th>
                  <th scope="col" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {visible.map((material) => {
                  const associated = assessments.filter((assessment) =>
                    assessment.materialIds.includes(material.id),
                  );
                  const safeUrl =
                    material.type === "link"
                      ? validLink(material.url || "")
                      : null;
                  return (
                    <tr key={material.id}>
                      <td>
                        <div className="material-name">
                          <span
                            className={`material-type-icon ${material.type === "link" ? "is-link" : ""}`}
                          >
                            {material.type === "link" ? (
                              <Link2 size={21} />
                            ) : (
                              <FileText size={21} />
                            )}
                          </span>
                          <div>
                            <strong>{material.title}</strong>
                            <small>
                              {material.type === "file"
                                ? `${material.fileName || "Arquivo"} · ${fileSize(material.size)}`
                                : safeUrl
                                  ? new URL(safeUrl).hostname
                                  : "Link inválido"}
                            </small>
                            <span className="material-storage">
                              {material.type === "file"
                                ? "Salvo neste navegador"
                                : "Referência externa"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge gray">{material.subject}</span>
                      </td>
                      <td>
                        {associated.length ? (
                          <Link
                            to={`/avaliacoes/${associated[0].id}`}
                            className="material-association"
                          >
                            {associated.length}{" "}
                            {associated.length === 1
                              ? "avaliação"
                              : "avaliações"}{" "}
                            <ArrowUpRight size={13} />
                          </Link>
                        ) : (
                          <Link
                            className="material-unassociated"
                            to="/avaliacoes"
                          >
                            Associar à avaliação
                          </Link>
                        )}
                      </td>
                      <td className="muted">
                        {new Date(material.createdAt).toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short", year: "numeric" },
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          {material.type === "link" && safeUrl ? (
                            <a
                              href={safeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="button secondary small"
                            >
                              Abrir <ArrowUpRight size={14} />
                            </a>
                          ) : material.type === "file" ? (
                            <button
                              className="button secondary small"
                              disabled={opening !== null}
                              onClick={() => void openFile(material)}
                            >
                              {opening === material.id
                                ? "Abrindo..."
                                : "Visualizar"}
                            </button>
                          ) : (
                            <span className="field-error">Link inválido</span>
                          )}
                          <button
                            className="icon-button"
                            aria-label={`Editar ${material.title}`}
                            title="Editar material"
                            onClick={() => setEditing(material)}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="materials-table-footer">
          <span>
            {visible.length} {visible.length === 1 ? "material" : "materiais"}{" "}
            na biblioteca
          </span>
          <span>
            <HardDrive size={14} /> Arquivos neste dispositivo
          </span>
        </div>
      </section>
      <div className="content-footnote">
        <BookOpen size={17} />
        <p>
          Associe seus materiais no{" "}
          <Link to="/avaliacoes">editor de avaliações</Link>. Eles serão
          apresentados como apoio aos alunos.
        </p>
      </div>
      {editing !== undefined && (
        <MaterialForm
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            await refresh();
            setNotice({
              type: "success",
              text: "Material salvo. Você já pode associá-lo a uma avaliação.",
            });
          }}
        />
      )}
      {view && (
        <ContentDialog
          labelledBy="file-preview-title"
          className="file-preview-modal"
          onClose={() => setView(null)}
        >
          <div className="material-modal-header">
            <div>
              <h2 id="file-preview-title">{view.material.title}</h2>
              <p className="muted">
                {view.material.fileName} · Salvo neste navegador
              </p>
            </div>
            <button
              autoFocus
              className="icon-button"
              aria-label="Fechar material"
              onClick={() => setView(null)}
            >
              <X size={21} />
            </button>
          </div>
          {/^image\/(png|jpeg|gif|webp|bmp|avif)$/.test(view.mime) ? (
            <img
              className="file-preview-image"
              src={view.url}
              alt={view.material.title}
            />
          ) : view.mime === "application/pdf" ? (
            <iframe
              className="file-preview-frame"
              src={view.url}
              title={view.material.title}
              sandbox=""
            />
          ) : view.text !== undefined ? (
            <pre className="file-preview-text">{view.text}</pre>
          ) : (
            <div className="empty-state">
              <FileText size={38} />
              <h3>Arquivo disponível para download</h3>
              <p className="muted">
                Este formato pode ser aberto no aplicativo correspondente.
              </p>
            </div>
          )}
          <div className="content-modal-actions">
            <button className="button secondary" onClick={() => setView(null)}>
              Fechar
            </button>
            <a
              className="button primary"
              href={view.url}
              download={view.material.fileName || view.material.title}
            >
              <ArrowDownToLine size={17} /> Baixar arquivo local
            </a>
          </div>
        </ContentDialog>
      )}
    </div>
  );
}
