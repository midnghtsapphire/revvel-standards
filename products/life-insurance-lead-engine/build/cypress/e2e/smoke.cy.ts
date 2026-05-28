/// <reference types="cypress" />

describe("life-insurance-lead-engine — smoke", () => {
  it("loads the home page", () => {
    cy.visit("/");
    cy.findByRole("heading", { name: /life insurance lead engine/i }).should("be.visible");
    cy.contains(/NPPES NPI Registry/i).should("be.visible");
  });

  it("shows the LeadGenerator + Dedupe sections", () => {
    cy.visit("/");
    // LeadGenerator is the ZIP-input flow
    cy.contains(/zip code/i).should("be.visible");
    // Dedupe is the upload-leads flow
    cy.contains(/upload your existing leads/i).should("be.visible");
  });
});
