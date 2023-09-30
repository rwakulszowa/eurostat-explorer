const esbuild = require("esbuild");
const postcss = require("esbuild-postcss");

module.exports = function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/");

  eleventyConfig.on("eleventy.before", async () => {
    const app = esbuild.build({
      entryPoints: ["src/app/app.ts"],
      bundle: true,
      outdir: "_site/",
      sourcemap: true,
    });

    const worker = esbuild.build({
      entryPoints: ["src/app/worker.ts"],
      bundle: true,
      outdir: "_site/",
      sourcemap: true,
    });

    const css = esbuild.build({
      entryPoints: ["src/app/styles.css"],
      bundle: true,
      outdir: "_site/",
      plugins: [postcss()],
    });

    await Promise.all([app, worker, css]);
  });

  return {
    dir: { input: "src/app/" },
    htmlTemplateEngine: "njk",
  };
};
