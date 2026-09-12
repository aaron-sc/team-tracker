import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center text-lg font-semibold">
          <Logo />
        </Link>
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/[0.06] shadow-soft-1">
          <div className="mb-5 space-y-1 text-center">
            <h1 className="text-xl font-semibold">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
        </div>
        {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
