export interface PrSummary {
  id: string;
  status: 'pending' | 'ready' | 'failed';
  overview?: string;
  pros?: string[];
  cons?: string[];
  watchOuts?: string[];
  authorNote?: string;
  errorMessage?: string;
  model?: string;
  headSha?: string;
  createdAt?: string;
}

export function StatusBadge({
  status,
}: {
  status: 'pending' | 'ready' | 'failed';
}) {
  if (status === 'ready') {
    return (
      <span className="badge bg-emerald-900/40 text-emerald-200">ready</span>
    );
  }
  if (status === 'failed') {
    return <span className="badge bg-rose-900/40 text-rose-200">failed</span>;
  }
  return <span className="badge bg-ink-800 text-ink-300">pending</span>;
}

export function PrStateBadge({
  pr,
}: {
  pr: { state: string; merged: boolean };
}) {
  if (pr.merged) {
    return (
      <span className="badge bg-purple-900/40 text-purple-200">merged</span>
    );
  }
  if (pr.state === 'closed') {
    return <span className="badge bg-rose-900/40 text-rose-200">closed</span>;
  }
  return <span className="badge bg-sky-900/40 text-sky-200">open</span>;
}

export function BulletList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'emerald' | 'rose' | 'amber';
  items?: string[];
}) {
  if (!items || items.length === 0) return null;
  const colour = {
    emerald: 'text-emerald-200',
    rose: 'text-rose-200',
    amber: 'text-amber-200',
  }[tone];
  return (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${colour}`}>
        {title}
      </h4>
      <ul className="mt-2 space-y-1 text-ink-100">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={colour}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
