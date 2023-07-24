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

    // Original dims ordering.
    // Allows rebuilding a key in the original format, regardless of current ordering.
    this._originalOrder = dims.map((d) => d.id);

    // Reordering from original order to current order.
    // Recalculated on every reordering.
    this._reordering = ordering(this._order, this._originalOrder);

    // Dimension metadata, keyed by dimension id.
    this._dims = Object.fromEntries(dims.map((dim) => [dim.id, dim]));
  }

  reorder(key) {
    this._order.sort(key);
    this._reordering = ordering(this._order, this._originalOrder);
  }

  get length() {
    return this._order.length;
  }

  get dimensions() {
    return this._order.map((d) => this._dims[d]);
  }

  /**
   * Slice into left and right parts.
   */
  slice(at) {
    return new SlicedDimensions(this, at);
  }

  /**
   * Convert a key back to original ordering.
   */
  unorder(key) {
    return this._reordering.map((i) => key[i]);
  }
}

/**
 * Dimensions that have been sliced in parts.
 */
export class SlicedDimensions {
  constructor(dims, sliceIndex) {
    this.dims = dims;
    this.sliceIndex = sliceIndex;
  }

  /**
   * Divide into two sets of keys - left and right.
   * When concatenated, they form a full key.
   */
  keys() {
    const [leftDims, rightDims] = this._sliceIndices();
    return [allKeys(leftDims), allKeys(rightDims)];
  }

  restoreKey(left, right) {
    return this.dims.unorder(left.concat(right));
  }

  leftDims() {
    return this.dims.dimensions.slice(0, this.sliceIndex);
  }

  rightDims() {
    return this.dims.dimensions.slice(this.sliceIndex);
  }

  /**
   * Slice dimension indices into groups, at `at`.
   */
  _sliceIndices() {
    const dims = this.dims.dimensions;
    const left = dims.slice(0, this.sliceIndex);
    const right = dims.slice(this.sliceIndex);
    return [left, right];
  }
}

function allKeys(dims) {
  return cartesian(
    dims.map((dim) =>
      Array(dim.size)
        .fill()
        .map((_, i) => ({ i, dim })),
    ),
  );
}

/**
 * Mapping from `src` order to `dst` order.
 * Can be used to sort in O(n).
 */
function ordering(src, dst) {
  const srcOrdering = Object.fromEntries(src.map((x, i) => [x, i]));
  return dst.map((x) => srcOrdering[x]);
}
