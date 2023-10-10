const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const esbuild = require("esbuild");
const postcss = require("esbuild-postcss");
const lucideIcons = require("@grimlink/eleventy-plugin-lucide-icons");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(lucideIcons, { "stroke-width": 1.5 });

  /**
   * Prepend a dimensions summary to a list of dimensions and trim redundant data.
   *
   * Tightly coupled with the _datasets_ source and a dataset card component.
   * Not to be used anywhere else.
   */
  eleventyConfig.addFilter("datasetDimensions", function (dims) {
    const dimensionsList = {
      label: "Dimensions",
      items: dims.map((d) => d.description),
    };
    const categoriesPerDimension = dims.map((d) => ({
      label: d.description,
      items: d.positions.slice(0, 5).map((p) => p.description),
    }));
    return [dimensionsList, ...categoriesPerDimension];
  });

  eleventyConfig.on("eleventy.before", async () => {
    const app = esbuild.build({
      entryPoints: ["app.ts"],
      bundle: true,
      outdir: "_site/",
      sourcemap: true,
    });

    const worker = esbuild.build({
      entryPoints: ["worker.ts"],
      bundle: true,
      outdir: "_site/",
      sourcemap: true,
    });

    const css = esbuild.build({
      entryPoints: ["styles.css"],
      bundle: true,
      outdir: "_site/",
      plugins: [postcss()],
    });

    await Promise.all([app, worker, css]);
  });

  return {
    htmlTemplateEngine: "njk",
  };
};
