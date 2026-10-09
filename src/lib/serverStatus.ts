/* ──────────────────────────────────────────
   TicketIQ — Cold start / Server waking detector
   ────────────────────────────────────────── */

type Listener = (waking: boolean) => void;
const listeners = new Set<Listener>();

let firstCallDone = false;
let isWaking = false;

export function subscribeServerWaking(cb: Listener): () => void {
  listeners.add(cb);
  cb(isWaking);
  return () => {
    listeners.delete(cb);
  };
}

function setWaking(val: boolean) {
  if (isWaking !== val) {
    isWaking = val;
    listeners.forEach(cb => cb(isWaking));
  }
}

export function startFirstCallTracking(baseUrl: string): () => void {
  if (firstCallDone) return () => {};
  firstCallDone = true;

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  // If call takes longer than 3 seconds, show banner and poll /api/health
  const timer = setTimeout(() => {
    setWaking(true);

    const checkHealth = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/health`);
        if (res.ok) {
          if (pollInterval) clearInterval(pollInterval);
          setWaking(false);
        }
      } catch {
        // still starting up
      }
    };

    // Immediate check + interval
    checkHealth();
    pollInterval = setInterval(checkHealth, 2000);
  }, 3000);

  return () => {
    clearTimeout(timer);
    // If it didn't hit 3s, isWaking was never true.
    // If it did hit 3s and returned, check health once to clear
    if (isWaking) {
      fetch(`${baseUrl}/api/health`)
        .then(res => {
          if (res.ok) {
            if (pollInterval) clearInterval(pollInterval);
            setWaking(false);
          }
        })
        .catch(() => {});
    }
  };
}
