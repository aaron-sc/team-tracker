"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/ui/role-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  email: string;
  roleName: string;
  roleColor: string | null;
  teamNames: string[];
};

export function RosterSearchList({ orgSlug, members }: { orgSlug: string; members: RosterMember[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.roleName.toLowerCase().includes(q) ||
        m.teamNames.some((t) => t.toLowerCase().includes(q)),
    );
  }, [members, query]);

  return (
    <div>
      <div className="no-print relative mb-4 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, role, or team…"
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
                  <Avatar className="size-9">
                    <AvatarFallback>{initials(m.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
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
