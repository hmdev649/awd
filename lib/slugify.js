// "Crown & Buckle" -> "crown-and-buckle", "Thumm and Co." -> "thumm-and-co"
export function slugify(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[&+]/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
