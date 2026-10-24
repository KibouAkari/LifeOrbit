import { useEffect } from "react";

// Motion belongs to the entrance only; the app stays quiet once it is ready.
export function WelcomeIntro({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(onComplete, reduced ? 120 : 2200);
    return () => window.clearTimeout(id);
  }, [onComplete]);
  return <main className="welcome-intro" aria-label="Entering LifeOrbit"><div className="intro-lockup"><img src="/assets/icon.svg" alt="" /><span>LifeOrbit</span></div></main>;
}
