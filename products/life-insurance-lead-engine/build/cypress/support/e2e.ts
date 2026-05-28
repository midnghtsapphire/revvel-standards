// Cypress support file — auto-loaded before every spec.
//
// Loads @testing-library/cypress so specs can use cy.findByRole, cy.findByText,
// etc. (the recommended user-facing query API).
//
// Applitools (@applitools/eyes-cypress) was intentionally deferred to a
// follow-on PR to isolate Cypress install risk (React 19 / Next 16 peer-dep
// conflicts on the visual-eyes SDK). Add later via the same per-app pattern.
import "@testing-library/cypress/add-commands";
