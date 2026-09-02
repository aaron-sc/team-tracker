import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Public, unauthenticated roster embed — meant to be <iframe>'d on an org's own website (see
 * PublicRosterEmbedPanel for the customization UI that generates this URL). Deliberately shows
 * only what a team would want on its public site: name, avatar, position, jersey #, in-game
 * name, bio, and tracker links. Never email, phone, or Discord handle — those stay
 * inside the app regardless of what a viewer requests via query params, since this route has no
 * concept of "who's asking."
 */
export default async function PublicRosterEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    theme?: string;
    showJersey?: string;
    showPosition?: string;
    showBio?: string;
    showTrackers?: string;
  }>;
}) {
  const { token } = await params;
  const opts = await searchParams;
  const dark = opts.theme === "dark";
  const showJersey = opts.showJersey !== "0";
  const showPosition = opts.showPosition !== "0";
  const showBio = opts.showBio === "1";
  const showTrackers = opts.showTrackers === "1";

  const team = await prisma.team.findUnique({ where: { publicRosterToken: token } });
  if (!team || !team.publicRosterEnabled) notFound();

  const roster = await prisma.teamMembership.findMany({
    where: { teamId: team.id, leftTeamAt: null },
    include: { membership: { include: { user: true } } },
    orderBy: [{ isStarter: "desc" }, { membership: { user: { name: "asc" } } }],
  });

  const bg = dark ? "#0a0a0a" : "#ffffff";
  const fg = dark ? "#fafafa" : "#0a0a0a";
  const muted = dark ? "#a1a1aa" : "#71717a";
  const border = dark ? "#27272a" : "#e4e4e7";
  const cardBg = dark ? "#18181b" : "#fafafa";

  return (
    <div style={{ background: bg, color: fg, minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        {team.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logoUrl} alt="" style={{ width: 32, height: 32, objectFit: "contain", borderRadius: 6 }} />
        ) : null}
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{team.name}</h1>
          <p style={{ fontSize: 12, color: muted, margin: 0 }}>{team.game}</p>
        </div>
      </div>

      {roster.length === 0 ? (
        <p style={{ fontSize: 13, color: muted }}>No roster listed yet.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
          {roster.map((entry) => {
            const trackers = [
              entry.trackerValorant && { label: "Valorant", url: entry.trackerValorant },
              entry.trackerLeagueOfLegends && { label: "LoL", url: entry.trackerLeagueOfLegends },
              entry.trackerRocketLeague && { label: "RL", url: entry.trackerRocketLeague },
              entry.trackerSmash && { label: "Smash", url: entry.trackerSmash },
              entry.trackerLink && { label: "Stats", url: entry.trackerLink },
            ].filter((t): t is { label: string; url: string } => !!t);

            return (
              <div
                key={entry.id}
                style={{ border: `1px solid ${border}`, background: cardBg, borderRadius: 10, padding: "10px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {entry.membership.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.membership.user.avatarUrl}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: border,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {initials(entry.membership.user.name)}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {entry.inGameName || entry.membership.user.name}
                    </p>
                    {(showJersey && entry.jerseyNumber) || (showPosition && entry.position) ? (
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                        {showPosition && entry.position ? entry.position : ""}
                        {showJersey && entry.jerseyNumber ? ` #${entry.jerseyNumber}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                {showBio && entry.bio ? <p style={{ fontSize: 11, color: muted, marginTop: 6 }}>{entry.bio}</p> : null}
                {showTrackers && trackers.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: 6 }}>
                    {trackers.map((t) => (
                      <a
                        key={t.label}
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 10, color: "#6366f1", textDecoration: "underline" }}
                      >
                        {t.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: 10, color: muted, marginTop: 16, textAlign: "right" }}>
        Powered by Formation
      </p>
    </div>
  );
}
