import {
  fetchDataset,
  parseDatasetValues,
  type Categories,
  type DatasetId,
} from "./eurostat-api";
import { yearToDate } from "./parseUtils";

type FetchReturn = {
  rows: Array<{}>;
  idToLabel: Map<string, { label: string; cat: Map<string, any> }>;
};

// Reexport.
export { Categories };

/**
 * Interface for eurostat clients.
 */
export interface EurostatClient {
  /**
   * Fetch data for `categories` from `datasetId`.
   */
  fetch(datasetId: DatasetId, categories: Categories): Promise<FetchReturn>;
}

/**
 * Client talking to the Eurostat API.
 */
export class HttpEurostatClient implements EurostatClient {
  async fetch(
    datasetId: DatasetId,
    categories: Categories,
  ): Promise<FetchReturn> {
    const data = await fetchDataset(datasetId, categories);
    return parseDatasetValues(data);
  }
}

/**
 * Fake client for testing. Returns random data.
 */
export class FakeEurostatClient implements EurostatClient {
  fetch(datasetId: DatasetId, categories: Categories): Promise<FetchReturn> {
    return this.fetch_(categories);
  }

  private async fetch_(categories: Categories) {
    // Random delay.
    function sleep() {
      const ms = Math.round(Math.random() * 4000);
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    await sleep();

    // For consistency, use strings for every dimension.
    const years = Array(10)
      .fill(null)
      .map((_, i) => (2000 + i).toString());
    const freqs = ["A"];
    const geos = ["UK", "FR", "DE", "PL", "CZ", "SK", "HU"];
    const itm_newas = ["40000", "41000", "42000"];
    const allRows: Array<{}> = [];
    for (const freq of freqs) {
      for (const time of years) {
        for (const geo of geos) {
          for (const itm_newa of itm_newas) {
            const value = Math.floor(Math.random() * 100);
            allRows.push({
              freq,
              time,
              geo,
              value,
              itm_newa,
            });
          }
        }
      }
    }

    const idToLabel = new Map([
      [
        "freq",
        { label: "Time frequency", cat: new Map(freqs.map((f) => [f, f])) },
      ],
      ["geo", { label: "Geo", cat: new Map(geos.map((g) => [g, g])) }],
      [
        "itm_newa",
        { label: "ItmNewa", cat: new Map(itm_newas.map((x) => [x, x])) },
      ],
      [
        "time",
        {
          label: "Time",
          cat: new Map(years.map((y) => [y, yearToDate(parseInt(y))])),
        },
      ],
    ]);

    // Remove unwanted categories.
    for (const [dimId, { cat }] of idToLabel) {
      for (const catId of cat.keys()) {
        const maybeSelectedCategories = categories.get(dimId);
        if (!maybeSelectedCategories) {
          // Noop.
          // If a dimension is not listed in `categories`, we pick all items.
        } else {
          // Pick a selected subset.
          if (!maybeSelectedCategories.includes(catId)) {
            cat.delete(catId);
          }
        }
      }
    }

    // Remove unwanted rows.
    const rows = allRows.filter((r) => {
      for (const [dim, selectedCategories] of categories.entries()) {
        const cat = r[dim];
        if (!selectedCategories.includes(cat)) {
          return false;
        }
      }
      return true;
    });

    return { rows, idToLabel };
  }
}

/**
 * Eurostat client communicating through a web worker.
 */
export class WorkerClient implements EurostatClient {
  private worker: Worker;
  private pending: Map<number, (rows: {}[]) => void>;

  constructor(worker: Worker) {
    if (worker.onmessage) {
      throw new Error(`Worker 'onmessage' already bound.`);
    }
    this.pending = new Map();
    this.worker = worker;
    worker.onmessage = (e: MessageEvent<{ id: number; data: Array<{}> }>) => {
      const {
        data: { id, data },
      } = e;
      const resolve = this.pending.get(id)!;
      this.pending.delete(id);
      resolve(data);
    };
  }

  /**
   * Fetch data through a web worker.
   */
  fetch(datasetId: string, categories: Categories): Promise<FetchReturn> {
    const requestId = Math.random();

    // Build a new pending promise and save a reference to its resolver.
    // It will be invoked when worker replies with the given id.
    const promise = new Promise((resolve) => {
      this.pending.set(requestId, resolve);
    });

    // Invoke the worker.
    this.worker.postMessage({
      id: requestId,
      payload: { datasetId, categories },
    });

    return promise as any;
  }
}
