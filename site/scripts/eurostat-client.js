// TODO: uprościć, wynieść do biblioteki z testami, pozbyć się zabawy z indeksami.
// Also, przerobić na TS.
// Całość to po prostu tabelka, a logika jest potrzebna tylko do grupowania i sortowania wymiarów.
/**
 * Fetch values for a dataset.
 * `categoriesPerDimension` is a set of filters - some datasets are massive and fetching all
 * data is either impractical or impossible. Use this argument to specify the subset of data
 * you're interested in.
 */
export async function fetchDatasetValues(dataset, categoriesPerDimension) {
  const url = buildQuery(dataset, categoriesPerDimension);
  const resp = await fetch(url);
  return await resp.json();
}

/**
 * Given a dataset and its dimensions, generate a query.
 * Based on https://ec.europa.eu/eurostat/web/query-builder/tool
 */
function buildQuery(dataset, categoriesPerDimension) {
  const searchParams = new URLSearchParams();
  searchParams.append("format", "JSON");

  // Add all dimensions to the query string.
  for (const [dimName, dimValues] of Object.entries(categoriesPerDimension)) {
    for (const value of dimValues) {
      searchParams.append(dimName, value);
    }
  }

  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${searchParams}`;
}

/**
 * Group `xs` by comparing the strning represenatation of `key(x)`.
 */
function groupBy(xs, key) {
  const ret = [];
  const keyToIndex = {};

  for (const x of xs) {
    const k = key(x);

    let i = keyToIndex[k];

    if (i === undefined) {
      // New key.
      const entry = { key: k, values: [x] };
      i = ret.push(entry) - 1;
      keyToIndex[k] = i;
    } else {
      // Existing key.
      ret[i].values.push(x);
    }
  }

  return ret;
}

/**
 * Build a function that, given an index, tells which categories it belongs do.
 *
 * Everything operates on indices only.
 * All business logic (e.g. filtering out dimensions, mapping them to human readable
 * ids) is to be handled by the caller.
 *
 * A dimension is a set of categories.
 */
function mapDimensions(dimSizes) {
  // Precomputed dimension coefficients.
  // All we need to later map indices to categories quickly.
  const coeffs = [];

  // Aggregated multiplier for the current dimension.
  let mul = 1;
  for (const dimSize of dimSizes.reverse()) {
    const coef = {
      mul,
      mod: dimSize,
    };
    coeffs.push(coef);

    // The next dimension will take all previous dimension sizes into account.
    mul *= dimSize;
  }
  coeffs.reverse();

  // Map a single index to all categories.
  return function indexToCategories(index) {
    return coeffs.map((coef) => {
      // Trim data describing previous dimensions.
      const quotient = Math.floor(index / coef.mul);
      return quotient % coef.mod;
    });
  };
}

export function groupByDimensions(data) {
  const totalSize = data.size.reduce((x, y) => x * y, 1);
  const indexToDims = mapDimensions(data.size);

  // Time dimension will be used to group values.
  const timeDimIndex = data.id.indexOf("time");

  /**
   * Meaningful indices. Everything but the time index.
   */
  function omitTime({ dims }) {
    const ret = [...dims];
    // Simply replace the value at time index with null to ignore it when grouping.
    ret[timeDimIndex] = null;
    return ret;
  }

  // Indices per category.
  // Time is ignored when grouping - all items differing only by the time dimension
  // are put in the same bucket.
  const grouped = groupBy(
    Array(totalSize)
      .fill(null)
      .map((_, i) => ({ dims: indexToDims(i), i })),
    omitTime
  );

  // Drop redundant information.
  // Dimensions (except the time dimension) have been hoisted to the key - no need to store them
  // again in the value.
  // The only dimension left if time, but its index is already stored in the array index.
  return grouped.map(({ key, values }) => ({
    key,
    values: values.map((x) => x.i),
  }));
}

export function indexToLabel(dimension) {
  const indexToKey = Object.fromEntries(
    Object.entries(dimension.category.index).map(([k, v]) => [v, k])
  );
  const keyToLabel = dimension.category.label;

  return function indexToLabel(index) {
    return keyToLabel[indexToKey[index]];
  };
}
