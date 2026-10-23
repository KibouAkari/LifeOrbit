import { ArrowLeft } from "lucide-react";

// A missing page should always provide a clear way home.
export default function NotFound() {
  return <main className="not-found"><a href="#/dashboard" className="brand"><img src="/assets/icon.svg" alt="" />LifeOrbit</a><div className="not-found-inner"><span className="error-number">404</span><h1>This page isn’t in your orbit.</h1><p>It might have moved. Everything else is right where you left it.</p><a className="button primary" href="#/dashboard"><ArrowLeft size={17}/> Back to dashboard</a></div></main>;
}
