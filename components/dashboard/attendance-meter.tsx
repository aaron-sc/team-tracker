export function AttendanceMeter({ rate, sampleSize }: { rate: number | null; sampleSize: number }) {
  if (rate === null) {
    return <p className="text-sm text-muted-foreground">No completed sessions to report on yet.</p>;
  }

  const clamped = Math.min(100, Math.max(0, rate));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold">{Math.round(clamped)}%</span>
        <span className="text-xs text-muted-foreground">
          {sampleSize} tracked session{sampleSize === 1 ? "" : "s"}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`Attendance rate: ${Math.round(clamped)}%`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">Share of tracked practice/scrim invites marked attended or late.</p>
    </div>
  );
}
