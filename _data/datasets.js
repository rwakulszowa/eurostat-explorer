const EleventyFetch = require("@11ty/eleventy-fetch");
const xml2js = require("xml2js");
const { sortBy } = require("lodash");

module.exports = async function () {
  // List of all datasets.
  const url =
    "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/dataflow/ESTAT/all?detail=allstubs";
  const resp = await EleventyFetch(url, {
    duration: "1w",
    type: "text",
  });

  const parser = new xml2js.Parser();
  const tree = await parser.parseStringPromise(resp);

  const dataflows =
    tree["m:Structure"]["m:Structures"][0]["s:Dataflows"][0]["s:Dataflow"];

  // Log the structure, just to make debugging easier.
  console.log(JSON.stringify(dataflows.slice(0, 5)));

  // Pick interesting data.
  return sortBy(
    dataflows
      .map((x) => ({
        id: x.$.id,
        description: x["c:Name"].find((x) => x.$["xml:lang"] === "en")._,
      }))
      // Limit the size while the page is under development.
      .slice(0, 150),
    "id"
  );
};
