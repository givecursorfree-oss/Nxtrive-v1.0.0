import { useEffect, useState } from "react";
import { fetchHealth } from "../lib/api";

const POLL_INTERVAL_MS = 12000;

export function useBackendHealth(enabled = true) {
  const [online, setOnline] = useState<boolean | null>(enabled ? null : false);
  const [retrying, setRetrying] = useState(false);

  const check = async () => {
    if (!enabled) {
      setOnline(false);
      return false;
    }

    try {
      const health = await fetchHealth();
      setOnline(health.status === "ok");
      return true;
    } catch {
      setOnline(false);
      return false;
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setOnline(false);
      return;
    }

    let active = true;
    let timer: number | undefined;

    const load = async () => {
      if (!active) return;
      await check();
    };

    void load();
    timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [enabled]);

  const retry = () => {
    if (!enabled) return;
    setRetrying(true);
    void check();
  };

  return { online, retrying, retry, loading: enabled && online === null };
}
