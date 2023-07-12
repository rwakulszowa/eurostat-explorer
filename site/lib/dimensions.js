// Based on https://stackoverflow.com/a/43053803.
// Added a fix for singleton arguments.
const cartesian = (coeffs) =>
  coeffs.reduce(
    (acc, xs) => acc.flatMap((a) => xs.map((x) => [...a, x])),
    [[]],
  );

export class Dimensions {
  constructor(dims) {
    // Current order to use when iterating over dimensions.
    this._order = dims.map((d) => d.id);

    // Dimension metadata, keyed by dimension id.
    this._dims = Object.fromEntries(dims.map((dim) => [dim.id, dim]));
  }

  reorder(key) {
    this._order.sort(key);
  }

  get length() {
    return this._order.length;
  }

  get dimensions() {
    return this._order.map((d) => this._dims[d]);
  }

  /**
   * Divide into two sets of keys - left and right.
   * When concatenated, they form a full key.
   */
  slice(at) {
    function allKeys(dims) {
      return cartesian(
        dims.map((dim) =>
          Array(dim.size)
            .fill()
            .map((_, i) => ({ i, dim })),
        ),
      );
    }

    const [leftDims, rightDims] = this._sliceIndices(at);
    return [allKeys(leftDims), allKeys(rightDims)];
  }

  /**
   * Slice dimension indices into groups, at `at`.
   */
  _sliceIndices(at) {
    const dims = this.dimensions;
    const left = dims.slice(0, at);
    const right = dims.slice(at);
    return [left, right];
  }
}
