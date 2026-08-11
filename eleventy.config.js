const yaml = require("js-yaml");

module.exports = function (eleventyConfig) {
  // Content is authored as YAML so the CMS writes files a human can still read.
  eleventyConfig.addDataExtension("yml,yaml", (contents) => yaml.load(contents));

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
