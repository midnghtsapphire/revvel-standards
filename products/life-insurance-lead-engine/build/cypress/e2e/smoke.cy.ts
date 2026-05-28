/// <reference types="cypress" />

// Minimal first-run smoke. Once this is stable in CI, expand to verify
// LeadGenerator/Dedupe sections, then add Applitools (separate PR).
describe("life-insurance-lead-engine — smoke", () => {
  it("home page responds and renders content", () => {
    cy.visit("/");
    cy.get("body").should("not.be.empty");
  });
});
