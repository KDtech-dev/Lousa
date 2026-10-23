import type { Blocker } from "react-router-dom";
import ContentDialog from "./ContentDialog";
import {
  cancelPendingLogout,
  consumePendingLogout,
  isDemoMode,
  teacherGateway,
} from "../services/teacherGateway";

export default function UnsavedChangesDialog({
  blocker,
  description = "Há alterações que ainda não foram confirmadas. Você pode continuar editando para salvá-las antes de sair.",
}: {
  blocker: Blocker;
  description?: string;
}) {
  if (blocker.state !== "blocked") return null;
  function leave() {
    if (isDemoMode && consumePendingLogout())
      void teacherGateway.logout().catch(() => {});
    blocker.proceed?.();
  }
  return (
    <ContentDialog
      labelledBy="unsaved-changes-heading"
      onClose={() => {
        cancelPendingLogout();
        blocker.reset();
      }}
    >
      <h2 id="unsaved-changes-heading">Sair com alterações pendentes?</h2>
      <p className="muted">{description}</p>
      <div className="content-modal-actions">
        <button
          className="button primary"
          autoFocus
          onClick={() => {
            cancelPendingLogout();
            blocker.reset();
          }}
        >
          Continuar editando
        </button>
        <button className="button secondary" onClick={leave}>
          Sair da página
        </button>
      </div>
    </ContentDialog>
  );
}
