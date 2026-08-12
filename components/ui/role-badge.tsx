import { Badge } from "@/components/ui/badge";
import { getContrastColor } from "@/lib/utils/color";

export function RoleBadge({ name, color }: { name: string; color?: string | null }) {
  if (!color) return <Badge variant="secondary">{name}</Badge>;

  return (
    <Badge className="border-transparent" style={{ backgroundColor: color, color: getContrastColor(color) }}>
      {name}
    </Badge>
  );
}
