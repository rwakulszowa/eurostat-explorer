import { search, Index } from "./search";

/**
 * Interface for dataset search clients.
 */
export interface SearchClient {
  search(query: string): Promise<Array<string>>;
}

export class BasicSearchClient implements SearchClient {
  private index: Promise<Index>;

  constructor(indexPath: string) {
    this.index = fetch(indexPath)
      .then((resp) => resp.json())
      .then(this.decodeRawIndex);
  }

  private decodeRawIndex(rawIndex: {
    datasetIds: Array<string>;
    searchIndex: Array<[string, Array<number>]>;
  }): Index {
    const { datasetIds, searchIndex } = rawIndex;
    return searchIndex.map(([keyword, datasetIxs]) => [
      keyword,
      datasetIxs.map((i) => datasetIds[i]),
    ]);
  }

  async search(query: string): Promise<Array<string>> {
    return search(await this.index, query);
  }
}

export class WorkerSearchClient implements SearchClient {
  private worker: Worker;
  private pending: Map<number, (data: Array<string>) => void>;

  constructor(worker: Worker) {
    if (worker.onmessage) {
      throw new Error(`Worker 'onmessage' already bound.`);
    }
    this.pending = new Map();
    this.worker = worker;
    worker.onmessage = (
      e: MessageEvent<{ id: number; data: Array<string> }>,
    ) => {
      const {
        data: { id, data },
      } = e;
      const resolve = this.pending.get(id)!;
      this.pending.delete(id);
      resolve(data);
    };
  }

  /**
   * Search through a web worker.
   */
  async search(query: string): Promise<Array<string>> {
    const requestId = Math.random();

    // Build a new pending promise and save a reference to its resolver.
    // It will be invoked when worker replies with the given id.
    const promise = new Promise((resolve) => {
      this.pending.set(requestId, resolve);
    });

    // Invoke the worker.
    this.worker.postMessage({
      id: requestId,
      payload: { query },
    });

    return promise as any;
  }
}
