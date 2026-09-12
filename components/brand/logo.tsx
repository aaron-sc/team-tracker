import { cn } from "@/lib/utils";

/**
 * Formation's mark — fixed brand-orange, deliberately independent of `--primary` (which an org
 * can recolor via its own theme settings, see app/[orgSlug]/layout.tsx). A customer changing
 * their in-app accent shouldn't change the product's own logo. Three triangles in a lead-and-
 * cover arrangement — a team lining up in formation.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#EA580C" />
      <path d="M10.5 18 13 12 15.5 18Z" fill="white" />
      <path d="M18.5 18 21 12 23.5 18Z" fill="white" />
      <path d="M11 24 16 15 21 24Z" fill="white" />
    </svg>
  );
}

/**
 * Icon + wordmark — the "<mark/> Formation" pair repeated across every header/shell in the app.
 * `size` is a Tailwind size-* utility for the mark; pass `wordmark={false}` for icon-only spots
 * (e.g. inline within a sentence that already names the product).
 */
export function Logo({
  size = "size-6",
  className,
  wordmark = true,
}: {
  size?: string;
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={size} />
      {wordmark && "Formation"}
    </span>
  );
}
