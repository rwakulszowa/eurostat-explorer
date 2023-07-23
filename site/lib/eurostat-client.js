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
export function buildQuery(dataset, categoriesPerDimension) {
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
 * Parse Eurostat API funny format, with values separated from dimensions,
 * into a verbose list of key-value pairs.
 */
export function parse(data) {
  const totalSize = data.size.reduce((x, y) => x * y, 1);
  const categories = indexToCategories(data.size);

  const dimensions = data.id.map((dimId) =>
    parseDimension(data.dimension[dimId], dimId),
  );

  return Array(totalSize)
    .fill(null)
    .map((_, valueI) => {
      const labeledCategories = categories(valueI).map(
        (catI, dimI) => dimensions[dimI].categories[catI].id,
      );
      const value = data.value[valueI];
      return { categories: labeledCategories, value };
    });
}

/**
 * Parse Eurostat API dimension into a more JS friendly object.
 * `rawDimension` is keyed by id. The result is keyed by index.
 *
 * Where applicable, categories are converted to more specific types (e.g. Date).
 */
export function parseDimension(rawDimension, dimId) {
  const { label, category } = rawDimension;

  // Choose a label mapping function depending on the dimension.
  const mapLabel =
    {
      time: (y) => new Date(y, 0, 0),
    }[dimId] ?? ((x) => x);

  const categories = [];
  for (const [catId, catIndex] of Object.entries(category.index)) {
    const catLabel = category.label[catId];
    categories[catIndex] = { id: catId, label: mapLabel(catLabel) };
  }
  return { label, categories };
}

/**
 * Build a function that, given an index, tells which categories it belongs do.
 *
 * Everything operates on indices only.
 * All business logic (e.g. filtering out dimensions, mapping them to human readable
 * ids) is to be handled by the caller.
 */
function indexToCategories(dimSizes) {
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

/**
 * Build a function that, given an ordered list of category indices, tells us the value index
 * in Eurostat format.
 *
 * TODO: test - validate it's a reverse of indexToCategories
 */
export function categoriesToIndex(dimSizes, categories) {
  let ret = 0;
  for (const i in categories) {
    const cat = categories[i];
    const dimSize = dimSizes[i];
    ret *= dimSize;
    ret += cat;
  }
  return ret;
}