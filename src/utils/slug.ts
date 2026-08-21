/**
 * Pure URL-slug helpers shared by migrations, seeds, actions, and queries.
 * No DB access here — uniqueness is handled by `uniqueSlugify(base, existing)`.
 *
 * Rules: lowercase; whitespace runs -> single hyphen; strip anything that is
 * not [a-z0-9-]; collapse repeated hyphens; trim leading/trailing hyphens.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns `base` if it is free, otherwise the first available `-2`, `-3`, ...
 * suffix. `existing` must contain every slug already taken.
 */
export function uniqueSlugify(base: string, existing: string[]): string {
  const taken = new Set(existing);
  if (!taken.has(base)) {
    return base;
  }
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}
