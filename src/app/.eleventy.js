const { EleventyHtmlBasePlugin } = require("@11ty/eleventy");
const esbuild = require("esbuild");
const postcss = require("esbuild-postcss");
const lucideIcons = require("@grimlink/eleventy-plugin-lucide-icons");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(lucideIcons);

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
