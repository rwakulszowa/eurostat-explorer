import { parseDate } from "./parseUtils";

/**
 * Categories to fetch.
 * A single dataset may be divided into multiple dimensions and each dimension
 * consists of multiple categories. Fetching the whole dataset at once is slow (and
 * sometimes impossible). In practice, a single request will typically fetch data
 * for a subset of all categories.
 */
export type Categories = Map<string, Array<string>>;

/**
 * Dataset identifier.
 */
export type DatasetId = string;

/**
 * JSON object returned by the API.
 * This is a subset of all information. Some fields have been omitted.
 */
export type DatasetDataRaw = {
  label: string;
  // Actual values are stored in a flat array with missing fields.
  // Combine with dimensions to get a specific value.
  value: number[];
  id: string[];
  // Extra information about the reading. See `DatasetExtensionRaw.status`.
  status: string[];
  // Size of each dimension.
  size: number[];
  // Dimensions keyed by short code.
  dimension: { [key: string]: DatasetDataDimensionRaw };
  // Extra metadata.
  extension: DatasetDataExtensionRaw;
};

/**
 * Single dimension.
 * In short - a list of categories.
 */
export type DatasetDataDimensionRaw = {
  label: string;
  // Categories are provided as 2 separate objects with the
  // exact same sets of keys. ¯\_(ツ)_/¯
  category: {
    index: { [key: string]: number };
    label: { [key: string]: string };
  };
};

/**
 * Extra metadata.
 */
export type DatasetDataExtensionRaw = {
  // Metadata - observation time bounds, update time, etc.
  annotation: { type: string; title: string }[];
  // Labels for `status` ids.
  status: { label: { [key: string]: string } };
};

/**
 * Fetch values for a dataset.
 * `categoriesPerDimension` is a set of filters - some datasets are massive and fetching all
 * data is either impractical or impossible. Use this argument to specify the subset of data
 * you're interested in.
 */
export async function fetchDataset(
  dataset: DatasetId,
  categoriesPerDimension: Categories,
): Promise<DatasetDataRaw> {
  const url = buildQuery(dataset, categoriesPerDimension);
  const resp = await fetch(url);
  return await resp.json();
}

/**
 * Given a dataset and its dimensions, generate a query.
 * Based on https://ec.europa.eu/eurostat/web/query-builder/tool
 */
function buildQuery(
  dataset: DatasetId,
  categoriesPerDimension: Categories,
): string {
  const searchParams = new URLSearchParams();
  searchParams.append("format", "JSON");

  // Add all dimensions to the query string.
  for (const [dimName, dimValues] of categoriesPerDimension.entries()) {
    for (const value of dimValues) {
      searchParams.append(dimName, value);
    }
  }

  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${dataset}?${searchParams}`;
}

/**
 * Parse Eurostat API funny format, with values separated from dimensions,
 * into a verbose list of key-value pairs.
 *
 * Row dimensions and categories use ids, not labels, for consistency.
 * id -> label mapping is returned as a separate object.
 */
export function parseDatasetValues(data: DatasetDataRaw): {
  rows: Array<{}>;
  idToLabel: Map<string, { label: string; cat: Map<string, any> }>;
} {
  const totalSize = data.size.reduce((x, y) => x * y, 1);
  const categories = indexToCategories(data.size);

  const dimensions: Array<[string, ReturnType<typeof parseValuesDimension>]> =
    data.id.map((dimId) => [
      dimId,
      parseValuesDimension(data.dimension[dimId], dimId),
    ]);

  const rows = Array(totalSize)
    .fill(null)
    .map((_, valueI) => {
      const ret = {};
      const value = data.value[valueI];

      // (dimId, catId) pairs.
      const labeledCategories: Array<[string, any]> = categories[valueI].map(
        (catI, dimI) => {
          const [dimId, dim] = dimensions[dimI];
          const cat = dim.categories[catI];
          return [dimId, cat.id];
        },
      );

      const entries = labeledCategories;
      entries.push(["value", value]);
      return Object.fromEntries(entries);
    });

  const idToLabel = new Map(
    dimensions.map(([dimId, dim]) => {
      const { label: dimLabel, categories } = dim;
      const cat = new Map(categories.map((cat) => [cat.id, cat.label]));

      return [dimId, { label: dimLabel, cat }];
    }),
  );

  return { rows, idToLabel };
}

/**
 * Parse Eurostat API dimension into a more JS friendly object.
 * `rawDimension` is keyed by id. The result is keyed by index.
 *
 * Where applicable, categories are converted to more specific types (e.g. Date).
 */
function parseValuesDimension(
  rawDimension: DatasetDataDimensionRaw,
  dimId: string,
): { label: string; categories: Array<{ id: string; label: any }> } {
  const { label, category } = rawDimension;

  // Choose a label mapping function depending on the dimension.
  const mapLabel =
    {
      time: parseDate as any,
    }[dimId] ?? ((x: any) => x);

  const categories: Array<{ id: string; label: string }> = [];
  for (const [catId, catIndex] of Object.entries(category.index)) {
    const catLabel = category.label[catId];
    categories[catIndex] = { id: catId, label: mapLabel(catLabel) };
  }
  return { label, categories };
}

/**
 * Precompute an array mapping flat indices to per-dimension category indices.
 */
function indexToCategories(dimSizes: Array<number>): Array<Array<number>> {
  // Precomputed dimension coefficients.
  // All we need to later map indices to categories quickly.
  const coeffs: Array<{ mul: number; mod: number }> = [];

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

  // Produce an array with category indices precalculated.
  const totalSize = dimSizes.reduce((x, y) => x * y, 1);
  return Array(totalSize)
    .fill(null)
    .map((_, index) =>
      coeffs.map((coef) => {
        // Trim data describing previous dimensions.
        const quotient = Math.floor(index / coef.mul);
        return quotient % coef.mod;
      }),
    );
}
