export interface VisibilityAnimationOptions {
  pauseOffscreen?: boolean;
}

/** Runs an animation only while its element and browser tab are visible. */
export function animateWhileVisible(
  element: HTMLElement,
  draw: (seconds: number) => void,
  onError?: () => void,
  { pauseOffscreen = true }: VisibilityAnimationOptions = {},
): () => void {
  let frame = 0;
  let inView = true;
  let elapsed = 0;
  let previous = 0;
  let disposed = false;

  const tick = (now: number) => {
    frame = 0;
    if (disposed || document.hidden || (pauseOffscreen && !inView)) return;

    if (previous > 0) elapsed += Math.min((now - previous) / 1_000, 0.1);
    previous = now;

    try {
      draw(elapsed);
    } catch {
      disposed = true;
      onError?.();
      return;
    }

    frame = requestAnimationFrame(tick);
  };

  const sync = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (!disposed && !document.hidden && (!pauseOffscreen || inView)) {
      frame = requestAnimationFrame(tick);
    }
  };

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? false;
    sync();
  });

  observer.observe(element);
  document.addEventListener('visibilitychange', sync);
  sync();

  return () => {
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
  };
}
