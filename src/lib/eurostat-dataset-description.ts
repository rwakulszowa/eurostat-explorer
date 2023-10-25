/**
 * Dataset description utilities.
 *
 * Contains all dimensions and categories available in a dataset, plus some metadata.
 */

export type DatasetDescription = {
  code: string;
  title: string;
  dimensions: Array<DatasetDescriptionDimension>;
};

export type DatasetDescriptionDimension = {
  code: string;
  description: string;
  positions: Array<DatasetDescriptionCategory>;
};

export type DatasetDescriptionCategory = {
  code: string;
  description: string;
};

/**
 * Dataset details (as fetched from the Eurostat API) are made available locally.
 * There's a tiny bit of overlap - the same data is fetched both during build time
 * as well as at runtime, but it's the least awkward solution, at least for now.
 *
 * Once proper dataset navigation is implemented, we may be able to scrape all data
 * from HTML.
 */
export async function fetchDatasetDescription(
  url: URL,
): Promise<DatasetDescriptionView> {
  const response = await fetch(url);
  const data = await response.json();
  return new DatasetDescriptionView(data);
}

export class DatasetDescriptionView {
  readonly datasetDescription: DatasetDescription;

  constructor(datasetDescription: DatasetDescription) {
    this.datasetDescription = datasetDescription;
  }

  /**
   * Find a dimension.
   */
  find(dim: string): DatasetDescriptionDimension | undefined {
    return this.datasetDescription.dimensions.find((x) => x.code === dim);
  }

  get dims(): Array<DatasetDescriptionDimension> {
    return this.datasetDescription.dimensions;
  }

  /**
   * Produce a cartesian product of categories.
   *
   * @param {Array<string>} omit - dimensions to omit from the product.
   */
  spread(
    omit: Array<string>,
  ): Array<
    Array<{ dim: DatasetDescriptionDimension; cat: DatasetDescriptionCategory }>
  > {
    const cols = this.select(new Set(omit)).map((dim) =>
      dim.positions.map((cat) => ({
        dim,
        cat,
      })),
    );
    return cartesian(cols);
  }

  /**
   * Select a subset of the dataset.
   */
  private select(omit: Set<string>): DatasetDescription["dimensions"] {
    const allDims = new Set(
      this.datasetDescription.dimensions.map((d) => d.code),
    );

    // Check whether `dim` is in `omit`.
    function omitFilter(dim: DatasetDescriptionDimension): boolean {
      const dimCode = dim.code;
      if (!allDims.has(dimCode)) {
        throw new Error(`Omitting an unknown dimension: ${dimCode}`);
      }

      return !omit.has(dimCode);
    }

    return this.datasetDescription.dimensions.filter(omitFilter);
  }
}

// Based on https://stackoverflow.com/a/43053803.
// Added a fix for singleton arguments.
function cartesian<A>(rows: Array<Array<A>>): Array<Array<A>> {
  return rows.reduce(
    (acc: A[][], xs: A[]) => acc.flatMap((a) => xs.map((x) => [...a, x])),
    [[]],
  );
}
