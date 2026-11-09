// Resizes brand logos at build time into small WebP copies: 128/256px for
// the 56-120px logo boxes, 512px for the directory's large logo tiles on
// high-resolution screens.
import path from "node:path";
import Image from "@11ty/eleventy-img";

export async function logoThumb(file) {
  const meta = await Image(`images/logos/${file}`, {
    widths: [128, 256, 512],
    formats: ["webp"],
    outputDir: "./_site/img/logos/",
    urlPath: "/img/logos/",
    filenameFormat: (id, src, width, format) => `${path.parse(src).name}-${width}.${format}`,
  });
  const [small, mid = small, large = mid] = meta.webp;
  return { src: small.url, src2x: mid.url, large: large.url };
}
