export function WinLossBar({
  teamName,
  wins,
  losses,
  draws,
}: {
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
}) {
  const total = wins + losses + draws;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{teamName}</span>
        <span className="text-xs text-muted-foreground">
          {total === 0 ? "No results yet" : `${wins}W – ${losses}L${draws ? ` – ${draws}D` : ""}`}
        </span>
      </div>
      {total > 0 ? (
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${teamName}: ${wins} wins, ${losses} losses, ${draws} draws`}>
          {wins > 0 ? (
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(wins / total) * 100}%` }} title={`${wins} wins`} />
          ) : null}
          {losses > 0 ? (
            <div className="h-full rounded-full bg-red-500" style={{ width: `${(losses / total) * 100}%` }} title={`${losses} losses`} />
          ) : null}
          {draws > 0 ? (
            <div
              className="h-full rounded-full bg-muted-foreground/50"
              style={{ width: `${(draws / total) * 100}%` }}
              title={`${draws} draws`}
            />
          ) : null}
        </div>
      ) : (
        <div className="h-2 rounded-full bg-muted" />
      )}
    </div>
  );
}
