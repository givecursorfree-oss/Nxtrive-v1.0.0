import { useEffect, useState } from "react";
import { fetchOllamaStatus, type OllamaStatus } from "../lib/api";

const POLL_INTERVAL_MS = 5000;

export function useOllamaStatus() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const load = async () => {
      try {
        const result = await fetchOllamaStatus();
        if (!active) return;
        setStatus(result);
        setError(null);

        if (result.installed && result.running) {
          if (timer) {
            window.clearInterval(timer);
            timer = undefined;
          }
        }
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Failed to reach backend";
        setError(message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return { status, loading, error };
}
