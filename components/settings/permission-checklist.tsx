"use client";

import { PERMISSION_GROUPS, PERMISSION_LABELS } from "@/lib/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { Permission } from "@/lib/generated/prisma/enums";

export function PermissionChecklist({
  defaultPermissions = [],
  disabled = false,
}: {
  defaultPermissions?: Permission[];
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState<Set<Permission>>(new Set(defaultPermissions));

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">{group.label}</h4>
          <div className="space-y-2">
            {group.permissions.map((permission) => (
              <div key={permission} className="flex items-center gap-2">
                <Checkbox
                  id={`perm-${permission}`}
                  name="permissions"
                  value={permission}
                  disabled={disabled}
                  checked={checked.has(permission)}
                  onCheckedChange={(value) => {
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (value) next.add(permission);
                      else next.delete(permission);
                      return next;
                    });
                  }}
                />
                <Label htmlFor={`perm-${permission}`} className="cursor-pointer text-sm font-normal">
                  {PERMISSION_LABELS[permission]}
                </Label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
