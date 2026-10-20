import type { NativeAppState } from "../types";

export const nativeAppStates: {
  value: NativeAppState;
  label: string;
  description: string;
}[] = [
  {
    value: "pending",
    label: "Verificação pendente",
    description: "A demonstração aguarda a verificação do aplicativo.",
  },
  {
    value: "not_installed",
    label: "Não instalado",
    description:
      "O aplicativo previsto ainda não está disponível. Selecione outro cenário para testar o fluxo.",
  },
  {
    value: "incompatible",
    label: "Incompatível",
    description:
      "O cenário simula um ambiente incompatível. Windows 11 e Linux Mint são os sistemas previstos.",
  },
  {
    value: "ready",
    label: "Pronto",
    description:
      "Integração pronta apenas na simulação. Este estado não confirma restrições reais no computador.",
  },
  {
    value: "disconnected",
    label: "Conexão interrompida",
    description:
      "As respostas são preservadas. Restabeleça o estado “Pronto” para solicitar a retomada.",
  },
];

export class NativeAppError extends Error {
  readonly code = "APP_UNAVAILABLE";
  constructor(state: NativeAppState) {
    const current = nativeAppStates.find((item) => item.value === state);
    super(
      state === "disconnected"
        ? "A conexão simulada foi interrompida. Selecione “Pronto” e solicite a retomada."
        : `O aplicativo obrigatório ainda não está pronto: ${current?.label.toLowerCase() ?? "verificação pendente"}.`,
    );
    this.name = "NativeAppError";
  }
}

export const canStart = (state: NativeAppState) => state === "ready";

/** Ponto substituível pela autorização do backend e pela integração nativa futura. */
export async function authorizeResume(
  state: NativeAppState = "pending",
  required = true,
): Promise<void> {
  if (required && !canStart(state)) throw new NativeAppError(state);
}
