import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  BookOpen,
  Building2,
  LoaderCircle,
  CircleHelp,
  Pencil,
} from "lucide-react";
import { getTeacher, updateTeacher } from "../services/demoApi";
import { isDemoMode, isTestToolsEnabled } from "../services/teacherGateway";
import type { Teacher } from "../types";
import { errorMessage } from "./managementUtils";
import { useUnsavedChanges } from "../services/useUnsavedChanges";
import UnsavedChangesDialog from "../components/UnsavedChangesDialog";
import {
  focusProfileError,
  profileFields,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "./profileForm";
import "../styles/management.css";

export default function AccountPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileInput>({
    name: "",
    email: "",
    subject: "",
    institution: "",
  });
  const [fieldErrors, setFieldErrors] = useState<ProfileErrors>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const dirty =
    editing &&
    !!teacher &&
    profileFields.some((field) => draft[field.name] !== teacher[field.name]);
  const blocker = useUnsavedChanges(dirty);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setTeacher(await getTeacher());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (editing) document.getElementById("profile-name")?.focus();
  }, [editing]);

  function editProfile() {
    if (!teacher) return;
    setDraft({
      name: teacher.name,
      email: teacher.email,
      subject: teacher.subject,
      institution: teacher.institution,
    });
    setFieldErrors({});
    setSaveError("");
    setSuccess("");
    setEditing(true);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const next = validateProfile(draft);
    setFieldErrors(next);
    setSaveError("");
    if (Object.keys(next).length) {
      focusProfileError(event.currentTarget, next);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateTeacher(draft);
      setTeacher(updated);
      window.dispatchEvent(
        new CustomEvent("lousa:teacher-updated", { detail: updated }),
      );
      setEditing(false);
      setSuccess(
        isTestToolsEnabled
          ? "Perfil demonstrativo salvo neste navegador."
          : isDemoMode
            ? "Perfil atualizado neste dispositivo."
            : "Perfil atualizado.",
      );
    } catch (cause) {
      setSaveError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mg-page mg-account-page">
      <UnsavedChangesDialog
        blocker={blocker}
        description="As alterações do perfil ainda não foram salvas. Volte à edição para salvar ou saia e mantenha o perfil anterior."
      />
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEU ESPAÇO DE ENSINO</p>
          <h1>Conta</h1>
          <p className="muted">
            Atualize suas informações de perfil.
          </p>
        </div>
      </div>
      {loading ? (
        <div className="card empty-state" role="status">
          <LoaderCircle size={26} className="mg-spin" />
          <p>Carregando sua conta…</p>
        </div>
      ) : error ? (
        <div className="notice error" role="alert">
          {error}
          <button
            className="button secondary small"
            onClick={() => void load()}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        teacher && (
          <div className="mg-account-grid">
            <section className="card mg-profile-card">
              <div className="mg-card-heading">
                <h2>Perfil do professor</h2>
              </div>
              {success && (
                <p className="notice success" role="status">
                  {success}
                </p>
              )}
              {editing ? (
                <form
                  className="mg-profile-edit"
                  onSubmit={saveProfile}
                  noValidate
                >
                  <p id="profile-demo-help" className="muted">
                    {isTestToolsEnabled
                      ? "Personalize o perfil local. As alterações ficam neste dispositivo."
                      : "As alterações ficam disponíveis neste dispositivo."}
                  </p>
                  {profileFields.map((field) => (
                    <label
                      className="field"
                      key={field.name}
                      htmlFor={`profile-${field.name}`}
                    >
                      <span id={`profile-${field.name}-label`}>
                        {field.label}
                      </span>
                      <input
                        id={`profile-${field.name}`}
                        name={field.name}
                        type={field.name === "email" ? "email" : "text"}
                        required
                        maxLength={field.maxLength}
                        value={draft[field.name]}
                        disabled={saving}
                        autoComplete="off"
                        aria-labelledby={`profile-${field.name}-label`}
                        aria-invalid={!!fieldErrors[field.name]}
                        aria-describedby={
                          fieldErrors[field.name]
                            ? `profile-${field.name}-error`
                            : "profile-demo-help"
                        }
                        onChange={(event) => {
                          setDraft((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }));
                          setFieldErrors((current) => ({
                            ...current,
                            [field.name]: undefined,
                          }));
                        }}
                      />
                      {fieldErrors[field.name] && (
                        <small
                          id={`profile-${field.name}-error`}
                          className="field-error"
                        >
                          {fieldErrors[field.name]}
                        </small>
                      )}
                    </label>
                  ))}
                  {saveError && (
                    <p className="notice error" role="alert">
                      {saveError}
                    </p>
                  )}
                  <div className="mg-profile-actions">
                    <button className="button primary" disabled={saving}>
                      {saving ? "Salvando…" : "Salvar perfil"}
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={saving}
                      onClick={() => {
                        setEditing(false);
                        setSaveError("");
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mg-profile-identity">
                    <span className="mg-avatar-large">
                      {teacher.name
                        .split(" ")
                        .filter(Boolean)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <h3>{teacher.name}</h3>
                    <p className="muted">
                      {teacher.subject || "Perfil do professor"}
                    </p>
                  </div>
                  <dl className="mg-profile-fields">
                    <div>
                      <dt>
                        <UserRound size={17} />
                        Nome completo
                      </dt>
                      <dd>{teacher.name}</dd>
                    </div>
                    <div>
                      <dt>
                        <Mail size={17} />
                        E-mail
                      </dt>
                      <dd>{teacher.email || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>
                        <BookOpen size={17} />
                        Disciplina
                      </dt>
                      <dd>{teacher.subject || "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>
                        <Building2 size={17} />
                        Instituição
                      </dt>
                      <dd>{teacher.institution || "Não informado"}</dd>
                    </div>
                  </dl>
                  <button
                    className="button secondary mg-profile-edit-button"
                    onClick={editProfile}
                  >
                    <Pencil size={16} /> Editar perfil
                  </button>
                </>
              )}
            </section>
            <div className="mg-account-right">
              <section className="card mg-subscription-card">
                <div className="mg-card-heading">
                  <h2>Plano e assinatura</h2>
                </div>
                <div className="mg-subscription-header">
                  <span className="mg-subscription-icon">
                    <CircleHelp size={26} />
                  </span>
                  <div>
                    <h3>Informações indisponíveis</h3>
                    <p className="muted">
                      Não há informações de plano vinculadas a esta conta.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )
      )}
    </div>
  );
}
