import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
import {
  parseDimension,
  fetchDatasetValues,
  categoriesToIndex,
} from "./eurostat-client.js";
import { Dimensions } from "./dimensions.js";

class DatasetDisplay extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <span>Loading</span>
    `;
    this.render();
  }

  get datasetId() {
    const ret = this.getAttribute("dataset");
    if (!ret) {
      throw new Error("Attribute `dataset` is required.");
    }
    return ret;
  }

  async fetchStaticMetadata() {
    const resp = await fetch(`./${this.datasetId}.json`);
    return resp.json();
  }

  async render() {
    const {
      details: { dimensions },
    } = await this.fetchStaticMetadata();

    const categoriesPerDimension = Object.fromEntries(
      dimensions.map(({ code, positions }) => [
        code,
        positions.map((pos) => pos.code),
      ]),
    );

    const datasetValues = await fetchDatasetValues(
      this.datasetId,
      categoriesPerDimension,
    );

    const elements = dataPerSection(datasetValues).map(({ key, plot }) => {
      const section = document.createElement("div");
      const headerEl = section.appendChild(document.createElement("div"));
      headerEl.innerHTML = `<p>
          ${key.map((c) => c.label).join(" | ")}
        </p>`;

      const plotEl = section.appendChild(
        document.createElement("dataset-plot"),
      );
      plotEl.setAttribute("key", key.map((c) => c.id).join("-"));
      plotEl.data = plot.data;
      plotEl.dimensions = plot.dims;

      return section;
    });

    this.replaceChildren(...elements);
  }
}

/**
 * Simple plot with 3 dimensions.
 * Apart from attributes, it reads the following properties:
 * - data
 * - dimensions
 */
class DatasetPlot extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="${this.key}"></div>
    `;
    // Assume setters are invoked before connecting and we only need to render once.
    this.render();
  }

  get key() {
    return this.getAttribute("key");
  }

  render() {
    const plot = Plot.plot({
      color: { legend: true },
      marks: [Plot.ruleY([0]), Plot.lineY(this.data, this.dimensions)],
    });

    const div = document.querySelector(`#${this.key}`);
    div.replaceChildren(plot);
  }
}

customElements.define("dataset-display", DatasetDisplay);
customElements.define("dataset-plot", DatasetPlot);

/**
 * Data processing logic.
 * Components above define how to display data. Less trivial bits are implemented as pure functions below.
 * This approach makes it easier to unit test the app.
 */

/**
 * Return render-friendly data for each section.
 */
export function dataPerSection(datasetValues) {
  const parsedDimensions = datasetValues.id.map((dimId) => ({
    ...parseDimension(datasetValues.dimension[dimId], dimId),
    id: dimId,
  }));

  const dims = new Dimensions(
    parsedDimensions.map((d, i) => ({
      // Dimension index in raw data.
      // `Dimensions` may get reordered, so we keep the original index here.
      iDim: i,
      id: d.id,
      size: d.categories.length,
    })),
  );

  // We can display 2 dimensions per chart.
  // Slice data, so that each element per left key gets a separate chart.
  const sliceAt = dims.length - 2;
  const [leftKeys, rightKeys] = dims.slice(sliceAt);
  const rightDims = dims.dimensions.slice(sliceAt);

  // Per-plot data keys. We need them to map data format to plot format.
  const plotDataKeys = rightDims.map((dim) => parsedDimensions[dim.iDim].label);

  // Common plot properties.
  const plotDimensions = {
    x: plotDataKeys[1],
    y: "Value",
    stroke: plotDataKeys[0],
  };

  // Precompute mappings for key segments.
  // We don't want to perform any repetitive work inside a loop.
  const richRightKeys = new Map(
    rightKeys.map((right) => [
      right,
      Object.fromEntries(
        right.map(({ i, dim }) => {
          const richDim = parsedDimensions[dim.iDim];
          const cat = richDim.categories[i];
          return [richDim.label, cat.label];
        }),
      ),
    ]),
  );

  // One element per left key.
  return leftKeys.map((left) => {
    const leftCategories = left.map(
      ({ i, dim }) => parsedDimensions[dim.iDim].categories[i],
    );

    const data = rightKeys
      .map((right) => ({ right, fullKey: left.concat(right) }))
      .map(({ right, fullKey }) => {
        // Convert back to format compatible with raw Eurostat data:
        // category indices ordered by dimension indices.
        //
        // TODO: this can be precalculated once to avoid nlogn in a loop.
        // Use `dims.dimensions` to determine current ordering.
        const key = fullKey.map(({ i, dim }) => ({
          iCat: i,
          iDim: dim.iDim,
        }));
        key.sort((a, b) => a.iDim - b.iDim);
        const categories = key.map((k) => k.iCat);

        // Read value associated with the key.
        const i = categoriesToIndex(datasetValues.size, categories);
        const value = datasetValues.value[i];

        // Build a Plot friendly datum.
        return { Value: value, ...richRightKeys.get(right) };
      });

    // Final result.
    // Return stuff necessary to render items.
    return {
      key: leftCategories,
      plot: {
        dims: plotDimensions,
        data,
      },
    };
  });
}
