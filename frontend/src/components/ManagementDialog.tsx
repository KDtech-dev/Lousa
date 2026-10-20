import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export default function ManagementDialog({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useRef(`dialog-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`mg-dialog${wide ? " mg-dialog-wide" : ""}`}
      aria-labelledby={headingId.current}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="mg-dialog-content">
        <header className="mg-dialog-heading">
          <div>
            <h2 id={headingId.current}>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar janela"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
