class DatasetNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav aria-labelledby="navigation">
        <h2 id="navigation">Datasets</h2>
        <dl>
          ${datasets
            .map(
              (d) => `
                <a href="${d.url}">
                  <dt>${d.id}</dt>
                  <dd>${d.description}</dd>
                </a>
              `,
            )
            .join("\n")}
        </dl>
      </nav>
    `;
  }
}

customElements.define("dataset-nav", DatasetNav);
