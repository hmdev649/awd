// Resizes brand logos at build time: the originals in images/logos are often
// 600-2000px wide and 300KB+, but they display at 56-120px.
import path from "node:path";
import Image from "@11ty/eleventy-img";

export async function logoThumb(file) {
  const meta = await Image(`images/logos/${file}`, {
    widths: [128, 256],
    formats: ["webp"],
    outputDir: "./_site/img/logos/",
    urlPath: "/img/logos/",
    filenameFormat: (id, src, width, format) => `${path.parse(src).name}-${width}.${format}`,
  });
  const [small, large = small] = meta.webp;
  return { src: small.url, src2x: large.url };
}
