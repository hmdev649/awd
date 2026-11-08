// Every file in brands/ becomes a page at /brands/<file-name>/
import { logoThumb } from "../lib/images.js";

export default {
  layout: "brand.njk",
  permalink: (data) => `/brands/${data.page.fileSlug}/`,
  eleventyComputed: {
    // { src, src2x } for the resized logo, or null
    thumb: async (data) => (data.logo ? logoThumb(data.logo) : null),
    // { code, name, slug, country, kind } from _data/regions.js, or null
    region: (data) => (data.state ? data.regions[`${data.country}-${data.state}`] || null : null),
    // { lat, lng, approximate } from _data/places.json, or null
    place: (data) => (data.state ? data.places[`${data.city || ""}|${data.state}|${data.country}`] || null : null),
  },
};
