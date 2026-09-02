import Link from "next/link";
import { getOrgContext } from "@/lib/org/context";
import { requireOnboardingCompletePage } from "@/lib/onboarding/gate";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RuleGroupForm } from "@/components/availability/rule-group-form";
import { EditRuleGroupDialog } from "@/components/availability/edit-rule-group-dialog";
import { DeleteRuleGroupButton } from "@/components/availability/delete-rule-group-button";
import { AddExceptionForm } from "@/components/availability/add-exception-form";
import { DeleteExceptionButton } from "@/components/availability/delete-exception-button";
import { saveAvailabilityRuleGroupAction, addAvailabilityExceptionAction } from "@/lib/actions/availability";
import { getTimezones } from "@/lib/utils/timezones";
import { formatCalendarDate, formatWallClockTime } from "@/lib/utils/format-time";
import { convertWeeklyTime } from "@/lib/utils/availability-tz";
import { Users, ArrowRight } from "lucide-react";

const DAY_LABELS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AvailabilityPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  await requireOnboardingCompletePage(orgSlug, org.id, membership.membershipId);
  const myTimezone = session.user.timezone ?? org.timezone;
  const viewerHour12 = session.user.timeFormat !== "24h";

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

  const addRuleAction = saveAvailabilityRuleGroupAction.bind(null, orgSlug, org.id, membership.membershipId, []);
  const addExceptionAction = addAvailabilityExceptionAction.bind(null, orgSlug, org.id, membership.membershipId);

  const groupsByKey = new Map<
    string,
    { startTime: string; endTime: string; timezone: string; days: number[]; ruleIds: string[] }
  >();
  for (const rule of rules) {
    const key = `${rule.startTime}-${rule.endTime}`;
    const group = groupsByKey.get(key) ?? {
      startTime: rule.startTime,
      endTime: rule.endTime,
      timezone: rule.timezone,
      days: [],
      ruleIds: [],
    };
    group.days.push(rule.dayOfWeek);
    group.ruleIds.push(rule.id);
    groupsByKey.set(key, group);
  }
  const ruleGroups = Array.from(groupsByKey.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));

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
              {ruleGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No availability set yet.</p>
              ) : (
                <div className="space-y-2">
                  {ruleGroups.map((group) => {
                    const showsOrgConversion = group.timezone !== org.timezone;
                    const referenceDay = group.days[0] ?? 0;
                    const orgStart = showsOrgConversion
                      ? convertWeeklyTime(referenceDay, group.startTime, group.timezone, org.timezone)
                      : null;
                    const orgEnd = showsOrgConversion
                      ? convertWeeklyTime(referenceDay, group.endTime, group.timezone, org.timezone)
                      : null;
                    const dayShifted = orgStart && orgStart.dayOfWeek !== referenceDay;
                    return (
                    <div
                      key={`${group.startTime}-${group.endTime}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {DAY_ABBR.map((label, i) => (
                          <Badge
                            key={i}
                            variant={group.days.includes(i) ? "default" : "outline"}
                            className={group.days.includes(i) ? "" : "text-muted-foreground/50"}
                          >
                            {label}
                          </Badge>
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">
                          {formatWallClockTime(group.startTime, viewerHour12)}–{formatWallClockTime(group.endTime, viewerHour12)}{" "}
                          ({group.timezone.replace(/_/g, " ")})
                        </span>
                        {showsOrgConversion && orgStart && orgEnd ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            <ArrowRight className="size-3" />
                            {dayShifted ? `${DAY_LABELS_LONG[orgStart.dayOfWeek]} ` : ""}
                            {formatWallClockTime(orgStart.time, viewerHour12)}–{formatWallClockTime(orgEnd.time, viewerHour12)} to
                            your team ({org.timezone.replace(/_/g, " ")} org time)
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center">
                        <EditRuleGroupDialog
                          orgSlug={orgSlug}
                          orgId={org.id}
                          membershipId={membership.membershipId}
                          ruleIds={group.ruleIds}
                          days={group.days}
                          startTime={group.startTime}
                          endTime={group.endTime}
                          timezone={group.timezone}
                          timezones={getTimezones()}
                          orgTimezone={org.timezone}
                          hour12={viewerHour12}
                        />
                        <DeleteRuleGroupButton
                          orgSlug={orgSlug}
                          orgId={org.id}
                          membershipId={membership.membershipId}
                          ruleIds={group.ruleIds}
                        />
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium">Add availability</p>
                <RuleGroupForm
                  action={addRuleAction}
                  defaultTimezone={myTimezone}
                  timezones={getTimezones()}
                  orgTimezone={org.timezone}
                  hour12={viewerHour12}
                />
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
                        {formatCalendarDate(exception.date)} —{" "}
                        {exception.isAvailable ? "Extra available" : "Unavailable"}
                        {exception.startTime && exception.endTime
                          ? ` (${formatWallClockTime(exception.startTime, viewerHour12)}–${formatWallClockTime(exception.endTime, viewerHour12)})`
                          : ""}
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
