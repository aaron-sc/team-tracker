export const RESERVED_SLUGS = new Set([
  "api",
  "app",
  "login",
  "signup",
  "invite",
  "orgs",
  "settings",
  "dashboard",
  "public",
  "static",
  "assets",
  "admin",
  "new",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}
