import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  labelledBy: string;
  className?: string;
  onClose: () => void;
  dismissible?: boolean;
  children: ReactNode;
}
export default function ContentDialog({
  labelledBy,
  className = "",
  onClose,
  dismissible = true,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`content-modal content-native-dialog ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
