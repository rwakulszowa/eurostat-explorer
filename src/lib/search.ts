import { max, range, sortBy, sortedIndexBy, sortedLastIndexBy } from "lodash";

type Keyword = string;
type DatasetId = string;
type IndexItem = [Keyword, Array<DatasetId>];
export type Index = Array<IndexItem>;

/**
 * Remove redundant information from a query string.
 * Index assumes lowercase input and ignores redundant whitespace.
 */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().split(/\s+/).join(" ");
}

export function search(index: Index, query: string): Array<DatasetId> {
  const words = query.split(/\s+/);

  // Return a union of all searches.
  // Individual search results are sorted most-relevant-first.
  // Sum indices of each item in individual searches and order results by that.
  // Items that don't appear in all searches are removed.
  const wordResults = words.map((w) => searchSingleWord(index, w));
  return unSearchPriority(
    wordResults.map(makeSearchPriority).reduce(unionSearchPriority),
  );
}

type SearchPriority = { [key: string]: number };

function makeSearchPriority(xs: string[]): SearchPriority {
  return Object.fromEntries(xs.map((x, i) => [x, i]));
}

function unionSearchPriority(
  x: SearchPriority,
  y: SearchPriority,
): SearchPriority {
  for (const key in x) {
    const valueY = y[key];
    if (valueY === undefined) {
      delete x[key];
    } else {
      x.key + valueY;
    }
  }
  return x;
}

function unSearchPriority(x: SearchPriority): Array<string> {
  return sortBy(Object.entries(x), (x) => x[1]).map((x) => x[0]);
}

/**
 * Flatten an array of items, picking 0'th elements first, then 1st, etc.
 */
function flattenQueue<T>(xs: Array<Array<T>>): Array<T> {
  const seen: Set<T> = new Set();
  const ret: Array<T> = [];
  const maxLen = max(xs.map((x) => x.length));
  for (const i of range(0, maxLen)) {
    for (const x of xs) {
      if (x.length > i) {
        const el = x[i];
        if (!seen.has(el)) {
          seen.add(el);
          ret.push(el);
        }
      }
    }
  }
  return ret;
}

function searchSingleWord(index: Index, query: string): Array<DatasetId> {
  function cmp(x: IndexItem) {
    const k = x[0].substring(0, query.length);
    return k;
  }
  // `cmp` is invoked on the query argument, first.
  // Wrap it in a pair to match the expected type.
  const wrappedQuery: IndexItem = [query, []];
  const lo = sortedIndexBy(index, wrappedQuery, cmp);
  const hi = sortedLastIndexBy(index, wrappedQuery, cmp);
  return flattenQueue(index.slice(lo, hi).map((x) => x[1]));
}
