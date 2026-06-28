import { useEffect, useState } from "react";
import { fetchHealth } from "../lib/api";

const POLL_INTERVAL_MS = 8000;

export function useBackendHealth() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const check = async () => {
    try {
      const health = await fetchHealth();
      setOnline(health.status === "ok");
      setDataDir(health.data_dir);
      return true;
    } catch {
      setOnline(false);
      return false;
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
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
  }, []);

  const retry = () => {
    setRetrying(true);
    void check();
  };

  return { online, dataDir, retrying, retry, loading: online === null };
}
