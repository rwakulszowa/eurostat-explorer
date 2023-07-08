module.exports = function (eleventyConfig) {
  // Passthrough copy CSS.
  // https://www.11ty.dev/docs/assets/
  eleventyConfig.addPassthroughCopy("bundle.css");
};
