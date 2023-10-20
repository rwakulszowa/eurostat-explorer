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

  eleventyConfig.addFilter("map", function (xs, attrs) {
    function get(x) {
      return attrs.reduce((acc, el) => acc[el], x);
    }
    return xs.map(get);
  });

  eleventyConfig.addFilter("index", function (datasets) {
    /**
     * Extract keywords from a dataset.
     * Produces a list of lowercase items seen in the dataset.
     */
    function keywords(item) {
      function traverse(o, cb) {
        if (!o) {
          return;
        }
        if (Array.isArray(o)) {
          o.forEach((o) => traverse(o, cb));
          return;
        }
        if (typeof o === "object") {
          Object.values(o).forEach((o) => traverse(o, cb));
          return;
        }
        cb(o);
      }

      function extractKeywords(x) {
        // 1. Lowercase.
        x = x.toLowerCase();

        // 2. Remove non-alphanumeric.
        x = x.replace(/\W/g, " ");

        // 3. Split whitespace (possibly multiple).
        x = x.split(/\s+/);

        return x.filter((x) => !!x);
      }

      const keywords = [];
      traverse(item, (x) => {
        keywords.push(...extractKeywords(x));
      });
      return keywords;
    }

    function histogram(xs) {
      const h = new Map();
      for (const x of xs) {
        h.set(x, (h.get(x) || 0) + 1);
      }
      return h;
    }

    function reverseIndex(index) {
      const reverseIndex = new Map();
      for (const [dataset, keywordCount] of index.entries()) {
        for (const [keyword, count] of keywordCount.entries()) {
          if (!reverseIndex.has(keyword)) {
            reverseIndex.set(keyword, []);
          }
          reverseIndex.get(keyword).push([count, dataset]);
        }
      }
      return reverseIndex;
    }

    /**
     * Convert to a sorted array for easy prefix search.
     */
    function indexToSortedArray(index) {
      const sortedIndex = [];
      for (const [key, valueCtr] of index.entries()) {
        // Sort descending - high histogram values go first.
        valueCtr.sort((a, b) => b[0] - a[0]);
        const sortedValues = valueCtr.map(([_count, v]) => v);
        sortedIndex.push([key, sortedValues]);
      }
      sortedIndex.sort((a, b) => {
        const [keywordA, _itemsA] = a;
        const [keywordB, _itemsB] = b;
        return keywordA < keywordB ? -1 : keywordA > keywordB ? 1 : 0;
      });
      return sortedIndex;
    }

    // Encode dataset ids as numbers to save some space.
    const datasetIds = datasets.map((d) => d.code);

    const keywordsPerDatasetIndex = new Map(
      datasets.map((d, i) => [i, histogram(keywords(d))]),
    );
    const datasetsPerKeyword = reverseIndex(keywordsPerDatasetIndex);
    return { datasetIds, searchIndex: indexToSortedArray(datasetsPerKeyword) };
  });

  eleventyConfig.on("eleventy.before", async () => {
    const tsProps = {
      bundle: true,
      outdir: "_site/",
      sourcemap: true,
    };

    const tss = [
      "index.ts",
      "dataset.ts",
      "eurostat-worker.ts",
      "search-worker.ts",
    ].map((file) =>
      esbuild.build({
        entryPoints: [file],
        ...tsProps,
      }),
    );

    const css = esbuild.build({
      entryPoints: ["styles.css"],
      bundle: true,
      outdir: "_site/",
      plugins: [postcss()],
    });

    await Promise.all([...tss, css]);
  });

  return {
    htmlTemplateEngine: "njk",
  };
};
