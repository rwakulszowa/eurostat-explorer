import * as datasets from "../assets/datasets.json";

async function handleSearch(query: string, dstElementId: string) {
	const dst = document.getElementById(dstElementId);
	if (!dst) {
		throw new Error(`dst element not found: ${dstElementId}`);
	}

	const result = search(query);

	dst.replaceChildren(
		...result.map(({ code, description }) =>
			searchResultRow(code, description),
		),
	);
}

// Eurostat autocomplete API is CORS protected.
// This function implements a simple client-side search.
function search(query: string): { code: string; description: string }[] {
	const lowerQuery = query.toLowerCase();
	return datasets
		.filter(
			({ code, description }) =>
				code.toLowerCase().includes(lowerQuery) ||
				description.toLowerCase().includes(lowerQuery),
		)
		.slice(0, 10);
}

function searchResultRow(
	datasetId: string,
	datasetDescription: string,
): DocumentFragment {
	const template = document.getElementById(
		"search-result-row-template",
	) as HTMLTemplateElement;
	const content = template.content.cloneNode(true) as DocumentFragment;
	content.querySelector("slot[name=dataset-id]")?.replaceWith(datasetId);
	content
		.querySelector("slot[name=dataset-description]")
		?.replaceWith(datasetDescription);
	return content;
}

Object.assign(window, { handleSearch });
