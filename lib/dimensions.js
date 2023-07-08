export function foo() {
  return 42;
}

export class Dimensions {
  constructor(dims) {
    // Current order to use when iterating over dimensions.
    this._order = dims.map((d) => d.id);

    // Dimension metadata, keyed by dimension id.
    this._dims = Object.fromEntries(dims.map((dim) => [dim.id, dim.size]));
  }

  reorder(key) {
    this._order.sort(key);
  }

  get length() {
    return this._order.length;
  }

  /**
   * Iterate over the thing, one dimension at a time.
   * Produces a tree.
   */
  values() {
    if (this.length === 0) {
      return null;
    }

    // Avoid JS `this` quirks, capture a local variable instead.
    const ref = this;

    function inner(dimIndex) {
      const dim = ref._order[dimIndex];
      const dimSize = ref._dims[dim];
      const isLastDim = dimIndex === ref.length - 1;
      if (isLastDim) {
        return Array(dimSize)
          .fill()
          .map((_, i) => ({ i, dim }));
      } else {
        const children = inner(dimIndex + 1);
        return Array(dimSize)
          .fill()
          .map((_, i) => ({ i, dim, children }));
      }
    }

    return inner(0);
  }
}
