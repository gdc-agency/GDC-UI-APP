/**
 * Smoothly animate a 0–1 progress value while async work runs.
 * @param {(ratio: number) => void} onProgress
 * @param {{ from?: number; to?: number; maxMs?: number }} opts
 * @returns {{ complete: (ratio?: number) => void; cancel: () => void }}
 */
export function startTransferProgressAnimator(onProgress, opts = {}) {
  const from = opts.from ?? 0;
  const to = opts.to ?? 0.92;
  const maxMs = opts.maxMs ?? 12000;
  const start = Date.now();
  let frame = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    const elapsed = Date.now() - start;
    const t = Math.min(1, elapsed / maxMs);
    const eased = 1 - (1 - t) * (1 - t);
    onProgress(from + (to - from) * eased);
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);

  return {
    complete(ratio = 1) {
      stopped = true;
      cancelAnimationFrame(frame);
      onProgress(Math.min(1, Math.max(0, ratio)));
    },
    cancel() {
      stopped = true;
      cancelAnimationFrame(frame);
    },
  };
}

/**
 * @template T
 * @param {() => Promise<T>} work
 * @param {(ratio: number) => void} onProgress
 * @param {{ from?: number; to?: number; maxMs?: number }} opts
 */
export async function runWithTransferProgress(work, onProgress, opts = {}) {
  const from = opts.from ?? 0;
  const to = opts.to ?? 1;
  const anim = startTransferProgressAnimator(
    (r) => onProgress(Math.min(to, Math.max(from, r))),
    { from, to: to * 0.94, maxMs: opts.maxMs ?? 10000 },
  );
  try {
    const result = await work();
    anim.complete(to);
    return result;
  } catch (e) {
    anim.cancel();
    throw e;
  }
}
