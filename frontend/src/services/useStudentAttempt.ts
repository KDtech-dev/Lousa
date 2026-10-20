import { useCallback, useEffect, useRef, useState } from "react";
import { demoApi } from "./demoApi";
import { messageOf } from "./format";
import type { PublicAttempt } from "../types";

type SaveState = "saved" | "local" | "saving" | "error";
export const attemptPointer = (code: string) =>
  `ao.student.attempt.${code.toUpperCase()}`;
const draftKey = (id: string) => `ao.demo.draft.${id}`;

export function useStudentAttempt() {
  const [attempt, setAttempt] = useState<PublicAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const dirty = useRef(false);
  const finalizing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const answersRef = useRef(answers);
  const attemptRef = useRef(attempt);
  answersRef.current = answers;
  attemptRef.current = attempt;

  const restore = useCallback((saved: PublicAttempt) => {
    let values = Object.fromEntries(
      Object.entries(saved.answers).map(([id, answer]) => [id, answer.value]),
    );
    let hasLocalChanges = false;
    if (saved.status === "in_progress") {
      try {
        const draft = JSON.parse(
          localStorage.getItem(draftKey(saved.id)) ?? "null",
        );
        const savedAt = Date.parse(draft?.savedAt ?? "");
        if (
          draft?.answers &&
          typeof draft.answers === "object" &&
          !Array.isArray(draft.answers) &&
          Object.values(draft.answers).every(
            (value) => typeof value === "string",
          ) &&
          savedAt >= Date.parse(saved.startedAt) &&
          savedAt <= Math.min(Date.now(), Date.parse(saved.deadlineAt))
        ) {
          const localValues = draft.answers as Record<string, string>;
          const keys = new Set([
            ...Object.keys(values),
            ...Object.keys(localValues),
          ]);
          hasLocalChanges = [...keys].some(
            (id) => (values[id] ?? "") !== (localValues[id] ?? ""),
          );
          values = localValues;
        }
      } catch {
        /* As respostas sincronizadas ainda podem ser retomadas. */
      }
    }
    revision.current += 1;
    dirty.current = hasLocalChanges;
    setAnswers(values);
    answersRef.current = values;
    setAttempt(saved);
    attemptRef.current = saved;
    finalizing.current = false;
    setNow(Date.now());
    setSaveState(hasLocalChanges ? "local" : "saved");
    setSaveError("");
  }, []);

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    revision.current += 1;
    dirty.current = false;
    finalizing.current = false;
    attemptRef.current = null;
    answersRef.current = {};
    setAttempt(null);
    setAnswers({});
    setSaveState("saved");
    setSaveError("");
    setSimulateFailure(false);
    setBusy(false);
    setNow(Date.now());
  }, []);

  function updateAnswer(questionId: string, value: string) {
    if (
      !attemptRef.current ||
      attemptRef.current.status !== "in_progress" ||
      finalizing.current ||
      Date.now() >= Date.parse(attemptRef.current.deadlineAt)
    )
      return;
    const next = { ...answersRef.current, [questionId]: value };
    revision.current += 1;
    dirty.current = true;
    answersRef.current = next;
    setAnswers(next);
    try {
      localStorage.setItem(
        draftKey(attemptRef.current.id),
        JSON.stringify({ answers: next, savedAt: new Date().toISOString() }),
      );
      setSaveState("local");
      setSaveError("");
    } catch {
      setSaveState("error");
      setSaveError(
        "Falha no salvamento local. As respostas estão apenas nesta página; tente sincronizar antes de sair.",
      );
    }
  }

  const sync = useCallback(
    async (forceFailure = simulateFailure) => {
      const current = attemptRef.current;
      if (!current || current.status !== "in_progress") return current;
      const requestedRevision = revision.current;
      setSaveState("saving");
      try {
        const saved = await demoApi.saveAnswers(
          current.id,
          answersRef.current,
          forceFailure,
        );
        if (attemptRef.current?.id !== current.id) return saved;
        if (revision.current === requestedRevision) {
          dirty.current = false;
          setSaveState("saved");
          setSaveError("");
        }
        return saved;
      } catch (error) {
        if (attemptRef.current?.id !== current.id) throw error;
        const ended = await demoApi
          .getPublicAttempt(current.id)
          .catch(() => null);
        if (attemptRef.current?.id !== current.id) throw error;
        if (ended && ended.status !== "in_progress") {
          restore(ended);
          return ended;
        }
        setSaveState("error");
        setSaveError(messageOf(error));
        throw error;
      }
    },
    [simulateFailure, restore],
  );

  useEffect(() => {
    if (
      !attempt ||
      attempt.status !== "in_progress" ||
      finalizing.current ||
      !dirty.current
    )
      return;
    timer.current = setTimeout(() => {
      sync().catch(() => {});
    }, 650);
    return () => {
      clearTimeout(timer.current);
    };
  }, [answers, attempt?.id, attempt?.status, sync]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    let stopped = false;
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (
        currentTime >= Date.parse(attempt.deadlineAt) &&
        !finalizing.current
      ) {
        finalizing.current = true;
        clearTimeout(timer.current);
        demoApi
          .getPublicAttempt(attempt.id)
          .then((saved) => {
            if (!stopped) {
              restore(saved);
              setBusy(false);
            }
          })
          .catch((error) => {
            finalizing.current = false;
            setSaveError(messageOf(error));
            setSaveState("error");
          });
      }
    }, 1000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [attempt?.id, attempt?.status, attempt?.deadlineAt, restore]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    let stopped = false;
    const check = () =>
      demoApi
        .getPublicAttempt(attempt.id)
        .then((saved) => {
          if (
            !stopped &&
            attemptRef.current?.id === attempt.id &&
            saved.status !== "in_progress"
          )
            restore(saved);
        })
        .catch(() => {});
    const interval = setInterval(check, 5000);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [attempt?.id, attempt?.status, restore]);

  async function finish(kind: "submitted" | "abandoned") {
    const current = attemptRef.current;
    if (!current || current.status !== "in_progress" || finalizing.current)
      return;
    setBusy(true);
    finalizing.current = true;
    clearTimeout(timer.current);
    try {
      const synchronized = await sync();
      if (attemptRef.current?.id !== current.id) return;
      if (synchronized?.status !== "in_progress") {
        if (synchronized) restore(synchronized);
        return;
      }
      const final = await demoApi.finishAttempt(current.id, kind);
      if (attemptRef.current?.id === current.id) restore(final);
    } finally {
      finalizing.current = false;
      setBusy(false);
    }
  }

  return {
    attempt,
    answers,
    saveState,
    saveError,
    simulateFailure,
    setSimulateFailure,
    busy,
    restore,
    reset,
    updateAnswer,
    sync,
    finish,
    remainingSeconds: attempt
      ? Math.max(0, Math.ceil((Date.parse(attempt.deadlineAt) - now) / 1000))
      : 0,
  };
}
