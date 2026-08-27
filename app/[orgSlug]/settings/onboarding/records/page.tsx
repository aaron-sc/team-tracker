import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { Permission } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/db/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format-time";
import { Download } from "lucide-react";

const TYPE_LABEL: Record<string, string> = {
  ACKNOWLEDGE: "Acknowledged",
  DOCUMENT: "Read document",
  LINK: "Visited link",
  VIDEO: "Watched video",
  SIGNATURE: "Signed",
};

export default async function OnboardingRecordsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { session, org, membership } = await getOrgContext(orgSlug);
  const viewerTz = session.user.timezone ?? org.timezone;
  requirePagePermission(orgSlug, membership, Permission.onboarding_manage);

  const completions = await prisma.onboardingCompletion.findMany({
    where: { task: { orgId: org.id } },
    include: { task: true, membership: { include: { user: true } } },
    orderBy: { completedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Onboarding records</h1>
        <p className="text-sm text-muted-foreground">
          Every completed task across the org, including signed documents.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead>Signature</TableHead>
            <TableHead>File</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {completions.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.membership.user.name}</TableCell>
              <TableCell>{c.task.title}</TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABEL[c.task.type] ?? c.task.type}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(c.completedAt, viewerTz)}
              </TableCell>
              <TableCell className="italic" style={{ fontFamily: c.signatureName ? "'Brush Script MT', cursive" : undefined }}>
                {c.signatureName ?? "—"}
              </TableCell>
              <TableCell>
                {c.signedFileUrl ? (
                  <a
                    href={`/api/onboarding/completions/${c.id}/file`}
                    className="flex items-center gap-1 text-primary underline underline-offset-4"
                  >
                    <Download className="size-3.5" />
                    {c.signedFileName ?? "Download"}
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
          {completions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No completed tasks yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
