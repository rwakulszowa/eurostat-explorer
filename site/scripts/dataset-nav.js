class DatasetNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav aria-labelledby="navigation">
        <h2 id="navigation">Datasets</h2>
        <ul>
          ${datasets
            .map(
              (d) => `
                <li>
                  <a href="${d.url}">
                    <p>${d.id}</p>
                    <p>${d.description}</p>
                  </a>
                </li>
              `,
            )
            .join("\n")}
        </ul>
      </nav>
    `;
  }
}

customElements.define("dataset-nav", DatasetNav);
