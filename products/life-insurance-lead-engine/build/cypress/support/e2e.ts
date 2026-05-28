// Cypress support file — auto-loaded before every spec.
//
// Wires:
//   - @testing-library/cypress (cy.findByRole, cy.findByText, etc.)
//   - @applitools/eyes-cypress for visual regression (no-op without APPLITOOLS_API_KEY)
import "@testing-library/cypress/add-commands";
import "@applitools/eyes-cypress";
