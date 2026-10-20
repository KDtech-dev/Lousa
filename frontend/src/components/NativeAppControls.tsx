import { Monitor, RotateCcw } from "lucide-react";
import { nativeAppStates } from "../services/nativeApp";
import { isTestToolsEnabled } from "../services/teacherGateway";
import type { NativeAppState } from "../types";

export default function NativeAppControls({
  value,
  onChange,
  suspended,
  onResume,
  busy,
}: {
  value: NativeAppState;
  onChange: (value: NativeAppState) => void;
  suspended?: boolean;
  onResume?: () => void;
  busy?: boolean;
}) {
  if (!isTestToolsEnabled) return null;
  const current = nativeAppStates.find((state) => state.value === value)!;
  return (
    <section className="native-simulation">
      <div className="native-simulation-heading">
        <Monitor size={20} />
        <div>
          <h3>Integração com o aplicativo</h3>
          <span className="badge amber">SIMULAÇÃO</span>
        </div>
      </div>
      <p>
        Windows 11 e Linux Mint são os sistemas previstos. O aplicativo nativo
        será desenvolvido em outra etapa; a compatibilidade ainda não foi
        validada.
      </p>
      <label className="field">
        Cenário demonstrativo
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as NativeAppState)}
        >
          {nativeAppStates.map((state) => (
            <option value={state.value} key={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </label>
      <div className={`native-state ${value === "ready" ? "ready" : ""}`}>
        <span className="status-dot" />
        <strong>{current.label}</strong>
        <p>{current.description}</p>
      </div>
      {suspended && value === "ready" && (
        <button className="button primary" onClick={onResume} disabled={busy}>
          <RotateCcw size={16} />
          {busy ? "Autorizando retomada…" : "Solicitar retomada simulada"}
        </button>
      )}
      <small>
        Estes controles não restringem o computador. Não há bloqueio real,
        captura global de teclado ou validação de segurança.
      </small>
    </section>
  );
}
