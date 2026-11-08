// Every file in brands/ becomes a page at /brands/<file-name>/
export default {
  layout: "brand.njk",
  permalink: (data) => `/brands/${data.page.fileSlug}/`,
};
