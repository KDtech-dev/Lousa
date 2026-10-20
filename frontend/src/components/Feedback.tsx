import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";

export function Loading({
  label = "Carregando informações…",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle size={22} className="spin" />
      <span>{label}</span>
    </div>
  );
}
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={19} />
      <div>
        {message}
        {retry && (
          <button className="button ghost small" onClick={retry}>
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
export function SuccessNotice({ message }: { message: string }) {
  return (
    <div className="notice success" role="status">
      <CheckCircle2 size={18} />
      {message}
    </div>
  );
}
