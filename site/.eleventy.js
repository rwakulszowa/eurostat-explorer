module.exports = function (eleventyConfig) {
  // Map an array by picking `key` of each element.
  eleventyConfig.addFilter("get", function (value, key) {
    return value.map((v) => v[key]);
  });

  // Passthrough copy CSS.
  // https://www.11ty.dev/docs/assets/
  eleventyConfig.addPassthroughCopy("bundle.css");
};
