import * as Plot from "https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm";
import {
  groupByDimensions,
  indexToLabel,
  fetchDatasetValues,
} from "./eurostat-client.js";

class DatasetPlot extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id="plot"></div>
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

  async render() {
    const resp = await fetch(`./${this.datasetId}.json`);
    const {
      details: { dimensions },
    } = await resp.json();

    const categoriesPerDimension = Object.fromEntries(
      dimensions.map(({ code, positions }) => {
        // By default, we'll display values for a few objects across the timescale.
        // Trim all other dimensions.
        //
        // TODO: add user controls to select interesting categories.
        if (code !== "TIME") {
          positions.splice(2);
        }

        return [code, positions.map((pos) => pos.code)];
      })
    );

    // Some dimensions specify a single category - either because
    // only one exists in Eurostat (e.g. Frequency is usually only Annual),
    // or because of user selection.
    // The view can use this information to display such dimensions differently,
    // e.g. by excluding it from legend entries.
    const singletonDimensions = new Set(
      Object.entries(categoriesPerDimension)
        .filter(([_code, categories]) => categories.length == 1)
        .map(([code, _]) =>
          // API response for measurements uses lowercase dimension ids.
          code.toLowerCase()
        )
    );

    const measurements = await fetchDatasetValues(
      this.datasetId,
      categoriesPerDimension
    );

    // Map a dimension index to code.
    const dimensionIndexToCode = measurements.id;

    // Map a category index to a human readable label.
    // Ordered by dimension.
    const categoryIndexToLabelPerDimension = measurements.id.map((dimId) =>
      indexToLabel(measurements.dimension[dimId])
    );

    // Convert a raw key (i.e. a set of ordered indices) to a human readable string.
    function rawKeyToString(key) {
      return (
        key
          .map((k, i) => {
            const isSingletonDimension = singletonDimensions.has(
              dimensionIndexToCode[i]
            );
            return isSingletonDimension
              ? undefined
              : categoryIndexToLabelPerDimension[i](k);
          })
          // Redundant labels are mapped to undefined.
          .filter((label) => !!label)
          .join("-")
      );
    }

    // Time dimension is a bit special. Items are grouped by all categories
    // *except* time. After grouping, it's included in the value, not the key.
    const timeDimensionIndex = measurements.id.indexOf("time");

    const data = groupByDimensions(measurements).flatMap(({ key, values }) => {
      const keyLabel = rawKeyToString(key);
      return values.map((v, i) => ({
        key: keyLabel,
        // Convert to a Date object representing the beginning of the year.
        time: new Date(
          categoryIndexToLabelPerDimension[timeDimensionIndex](i),
          0
        ),
        value: measurements.value[v],
      }));
    });

    const plot = Plot.plot({
      color: { legend: true },
      marks: [
        Plot.ruleY([0]),
        Plot.lineY(data, {
          x: "time",
          y: "value",
          stroke: "key",
        }),
      ],
    });

    // Render.
    const div = document.querySelector("#plot");
    div.append(plot);
  }
}

customElements.define("dataset-plot", DatasetPlot);
