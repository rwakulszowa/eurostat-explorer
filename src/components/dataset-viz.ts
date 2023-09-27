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

    const plot = Plot.plot({
      width: 720,
      height: 480,
      margin: 40,
      marks: [
        Plot.ruleY([0]),
        Plot.lineY(labelledRows, {
          x: idToLabel.get("time")!.label,
          y: "Value",
          stroke: idToLabel.get("geo")!.label,
          curve: "catmull-rom",
          marker: "dot",
          tip: true,
        }),
      ],
    });

    // TODO: legend, description, etc.
    this.replaceChildren(plot);
  }
}
