/// <reference types="cypress" />

describe("life-insurance-lead-engine — smoke", () => {
  it("loads the home page", () => {
    cy.visit("/");
    cy.findByRole("heading", { name: /life insurance lead engine/i }).should("be.visible");
    cy.contains(/NPPES NPI Registry/i).should("be.visible");
  });

  it("shows the LeadGenerator + Dedupe + Newsletter + Affiliate sections", () => {
    cy.visit("/");
    // LeadGenerator is the ZIP-input flow
    cy.contains(/zip code/i).should("be.visible");
    // Dedupe is the upload-leads flow
    cy.contains(/upload your existing leads/i).should("be.visible");
  });

  it("Applitools visual checkpoint of the landing page (no-op without APPLITOOLS_API_KEY)", () => {
    cy.visit("/");
    cy.eyesOpen({ appName: "life-insurance-lead-engine", testName: "landing-page" });
    cy.eyesCheckWindow("landing");
    cy.eyesClose();
  });
});
