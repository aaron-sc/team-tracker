"use client";

import { useMemo, useState, ViewTransition } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Flame } from "lucide-react";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type RosterMember = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  roleName: string;
  roleColor: string | null;
  teamNames: string[];
  /** % of past practices/scrims attended (late counts as attended). Null if no history yet. */
  attendanceRate: number | null;
  /** Consecutive most-recent sessions attended, back to the last absence. */
  attendanceStreak: number;
};

const STREAK_THRESHOLD = 3;

function attendanceBadgeClass(rate: number): string {
  if (rate >= 85) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  if (rate >= 60) return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

export function RosterSearchList({ orgSlug, members }: { orgSlug: string; members: RosterMember[] }) {
  const [query, setQuery] = useState("");
  const canViewEmails = members.some((m) => m.email !== null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.roleName.toLowerCase().includes(q) ||
        m.teamNames.some((t) => t.toLowerCase().includes(q)),
    );
  }, [members, query]);

  return (
    <div>
      <div className="no-print relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={canViewEmails ? "Search by name, email, role, or team…" : "Search by name, role, or team…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="space-y-2">
        {filtered.map((m) => (
          <Link key={m.id} href={`/${orgSlug}/roster/${m.id}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <ViewTransition name={`roster-avatar-${m.id}`} share="roster-avatar">
                    <Avatar className="size-9">
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatarUrl} alt={m.name} className="size-full rounded-full object-cover" />
                      ) : (
                        <AvatarFallback>{initials(m.name)}</AvatarFallback>
                      )}
                    </Avatar>
                  </ViewTransition>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    {m.email ? <p className="text-xs text-muted-foreground">{m.email}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {m.attendanceStreak >= STREAK_THRESHOLD ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                      title={`${m.attendanceStreak} sessions attended in a row`}
                    >
                      <Flame className="size-3" />
                      {m.attendanceStreak}
                    </Badge>
                  ) : null}
                  {m.attendanceRate !== null ? (
                    <Badge variant="outline" className={attendanceBadgeClass(m.attendanceRate)} title="Attendance rate">
                      {m.attendanceRate}% attendance
                    </Badge>
                  ) : null}
                  <RoleBadge name={m.roleName} color={m.roleColor} />
                  {m.teamNames.map((name) => (
                    <Badge key={name} variant="outline">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No members match “{query}”.</p>
        ) : null}
      </div>
    </div>
  );
}
