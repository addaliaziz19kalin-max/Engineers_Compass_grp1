/** « Dr. S. Ben Ali » → « dr-s-ben-ali » (identifiant d'URL d'un membre ou d'une page) */
export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
