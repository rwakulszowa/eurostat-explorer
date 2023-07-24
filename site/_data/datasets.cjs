const EleventyFetch = require("@11ty/eleventy-fetch");
const xml2js = require("xml2js");
const { sortBy, compact } = require("lodash");

/**
 * Fetch a list of all available datasets.
 */
async function fetchDatasets() {
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/dataflow/ESTAT/all?detail=allstubs";
  const resp = await EleventyFetch(url, {
    duration: "1w",
    type: "text",
  });

  // Data is returned in XML format.
  const parser = new xml2js.Parser();
  const tree = await parser.parseStringPromise(resp);

  // Unpack the structure.
  // Learned the hard way.
  const datasets = tree["m:Structure"]["m:Structures"][0]["s:Dataflows"][0][
    "s:Dataflow"
  ].map((x) => ({
    // Some Eurostat APIs actually expect a lowercase id, so let's map it right away.
    id: x.$.id.toLowerCase(),
    description: x["c:Name"].find((x) => x.$["xml:lang"] === "en")._,
  }));

  // Some datasets contain a `$` and always return a 404.
  // Filter them right away.
  const { allowed, rejected } = datasets.reduce(
    (acc, x) => {
      if (x.id.includes("$")) {
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

  // Sort the data alphabetically.
  // The pagination plugin / some 11ty magic can probably do that out of the box, but
  // let's just sort it as soon as we get it to keep the result deterministic.
  return sortBy(allowed, "id");
}

/**
 * Fetch details about a dataset - description, update date and schema.
 */
async function fetchDetails(dataset) {
  const url = `https://ec.europa.eu/eurostat/search-api/datasets/${dataset}/languages/en`;
  const resp = await EleventyFetch(url, {
    duration: "1w",
    type: "json",
  });

  // Convert dimension ids to lowercase for consistency.
  // Eurostat mixes both formats.
  for (const dim of resp.dimensions) {
    dim.code = dim.code.toLowerCase();
  }

  return resp;
}

module.exports = async function () {
  const datasets = (await fetchDatasets())
    // Pick a subset of data while under development.
    .slice(0, 150);

  // For each dataset, fetch more details - description, update date and, most importantly, schema.
  const richDatasets = compact(
    await Promise.all(
      datasets.map(async (d) => {
        try {
          return {
            ...d,
            details: await fetchDetails(d.id),
          };
        } catch (e) {
          // Some datasets result in a 404. Let's just log and ignore them.
          if (e.toString().includes("Not Found")) {
            console.warn(`Failed to fetch dataset details. id=${d.id} e=${e}`);
            return null;
          } else {
            // Reraise other errors and fail the build.
            throw e;
          }
        }
      }),
    ),
  );

  return richDatasets;
};
