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

    const items = datasetView.items();

    const datasetNav = document.createElement("dataset-nav");
    datasetNav.items = items.map(({ key }) => ({
      id: key.map((x) => x.cat.description).join(" | "),
      description: key.map((x) => ({
        dim: x.dim.description,
        cat: x.cat.description,
      })),
    }));

    // Render a container for every plot.
    // Actual plot values are not available yet, but we want to display
    // the layout first.
    const sections = items.map(({ key, items }) => {
      const section = document.createElement("dataset-section");
      section.key = key;
      section.items = items;
      section.setAttribute("id", key.map((x) => x.cat.description).join(" | "));
      return section;
    });

    // Header - short dataset description.
    // Part of the sections container - it scrolls with sections.
    const header = document.createElement("div");
    const headerTitle = document.createElement("h1");
    headerTitle.innerText = this.datasetId;

    const headerSubtitle = document.createElement("h2");
    headerSubtitle.innerText = description.title;

    header.replaceChildren(headerTitle, headerSubtitle);

    const sectionsContainer = document.createElement("div");
    sectionsContainer.setAttribute("class", "sections-container scroll");
    sectionsContainer.replaceChildren(header, ...sections);

    this.replaceChildren(sectionsContainer, datasetNav);

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
    const valuesPerSection = sections.map((s) =>
      s.items.map((x) => {
        const i = categoriesToIndex(datasetValues.size, reorder(x.valueKey));
        const value = datasetValues.value[i];
        const key = x.key;
        return { key, value };
      }),
    );

    for (const i in sections) {
      const s = sections[i];
      s.setValues(valuesPerSection[i]);
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
    plotContainer.innerHTML = `<span class="placeholder">Loading</span>`;

    this.replaceChildren(header, plotContainer);
  }

  /**
   * Render a plot with the given values.
   * It is assumed values size matches dimensions.
   */
  setValues(values) {
    const datum = this.items[0];
    const dimensionKeys = datum.key.map((k) => k.dim.description);
    const dimensions = {
      x: dimensionKeys[1],
      y: "Value",
      stroke: dimensionKeys[0],
    };

    const data = values.map(({ key, value }) => {
      const dims = Object.fromEntries(
        key.map((k) => [k.dim.description, k.cat.description]),
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
      width: 960,
      height: 720,
      margin: 40,
      color: { legend: true },
      marks: [Plot.ruleY([0]), Plot.lineY(this.data, this.dimensions)],
    });

    this.replaceChildren(plot);
  }
}

/**
 * Navigation for a single dataset.
 * Allows jumping between plots on the same page.
 */
class DatasetNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="scroll">
        <dl>
          ${this.items
            .map(
              (item) => `
                <a href="#${item.id}">
                  <dt>${item.id}</dt>
                  <dd>
                    <ul>
                      ${item.description
                        .map((x) => `<li>${x.dim}: ${x.cat}</li>`)
                        .join("\n")}
                    </ul>
                  </dd>
                </a>`,
            )
            .join("\n")}
        </dl>
      </nav>
    `;
  }
}

customElements.define("dataset-display", DatasetDisplay);
customElements.define("dataset-section", DatasetSection);
customElements.define("dataset-plot", DatasetPlot);
customElements.define("dataset-nav", DatasetNav);
