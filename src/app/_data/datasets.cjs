const EleventyFetch = require("@11ty/eleventy-fetch");
const xml2js = require("xml2js");

module.exports = async function () {
  const datasets = await fetchDatasetsList();
  console.log(
    `Fetched ${datasets.length} datasets: ${datasets.slice(0, 5)}...`,
  );

  const details = await Promise.all(datasets.slice(0, 1000).map(fetchDetails));
  console.log(`Fetched details`, details[0]);

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
