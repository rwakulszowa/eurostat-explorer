import fs from "fs";
import { XMLParser } from "fast-xml-parser";

const filename = "assets/datasets.json";

const url =
	"https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/dataflow/ESTAT/all?detail=allstubs";

console.log(`Fetching data from ${url}`);

const resp = await fetch(url);
const body = await resp.text();

console.log("Parsing the XML");

const parser = new XMLParser({ ignoreAttributes: false });
const obj = parser.parse(body);

const datasets = obj["m:Structure"]["m:Structures"]["s:Dataflows"][
	"s:Dataflow"
].map((x) => {
	const code = x["@_id"];
	const description = x["c:Name"].find(
		(nameNode) => nameNode["@_xml:lang"] === "en",
	)["#text"];
	return { code, description };
});

console.log(`Writing ${datasets.length} datasets to ${filename}`);
fs.writeFileSync(filename, JSON.stringify(datasets, null, 2));
