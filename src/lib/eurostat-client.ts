import {
  fetchDataset,
  parseDatasetValues,
  type Categories,
  type DatasetId,
} from "./eurostat-api";

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
 * Client talking to the Eurostat API.
 */
export class HttpEurostatClient implements EurostatClient {
  async fetch(
    datasetId: DatasetId,
    categories: Categories,
  ): Promise<Array<{}>> {
    const data = await fetchDataset(datasetId, categories);
    return parseDatasetValues(data);
  }
}

/**
 * Fake client for testing. Returns random data.
 */
export class FakeEurostatClient implements EurostatClient {
  fetch(datasetId: DatasetId, categories: Categories): Promise<Array<{}>> {
    return this.fetch_(categories);
  }

  private async fetch_(categories: Categories) {
    // Random delay.
    function sleep() {
      const ms = Math.round(Math.random() * 4000);
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    await sleep();

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
  fetch(datasetId: string, categories: Categories): Promise<{}[]> {
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
