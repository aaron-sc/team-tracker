const STAGE_ORDER = ["SCOUTING", "CONTACTED", "TRYOUT", "OFFER", "SIGNED", "PASSED"];

export function FunnelBars({ counts, labels }: { counts: Record<string, number>; labels: Record<string, string> }) {
  const present = STAGE_ORDER.filter((s) => counts[s] !== undefined && counts[s] > 0);
  if (present.length === 0) return <p className="text-sm text-muted-foreground">No prospects tracked yet.</p>;

  const max = Math.max(...present.map((s) => counts[s]));

  return (
    <div className="space-y-2">
      {present.map((stage) => (
        <div key={stage} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{labels[stage]}</span>
            <span className="font-medium text-foreground">{counts[stage]}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${labels[stage]}: ${counts[stage]}`}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${(counts[stage] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
