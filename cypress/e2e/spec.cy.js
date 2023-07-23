it("renders charts", () => {
  // Home page.
  cy.visit("/");

  // Navigate to a dataset.
  cy.contains("aact_ali01").click();

  // Expect elements on the dataset page.
  cy.contains("Agricultural labour input statistics");
  cy.get("figure").should("have.length", 3);
});
