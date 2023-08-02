class MainNav extends HTMLElement {
  connectedCallback() {
    const nav = document.createElement("nav");
    nav.setAttribute("aria-labelledby", "navigation");
    nav.setAttribute("class", "scroll");

    const header = nav.appendChild(document.createElement("h2"));
    header.setAttribute("id", "navigation");

    const content = nav.appendChild(document.createElement("span"));
    content.innerText = "Loading";

    this.replaceChildren(nav);

    // NOTE: consider importing the json file once import assertions
    // are widely supported.
    // TODO: until then, just store the value in a property / localstorage.
    // Fetching causes a blink, even if the response is cached.
    (async function fetchNavItemsAndRender() {
      const datasets = await fetch("./_site/nav.json").then((r) => r.json());
      content.innerHTML = `
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
      `;
    })();
  }
}

customElements.define("main-nav", MainNav);
