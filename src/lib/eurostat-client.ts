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
 * Interface for eurostat clients.
 */
export interface EurostatClient {
  /**
   * Fetch data for `categories` from `datasetId`.
   */
  fetch(datasetId: DatasetId, categories: Categories): Promise<Array<{}>>;
}

/**
 * Fake client for testing. Returns random data.
 */
export class FakeEurostatClient implements EurostatClient {
  fetch(datasetId: DatasetId, categories: Categories): Promise<Array<{}>> {
    return this.fetch_(categories);
  }

  private async fetch_(categories: Categories) {
    function year(y: number) {
      return new Date(y, 0, 0);
    }

    const years = Array(10)
      .fill(null)
      .map((_, i) => year(2000 + i));
    const geos = ["UK", "FR", "DE", "PL"];
    const allRows: Array<{ year: Date; geo: string; value: number }> = [];
    for (const year of years) {
      for (const geo of geos) {
        const value = Math.floor(Math.random() * 100);
        allRows.push({ year, geo, value });
      }
    }

    return allRows.filter((r) => {
      for (const [dim, selectedCategories] of categories.entries()) {
        const cat = r[dim];
        if (!selectedCategories.includes(cat)) {
          return false;
        }
      }
      return true;
    });
  }
}
