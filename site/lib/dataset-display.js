import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
import {
  fetchDatasetValues,
  categoriesToIndex,
  dimensionsReordering,
  parseDescription,
} from "./eurostat-client.js";
import { DatasetView } from "./dataset-view.js";

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
    const data = await resp.json();
    return parseDescription(data.details);
  }

  async render() {
    // Fetch dataset description.
    // This call should be fairly quick - the response contains information about dataset
    // shape, but not the values. It is sufficient to calculate page layout and render
    // placeholders for charts.
    const description = await this.fetchStaticMetadata();

    // We will display 2 dimensions per chart.
    const sliceLength = 2;
    const datasetView = DatasetView.build(description, sliceLength);

    // Render a container for every plot.
    // Actual plot values are not available yet, but we want to display
    // the layout first.
    const sections = datasetView.items().map(({ key, items }) => {
      const section = document.createElement("dataset-section");
      section.key = key;
      section.items = items;
      return section;
    });

    this.replaceChildren(...sections);

    // Fetch actual values. The response is fairly large.
    const datasetValues = await fetchDatasetValues(
      this.datasetId,
      Object.fromEntries(
        description.dimensions.map(({ code, positions }) => [
          code,
          positions.map((pos) => pos.code),
        ]),
      ),
    );

    // Dataset description and actual values follow a different dimension ordering mechanism.
    // This function allows quickly mapping between them.
    const reorder = dimensionsReordering(description, datasetValues);

    for (const s of sections) {
      s.handleValues(datasetValues, reorder);
    }
  }
}

/**
 * Section displaying a single plot with metadata.
 */
class DatasetSection extends HTMLElement {
  connectedCallback() {
    const header = document.createElement("p");
    header.innerText = this.key.map((x) => x.cat.description).join(" | ");

    const plotContainer = document.createElement("div");
    this._plotContainer = plotContainer;
    plotContainer.innerText = "Loading";

    this.replaceChildren(header, plotContainer);
  }

  /**
   * Given all dataset values, pick the interesting ones and render a plot.
   *
   * Note, this is suboptimal. Ideally, the caller will pick stuff and distribute
   * the items. This is just temporary.
   */
  handleValues(datasetValues, reorderKey) {
    const datum = this.items[0];
    const dimensionKeys = datum.key.map((k) => k.dim.description);
    const dimensions = {
      x: dimensionKeys[1],
      y: "Value",
      stroke: dimensionKeys[0],
    };

    const data = this.items.map((x) => {
      const i = categoriesToIndex(datasetValues.size, reorderKey(x.valueKey));
      const value = datasetValues.value[i];
      const dims = Object.fromEntries(
        x.key.map((k) => [k.dim.description, k.cat.description]),
      );
      return { Value: value, ...dims };
    });

    const plot = document.createElement("dataset-plot");
    plot.dimensions = dimensions;
    plot.data = data;

    this._plotContainer.replaceChildren(plot);
  }
}

/**
 * Simple plot with 3 dimensions.
 */
class DatasetPlot extends HTMLElement {
  connectedCallback() {
    const plot = Plot.plot({
      color: { legend: true },
      marks: [Plot.ruleY([0]), Plot.lineY(this.data, this.dimensions)],
    });

    this.replaceChildren(plot);
  }
}

customElements.define("dataset-display", DatasetDisplay);
customElements.define("dataset-section", DatasetSection);
customElements.define("dataset-plot", DatasetPlot);
