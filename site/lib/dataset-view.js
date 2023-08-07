import { Dimensions } from "./dimensions.js";

/**
 * Eurostat aware Dimensions.
 */
export class DatasetView {
  /**
   * Use the `build` method instead.
   */
  constructor(slicedDimensions) {
    this.slicedDimensions = slicedDimensions;
  }

  /**
   * Build an instance coupled with dataset descriptions, sliced at a given index.
   */
  static build(datasetDescription, sliceLength) {
    // Wrap dataset dimensions in a helper class.
    const dims = new Dimensions(
      datasetDescription.dimensions.map((d) => ({
        id: d.code,
        size: d.positions.length,
        dim: d,
      })),
    );

    // Reorder dimensions.
    // Put GEO and TIME last.
    // A smarter mechanism TBD.
    dims.reorder((x, y) => {
      if (x === "time") {
        return 1;
      }
      if (y === "time") {
        return -1;
      }
      if (x === "geo") {
        return 1;
      }
      if (y === "geo") {
        return -1;
      }
      return x.localeCompare(y);
    });

    const slicedDimensions = dims.slice(dims.length - sliceLength);
    return new DatasetView(slicedDimensions);
  }

  items() {
    const [leftKeys, rightKeys] = this.slicedDimensions.keys();

    // Precalculate key maps to avoid repetitive work in a loop.
    function unpackPartialKey(key) {
      return key.map((x) => {
        const dim = x.dim.dim;
        const cat = dim.positions[x.i];
        return { dim, cat, iCat: x.i };
      });
    }
    const [leftMap, rightMap] = [leftKeys, rightKeys].map(
      (keys) => new Map(keys.map((k) => [k, unpackPartialKey(k)])),
    );

    return leftKeys.map((left) => ({
      key: leftMap.get(left),
      items: rightKeys.map((right) => ({
        valueKey: this.slicedDimensions.restoreKey(left, right).map((x) => x.i),
        key: rightMap.get(right),
      })),
    }));
  }
}
