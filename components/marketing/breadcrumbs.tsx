import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { SITE_URL } from "@/lib/utils/site-url";

export type Crumb = { label: string; href?: string };

/** Visible breadcrumb trail + matching BreadcrumbList JSON-LD, for the secondary marketing pages
 *  (the landing page itself is the root and doesn't need one). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", url: SITE_URL }, ...items.map((i) => ({ name: i.label, url: i.href ? `${SITE_URL}${i.href}` : undefined }))].map(
      (item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        ...(item.url ? { item: item.url } : {}),
      }),
    ),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Link href="/" className="hover:text-foreground hover:underline">
        Home
      </Link>
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" />
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-foreground">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
