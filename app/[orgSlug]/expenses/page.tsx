import { getOrgContext } from "@/lib/org/context";
import { requirePagePermission } from "@/lib/org/require-permission-page";
import { prisma } from "@/lib/db/prisma";
import { Permission } from "@/lib/generated/prisma/enums";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";
import { formatDate } from "@/lib/utils/format-time";
import { Receipt } from "lucide-react";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function ExpensesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const { org, membership } = await getOrgContext(orgSlug);
  requirePagePermission(orgSlug, membership, Permission.expense_manage);

  const [expenses, teams] = await Promise.all([
    prisma.expense.findMany({ where: { orgId: org.id }, orderBy: { incurredAt: "desc" }, include: { team: true, createdBy: { include: { user: true } } } }),
    prisma.team.findMany({ where: { orgId: org.id }, orderBy: { name: "asc" } }),
  ]);

  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"} · Total {formatCents(total)}
          </p>
        </div>
        <ExpenseDialog orgSlug={orgSlug} orgId={org.id} teams={teams.map((t) => ({ id: t.id, name: t.name }))} />
      </div>

      {byCategory.size > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {[...byCategory.entries()].map(([category, cents]) => (
            <span key={category} className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs">
              {category}: <span className="font-medium">{formatCents(cents)}</span>
            </span>
          ))}
        </div>
      ) : null}

      {expenses.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Receipt} message="No expenses logged yet." />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.category} · {formatDate(e.incurredAt, org.timezone)}
                    {e.team ? ` · ${e.team.name}` : ""}
                    {e.createdBy ? ` · logged by ${e.createdBy.user.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium">{formatCents(e.amountCents)}</span>
                  <DeleteExpenseButton orgSlug={orgSlug} orgId={org.id} expenseId={e.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
