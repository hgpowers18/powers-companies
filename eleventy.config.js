import { load as parseYAML } from "js-yaml";

export default function (eleventyConfig) {
  // Content is authored as YAML so the CMS writes files a human can still read.
  eleventyConfig.addDataExtension("yml,yaml", (contents) => parseYAML(contents));

  // The CMS persists drag-and-drop ordering as a numeric `order` field, so the
  // page follows the order shown in the admin rather than filename or date.
  eleventyConfig.addCollection("developments", (api) =>
    api
      .getFilteredByGlob("content/developments/*.md")
      .sort((a, b) => (a.data.order ?? Infinity) - (b.data.order ?? Infinity)),
  );

  // Assets and the CMS shell ship as-is; only .njk files are templated.
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("main.js");
  eleventyConfig.addPassthroughCopy("uploads");
  eleventyConfig.addPassthroughCopy("admin");

  return {
    // Markdown is enabled for the developments collection only; those entries
    // set permalink: false so they feed the list without generating pages.
    templateFormats: ["njk", "md"],
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
};
