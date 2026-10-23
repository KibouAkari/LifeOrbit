import type { ReactNode } from "react";
export function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <section className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div></section>; }
export function Card({ title, children, span = 6 }: { title?: string; children: ReactNode; span?: 3 | 4 | 5 | 6 | 7 | 8 | 12 }) { return <section className={`card span-${span}`}>{title && <div className="card-head"><h2>{title}</h2></div>}{children}</section>; }
export function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div>; }
