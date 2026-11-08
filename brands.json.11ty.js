// /brands.json: the data the directory page filters and sorts in the browser.
export const data = { permalink: "/brands.json", eleventyExcludeFromCollections: true };

export function render({ collections }) {
  const brands = collections.brands.map(({ data: d, page }) => ({
    slug: page.fileSlug,
    url: page.url,
    name: d.name,
    city: d.city || "",
    state: d.state || "",
    country: d.country,
    website: d.website || "",
    instagram: d.instagram || "",
    email: d.email || "",
    founded: d.founded || null,
    revived: d.revived || null,
    products: d.products || [],
    movements: d.movements || [],
    made_in_america: d.made_in_america || "",
    status: d.status || "active",
    logo: d.logo ? `/images/logos/${d.logo}` : "",
    thumb: d.thumb?.src2x || "",
    region: d.region ? { name: d.region.name, url: `/states/${d.region.slug}/` } : null,
    lat: d.place?.lat ?? null,
    lng: d.place?.lng ?? null,
    added: d.added || "",
    last_updated: d.last_updated || "",
  }));
  return JSON.stringify(brands);
}
