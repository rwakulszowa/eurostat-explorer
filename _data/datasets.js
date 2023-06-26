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

  // Sort the data alphabetically.
  // The pagination plugin / some 11ty magic can probably do that out of the box, but
  // let's just sort it as soon as we get it to keep the result deterministic.
  return sortBy(datasets, "id");
}

/**
 * Fetch details about a dataset - description, update date and schema.
 */
async function fetchDetails(dataset) {
  const url = `https://ec.europa.eu/eurostat/search-api/datasets/${dataset}/languages/en`;
  return EleventyFetch(url, {
    duration: "1w",
    type: "json",
  });
}

/**
 * Fetch measurements for a dataset.
 */
async function fetchMeasurements(dataset) {
  const dimensions = Object.fromEntries(
    dataset.details.dimensions.map((dim) => [
      dim.code,
      dim.positions.map((pos) => pos.code),
    ])
  );
  const url = buildQuery(dataset.id, dimensions);
  return await EleventyFetch(url, {
    duration: "1w",
    type: "json",
  });
}

/**
 * Given a dataset and its dimensions, generate a query.
 * Based on https://ec.europa.eu/eurostat/web/query-builder/tool
 *
 * TODO: extract to a separate library
 */
function buildQuery(datasetId, dimensions) {
  const searchParams = new URLSearchParams();
  searchParams.append("format", "JSON");

  // Add all dimensions to the query string.
  for (const [dimName, dimValues] of Object.entries(dimensions)) {
    for (const value of dimValues) {
      searchParams.append(dimName, value);
    }
  }

  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${datasetId}?${searchParams}`;
}

module.exports = async function () {
  const datasets = (await fetchDatasets())
    // Pick a subset of data while under development.
    .slice(10, 15);

  // For each dataset, fetch more details - description, update date and, most importantly, schema.
  const richDatasets = compact(
    await Promise.all(
      datasets.map(async (d) => {
        try {
          const details = await fetchDetails(d.id);
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
      })
    )
  );

  // For each dataset, fetch measured values.
  const datasetsWithMeasurements = await Promise.all(
    richDatasets.map(async (d) => ({
      ...d,
      measurements: await fetchMeasurements(d),
    }))
  );

  return datasetsWithMeasurements;
};
