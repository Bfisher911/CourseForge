import { useCallback, useRef, useState } from "react";
import type { AiResult, AiSource } from "../services/aiAssist";

export interface AiActionStatus {
  source: AiSource;
  note?: string;
}

export interface UseAiAction {
  running: boolean;
  error: string | null;
  status: AiActionStatus | null;
  /** Run an AiResult-producing action and apply its value. Safe to call repeatedly. */
  run: <T>(action: () => Promise<AiResult<T>>, apply: (value: T) => void) => Promise<void>;
  reset: () => void;
}

/**
 * Drives a builder's "Generate with AI" button: one in-flight guard, an error slot,
 * and the source of the last result ("ai" vs "deterministic") for a subtle hint.
 * Actions are expected to use `withFallback`, so `run` only surfaces an error for
 * truly unexpected throws (e.g. the apply callback itself).
 */
export const useAiAction = (): UseAiAction => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AiActionStatus | null>(null);
  const inFlight = useRef(false);

  const run = useCallback(async <T,>(action: () => Promise<AiResult<T>>, apply: (value: T) => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRunning(true);
    setError(null);
    setStatus(null);
    try {
      const result = await action();
      apply(result.value);
      setStatus({ source: result.source, note: result.note });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed.");
    } finally {
      inFlight.current = false;
      setRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setStatus(null);
  }, []);

  return { running, error, status, run, reset };
};
