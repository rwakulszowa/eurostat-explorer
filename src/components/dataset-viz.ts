import * as Plot from "@observablehq/plot";
import type { EurostatClient, Categories } from "../lib/eurostat-client";

/**
 * Visualizes a dataset.
 * Takes care of fetching its own data, renders UI controls and a chart.
 *
 * This component will be rendered after parsing the script. To avoid layout changes,
 * the parent container should take care of choosing a reasonable size.
 */
export class DatasetViz extends HTMLElement {
  /**
   * Client for the eurostat API.
   * Must be injected before use.
   */
  static client: EurostatClient;

  connectedCallback() {
    // Display no placeholder - the caller takes care of that.
    this.render(this.datasetId, this.categories);
  }

  /**
   * Dataset we're looking at.
   */
  get datasetId(): string {
    const maybeValue = this.getAttribute("dataset-id");
    if (!maybeValue) {
      throw new Error("'dataset-id' not set");
    }
    return maybeValue;
  }

  /**
   * A subset of all available categories.
   *
   * A single dataset may be divided into multiple dimensions and each dimension
   * consists of multiple categories. Typically, a visualization will only look at
   * a subset of all categories.
   */
  get categories(): Categories {
    const maybeValue = this.getAttribute("categories");
    if (!maybeValue) {
      throw new Error("'categories' not set");
    }
    const parsed = new URLSearchParams(maybeValue);
    const ret = new Map();
    for (const [k, v] of parsed.entries()) {
      if (!ret.has(k)) {
        ret.set(k, [v]);
      } else {
        ret.get(k).push(v);
      }
    }
    return ret;
  }

  private async render(datasetId: string, categories: Categories) {
    const { rows, idToLabel } = await DatasetViz.client.fetch(
      datasetId,
      categories,
    );

    // Rows contain short ids, not human readable labels.
    // Map to a more human friendly form.
    const labelledRows = rows.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([dim, cat]) => {
          // "value" requires special handling. It's a custom key, absent in the `idToLabel` map.
          if (dim === "value") {
            return ["Value", cat];
          } else {
            const dimLabels = idToLabel.get(dim)!;
            return [dimLabels.label, dimLabels.cat.get(cat as string)!];
          }
        }),
      ),
    );

    const scales = {
      x: idToLabel.get("time")!.label,
      y: "Value",
      stroke: idToLabel.get("geo")!.label,
    };

    // List of all geo entries.
    const geos: string[] = Array.from(idToLabel.get("geo")!.cat.values());
    geos.sort();
    const color = Plot.scale({
      color: {
        type: "ordinal",
        scheme: "YlGnBu",
        domain: geos,
        range: [0.2, 1],
      },
    });

    const legendItems = geos.map((geo) => ({
      key: geo,
      color: color.apply(geo),
    }));

    // DOM.
    const plot = document.createElement("dataset-viz-plot") as DatasetVizPlot;
    plot.classList.add("w-4/5");
    plot.rows = labelledRows;
    plot.scales = scales;
    plot.color = color;

    const legend = document.createElement(
      "dataset-viz-legend",
    ) as DatasetVizLegend;
    legend.classList.add("w-1/5", "text-xs", "h-full", "overflow-auto");
    legend.items = legendItems;

    const container = document.createElement("div");
    container.classList.add(
      "flex",
      "flex-row",
      "w-full",
      "h-full",
      "overflow-hidden",
    );
    container.replaceChildren(plot, legend);

    // TODO: legend, description, etc.
    this.replaceChildren(container);
  }
}

/**
 * Renders a plot.
 */
export class DatasetVizPlot extends HTMLElement {
  rows: Array<{ [key: string]: any }>;
  scales: { x: string; y: string; stroke: string };
  color: Plot.Scale;

  connectedCallback() {
    const plot = Plot.plot({
      width: 800,
      height: 500,
      margin: 40,
      color: this.color,
      x: { label: null, nice: true },
      y: { grid: true, label: null, nice: true, zero: true },
      marks: [
        Plot.ruleY([0]),
        Plot.lineY(this.rows, {
          ...this.scales,
          curve: "catmull-rom",
          marker: "dot",
          tip: true,
        }),
      ],
    });
    this.replaceChildren(plot);
  }
}

/**
 * Renders a plot legend.
 */
export class DatasetVizLegend extends HTMLElement {
  items: Array<{ key: string; color: string }>;

  connectedCallback() {
    this.innerHTML = `
      <ul class="flex flex-col gap-1 h-full">
        ${this.items
          .map(
            ({ key, color }) =>
              `<li>
                <span style="background-color:${color}" class="inline-block mr-2 w-4 h-4 align-middle"></span>
                <span>${key}</span>
              </li>`,
          )
          .join("")}
      </ul>
    `;
  }
}
