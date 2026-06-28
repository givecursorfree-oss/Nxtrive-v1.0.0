type FlushFn = (text: string) => void;

export function createStreamTokenBuffer(flush: FlushFn, intervalMs = 32) {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (!buffer) return;
      const chunk = buffer;
      buffer = "";
      flush(chunk);
      if (buffer) schedule();
    }, intervalMs);
  };

  return {
    push(token: string) {
      if (!token) return;
      buffer += token;
      schedule();
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (!buffer) return;
      const chunk = buffer;
      buffer = "";
      flush(chunk);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      buffer = "";
    },
  };
}
