const EleventyFetch = require("@11ty/eleventy-fetch");
const xml2js = require("xml2js");

module.exports = async function () {
  const datasets = await fetchDatasetsList();
  console.log(
    `Fetched ${datasets.length} datasets: ${datasets.slice(0, 5)}...`,
  );

  const details = await Promise.all(datasets.slice(0, 10).map(fetchDetails));
  console.log(`Fetched details`, details[0]);

  for (const d of details) {
    d._preprocessed = preprocess(d);
  }

  return details;
};

/**
 * Fetch a list of all available datasets.
 */
async function fetchDatasetsList() {
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/dataflow/ESTAT/all?detail=allstubs";
  const body = await EleventyFetch(url, { duration: "1w", type: "text" });

  // Data is returned in XML format.
  const parser = new xml2js.Parser();
  const tree = await parser.parseStringPromise(body);

  // Unpack the structure.
  // Learned the hard way.
  const datasets = tree["m:Structure"]["m:Structures"][0]["s:Dataflows"][0][
    "s:Dataflow"
  ].map((x) =>
    // Some Eurostat APIs actually expect a lowercase id, so let's map it right away.
    x.$.id.toLowerCase(),
  );

  // Some datasets contain a `$` and always return a 404.
  // Filter them right away.
  const { allowed, rejected } = datasets.reduce(
    (acc, x) => {
      if (x.includes("$")) {
        acc.rejected.push(x);
      } else {
        acc.allowed.push(x);
      }
      return acc;
    },
    {
      allowed: [],
      rejected: [],
    },
  );

  if (rejected) {
    console.warn(`Rejected ${rejected.length} datasets containing a $ sign.`);
  }

  return allowed.sort();
}

/**
 * Fetch details about a dataset - description, update date and schema.
 */
async function fetchDetails(dataset) {
  const url = `https://ec.europa.eu/eurostat/search-api/datasets/${dataset}/languages/en`;
  const body = await EleventyFetch(url, { duration: "1w", type: "json" });

  // Convert dimension ids to lowercase for consistency.
  // Eurostat mixes both formats.
  for (const dim of body.dimensions) {
    dim.code = dim.code.toLowerCase();
  }

  return body;
}

/**
 * Group dataset dimensions into chart-friendly subsets.
 */
function preprocess(datasetDetails) {
  const { dimensions } = datasetDetails;

  function getDim(code) {
    const dim = dimensions.find((x) => x.code === code);
    if (!dim) {
      throw new Error(`"${code}" dimension not found`);
    }
    return dim;
  }

  // X and Z dimensions are always the same.
  // Y dimension is fetched from the API dynamically.
  const x = getDim("time");
  const z = filterGeo(getDim("geo"));

  // All other dimensions will be combined using a cartesian product, one item at a time.
  const rest = cartesian(
    dimensions
      .filter((d) => d.code !== "time" && d.code !== "geo")
      .map(flattenDim),
  );

  // Produce one item per `rest`. It defines the number of charts to display.
  return rest.map((r) => ({
    x,
    z,
    rest: r,
    categories: buildQueryParams(
      [].concat(
        x.positions.map((p) => [x.code, p.code]),
        z.positions.map((p) => [z.code, p.code]),
        r.map((r) => [r.dim, r.cat]),
      ),
    ),
  }));
}

function buildQueryParams(kvs) {
  const ret = new URLSearchParams();
  for (const [k, v] of kvs) {
    ret.append(k, v);
  }
  return ret;
}

/**
 * Geo dimenion often contains aggregates (such as EU as of year 1234).
 * They make the charts look unreadable, so we filter them out.
 */
function filterGeo(geoDim) {
  return {
    ...geoDim,
    positions: geoDim.positions.filter(
      (d) => !d.code.startsWith("EU") && !d.code.startsWith("EA"),
    ),
  };
}

function flattenDim(dim) {
  const { code: dimCode, description: dimDescription, positions } = dim;
  return positions.map((pos) => ({
    dim: dimCode,
    dimDescription,
    cat: pos.code,
    catDescription: pos.description,
  }));
}

// Based on https://stackoverflow.com/a/43053803.
// Added a fix for singleton arguments.
function cartesian(rows) {
  return rows.reduce(
    (acc, xs) => acc.flatMap((a) => xs.map((x) => [...a, x])),
    [[]],
  );
}
