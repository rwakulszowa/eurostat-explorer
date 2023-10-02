const esbuild = require("esbuild");
const postcss = require("esbuild-postcss");

module.exports = function (eleventyConfig) {
  eleventyConfig.addWatchTarget("../");

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
