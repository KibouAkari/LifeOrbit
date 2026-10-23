import type { ReactNode } from "react";

// Keep page titles plain. Labels above every heading create unnecessary noise.
export function Heading({ title, description, action }: { title: string; description?: string; eyebrow?: string; action?: ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
export function Card({ title, children, span = 6, action }: { title?: string; children: ReactNode; span?: 3 | 4 | 5 | 6 | 7 | 8 | 12; action?: ReactNode }) {
  return <section className={`card span-${span}`}>{title && <div className="card-head"><h2>{title}</h2>{action}</div>}{children}</section>;
}
export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }
