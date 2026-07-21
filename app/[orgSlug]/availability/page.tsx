import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddRuleForm } from "@/components/availability/add-rule-form";
import { DeleteRuleButton } from "@/components/availability/delete-rule-button";
import { AddExceptionForm } from "@/components/availability/add-exception-form";
import { DeleteExceptionButton } from "@/components/availability/delete-exception-button";
import { addAvailabilityRuleAction, addAvailabilityExceptionAction } from "@/lib/actions/availability";
import { Users } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);

  const canManageSelf = membership.permissions.includes(Permission.availability_manage_self);
  const canManageOthers = membership.permissions.includes(Permission.availability_manage_others);

  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { membershipId: membership.membershipId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { membershipId: membership.membershipId, date: { gte: new Date(new Date().toDateString()) } },
      orderBy: { date: "asc" },
    }),
  ]);

  const addRuleAction = addAvailabilityRuleAction.bind(null, orgSlug, org.id, membership.membershipId);
  const addExceptionAction = addAvailabilityExceptionAction.bind(null, orgSlug, org.id, membership.membershipId);

  const rulesByDay = DAYS.map((label, dayOfWeek) => ({
    label,
    dayOfWeek,
    rules: rules.filter((r) => r.dayOfWeek === dayOfWeek),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My availability</h1>
          <p className="text-sm text-muted-foreground">
            Recurring weekly windows when you&apos;re free to practice or scrim.
          </p>
        </div>
        {canManageOthers ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${orgSlug}/availability/team`}>
              <Users className="size-4" />
              Team view
            </Link>
          </Button>
        ) : null}
      </div>

      {!canManageSelf ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            Your role doesn&apos;t include availability management.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rulesByDay.map((day) => (
                <div key={day.dayOfWeek} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 shrink-0 text-sm font-medium">{day.label}</span>
                  {day.rules.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No availability set</span>
                  ) : (
                    day.rules.map((rule) => (
                      <Badge key={rule.id} variant="secondary" className="gap-1 py-1 pr-1">
                        {rule.startTime}–{rule.endTime}
                        <DeleteRuleButton orgSlug={orgSlug} orgId={org.id} membershipId={membership.membershipId} ruleId={rule.id} />
                      </Badge>
                    ))
                  )}
                </div>
              ))}
              <div className="border-t pt-4">
                <AddRuleForm action={addRuleAction} defaultTimezone={org.timezone} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exceptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {exceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming exceptions.</p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map((exception) => (
                    <div key={exception.id} className="flex items-center justify-between text-sm">
                      <span>
                        {exception.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} —{" "}
                        {exception.isAvailable ? "Extra available" : "Unavailable"}
                        {exception.startTime && exception.endTime ? ` (${exception.startTime}–${exception.endTime})` : ""}
                        {exception.reason ? ` · ${exception.reason}` : ""}
                      </span>
                      <DeleteExceptionButton
                        orgSlug={orgSlug}
                        orgId={org.id}
                        membershipId={membership.membershipId}
                        exceptionId={exception.id}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4">
                <AddExceptionForm action={addExceptionAction} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
