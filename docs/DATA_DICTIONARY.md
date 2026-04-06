# Revvel Data Dictionary

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Living Document — update whenever a new term is introduced  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Everyone — developers, designers, PMs, stakeholders, AI agents

---

## How to Use This Document

This document defines every technical term, acronym, abbreviation, and concept used across the Revvel ecosystem. If you encounter a word you don't recognize in any codebase, spec, or conversation — look it up here first.

Terms are grouped by category. Use `Ctrl+F` / `Cmd+F` to search.

---

## Section 1: General Web Development Terms

| Term | Full Name (if acronym) | Definition | Example in Context |
|---|---|---|---|
| **API** | Application Programming Interface | A set of rules that lets two software systems talk to each other. Think of it as a menu at a restaurant — you tell it what you want, it returns what's available. | "The frontend calls the API to get the user's order history." |
| **Backend** | — | The part of the application the user never sees — the server, database, and business logic. | "The backend validates the password before logging the user in." |
| **Frontend** | — | The part of the application the user sees and interacts with — the website or app screen. | "The frontend displays the product price from the API response." |
| **Endpoint** | — | A specific URL on the backend that accepts requests. Like a specific phone extension number. | "`POST /api/products` is the endpoint to create a new product." |
| **Request** | — | A message sent from the frontend to the backend asking for something (data, an action, etc.). | "The browser sends a request to log in." |
| **Response** | — | The message the backend sends back after receiving a request. | "The server sends a response with the user's data." |
| **HTTP** | Hypertext Transfer Protocol | The language browsers and servers use to communicate. | "The request uses HTTP to send data to the server." |
| **HTTPS** | HTTP Secure | Encrypted version of HTTP. The padlock in the browser address bar. | "All Revvel apps use HTTPS to protect user data in transit." |
| **URL** | Uniform Resource Locator | A web address. | "`https://growlingeyes.com/dashboard` is a URL." |
| **Route / Path** | — | The part of the URL after the domain that identifies a specific page or API endpoint. | "The `/dashboard` in a URL is the route." |
| **Status Code** | — | A 3-digit number in the server response that tells you if the request succeeded or why it failed. | "200 = success, 404 = not found, 500 = server error." |
| **JSON** | JavaScript Object Notation | A simple text format for sending structured data between systems. Looks like a list of labels and values. | `{"name": "Alice", "age": 30}` |
| **Payload** | — | The actual data content sent in an API request or response body. | "The payload of the login request includes the email and password." |
| **Header** | — | Metadata sent alongside an HTTP request or response. Not the visible content. | "The Authorization header carries the login token." |
| **Authentication** | — | Proving who you are. Logging in is authentication. | "Authentication checks your email and password." |
| **Authorization** | — | Proving you're allowed to do something. Being an admin is authorization. | "Authorization checks if the user is an admin before showing the dashboard." |
| **Session** | — | A period of time during which a user is logged in to an app. | "The session expires after 24 hours and the user must log in again." |
| **Token** | — | A digital key (usually a long string of letters and numbers) that proves identity after login. | "After logging in, the server gives the user a JWT token." |
| **Cookie** | — | A small piece of data stored in the browser that can carry a session token or preferences. | "The auth token is stored in an httpOnly cookie." |
| **Cache** | — | A temporary storage area for data so it doesn't have to be fetched again immediately. | "Product images are cached to make the page load faster." |
| **CDN** | Content Delivery Network | A network of servers around the world that delivers files (images, scripts) from the nearest location. | "Static assets are served from a CDN to reduce load times." |
| **Deploy / Deployment** | — | The process of publishing new code to a live server so users can access it. | "We deploy to DigitalOcean every time code is pushed to main." |
| **Production (Prod)** | — | The live, real-world environment users actually use. | "Never test in production — use the development environment." |
| **Development (Dev)** | — | A local or private environment where developers write and test code before it goes live. | "The dev environment runs on your laptop at localhost:3000." |
| **Staging** | — | A near-identical copy of production used for final testing before going live. | "Test the new checkout flow in staging first." |
| **Environment Variable** | — | A setting stored outside the code (like a password) that the app reads at startup. | "`DATABASE_URL` is an environment variable that holds the database address." |
| **Open Source** | — | Software whose source code is publicly available for anyone to read, use, or modify. | "Vitest is open-source — it's free to use." |
| **FOSS** | Free and Open Source Software | Software that is both free to use and open source. | "We prioritize FOSS tools over paid alternatives." |
| **Dependency** | — | An external library or package that the project relies on to work. | "React is a dependency of every Revvel frontend." |
| **Package Manager** | — | A tool that automatically downloads and manages dependencies. | "pnpm is the package manager we use." |
| **Node.js** | — | A runtime that lets JavaScript run on a server (outside the browser). | "The Revvel backend runs on Node.js." |
| **TypeScript (TS)** | — | A stricter version of JavaScript that requires you to define the type of every variable. Catches errors before the code even runs. | "`user: string` declares that `user` must be text, not a number." |
| **Compile / Build** | — | The process of transforming source code into a final version the server or browser can run. | "The build step turns TypeScript into JavaScript." |

---

## Section 2: Database Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **Database (DB)** | — | An organized collection of data stored on a server. | "All user accounts are stored in the PostgreSQL database." |
| **Table** | — | A collection of related data organized in rows and columns. Like a spreadsheet tab. | "The `users` table stores one row per registered user." |
| **Row / Record** | — | One entry in a table. Like a single row in a spreadsheet. | "Each order is one row in the `orders` table." |
| **Column / Field** | — | A specific data point tracked for every row. Like a spreadsheet column. | "The `email` column stores every user's email address." |
| **Primary Key (PK)** | — | A unique identifier that distinguishes every row from every other row in the same table. | "The `id` column is the primary key of the `users` table." |
| **Foreign Key (FK)** | — | A column in one table that points to the primary key of another table, creating a link. | "`orders.user_id` is a foreign key pointing to `users.id`." |
| **UUID** | Universally Unique Identifier | A 36-character random ID guaranteed to be unique. Looks like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`. | "Every user's ID is a UUID, making it impossible to guess." |
| **Index** | — | A behind-the-scenes lookup table the database builds to find rows faster. | "An index on `email` makes user lookups nearly instant." |
| **Query** | — | A request to the database to read, create, update, or delete data. | "The query searches the `products` table for items under $50." |
| **Schema** | — | The blueprint of a database — its tables, columns, types, and relationships. | "The schema defines that `users` has an `email` column of type VARCHAR(255)." |
| **Migration** | — | A versioned script that changes the database schema in a controlled, reversible way. | "The migration added the `deleted_at` column to the `users` table." |
| **ORM** | Object-Relational Mapper | A tool that lets developers write database queries using code instead of raw SQL. | "Drizzle ORM is our mandatory ORM — it converts TypeScript code into SQL." |
| **Drizzle** | — | The specific ORM used in all Revvel applications. | "Use Drizzle's `db.query.users.findFirst()` to look up a user." |
| **SQL** | Structured Query Language | The language used to communicate directly with a relational database. | "`SELECT * FROM users WHERE email = 'a@b.com'` is a SQL query." |
| **PostgreSQL (Postgres)** | — | The primary open-source relational database used in Revvel apps. | "User data is stored in a PostgreSQL database on the droplet." |
| **SQLite** | — | A lightweight file-based database. Permitted for simple, single-user tools only. | "The local dev tool uses SQLite to avoid needing a server." |
| **CRUD** | Create, Read, Update, Delete | The four basic operations on any piece of data. | "The admin panel performs CRUD operations on products." |
| **Soft Delete** | — | Marking a record as deleted (with a `deleted_at` timestamp) instead of physically removing it from the database. | "Users are never hard-deleted — we soft-delete them to preserve order history." |
| **Hard Delete** | — | Permanently removing a record from the database. Only used for legal compliance (GDPR). | "GDPR requests trigger a hard delete of the user's personal data." |
| **snake_case** | — | A naming style where words are all lowercase and separated by underscores. | "`user_first_name`, `created_at`, `is_active` are all snake_case." |
| **camelCase** | — | A naming style where the first word is lowercase and subsequent words start with a capital. | "`userFirstName`, `createdAt`, `isActive` are all camelCase." |
| **NULL** | — | The absence of any value. Means "nothing has been set here." | "A `null` value in `deleted_at` means the record is still active." |
| **Timestamp** | — | A stored date + time value. Usually records when something happened. | "`created_at` is a timestamp recording when the user registered." |
| **Cents (Integer money)** | — | Storing money as a whole number of cents to avoid floating-point math errors. | "$19.99 is stored as `1999` in the database." |

---

## Section 3: Frontend / UI Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **React** | — | The JavaScript library used to build all Revvel user interfaces. | "The signup form is a React component." |
| **Next.js** | — | A full-stack React framework that handles routing, server-side rendering, and API routes. | "All Revvel web apps are built with Next.js." |
| **Component** | — | A reusable, self-contained piece of UI. Like a LEGO brick. | "The `<ProductCard>` component is used on the listing page and the cart page." |
| **Props** | Properties | Data passed into a component from its parent, like arguments to a function. | "The `<ProductCard price={1999} name='Widget' />` passes `price` and `name` as props." |
| **State** | — | Data stored inside a component that can change and cause the UI to update. | "The cart's `items` state updates when a user adds a product." |
| **Hook** | — | A special React function (starts with `use`) for managing state, data fetching, and other logic. | "`useForm()` is a hook that manages form state and validation." |
| **Render** | — | The process of a component producing its visible UI output. | "The component re-renders when its state changes." |
| **DOM** | Document Object Model | The browser's internal representation of a web page — the live structure of all HTML elements. | "React updates the DOM when the cart count changes." |
| **Tailwind CSS** | — | The utility-first CSS framework used for all Revvel styling. | "`className='bg-blue-500 text-white p-4'` is Tailwind CSS." |
| **Glassmorphism** | — | A UI design style featuring frosted-glass effects — semi-transparent backgrounds, blur, and light borders. Mandatory Revvel aesthetic. | "The dashboard cards use glassmorphism with `backdrop-blur` and `bg-white/10`." |
| **Dark Mode** | — | A UI color scheme using dark backgrounds. Mandatory default for all Revvel apps. | "The app launches in dark mode; users can toggle light mode." |
| **Form** | — | A group of input fields that collect data from the user and submit it together. | "The signup form collects email, password, and name." |
| **Validation** | — | Checking that input meets required rules before accepting it. | "Validation rejects a password shorter than 8 characters." |
| **Zod** | — | The mandatory TypeScript library for defining and enforcing validation rules. | "Zod validates that `email` is a valid email format before the API call." |
| **Modal** | — | A popup window that appears over the current page, requiring user interaction. | "Clicking 'Delete' opens a confirmation modal." |
| **Toast / Notification** | — | A temporary message that appears briefly to inform the user of an action's outcome. | "A success toast appears after a product is added to the cart." |
| **Loading State** | — | The UI condition while data is being fetched. Usually shows a spinner or skeleton. | "The product listing shows a skeleton loading state while the API responds." |
| **Error State** | — | The UI condition when something went wrong. | "The form shows an error state with red text if the email is already taken." |
| **Empty State** | — | The UI condition when there is no data to show. | "The cart shows an empty state with 'Your cart is empty' when no items exist." |
| **Responsive** | — | A design that adapts its layout to different screen sizes (mobile, tablet, desktop). | "The navigation collapses into a hamburger menu on mobile." |
| **Viewport** | — | The visible area of the browser window. | "On mobile, the viewport is 390px wide on an iPhone 14." |
| **SSR** | Server-Side Rendering | Generating a page's HTML on the server before sending it to the browser. Faster first load, better SEO. | "Product pages use SSR so Google can index the content." |
| **CSR** | Client-Side Rendering | Generating a page's HTML in the browser using JavaScript. | "The dashboard uses CSR because it doesn't need SEO indexing." |
| **Hydration** | — | The process where a server-rendered page becomes interactive in the browser. | "React hydrates the static HTML after it loads." |
| **Route / Page** | — | A URL path that maps to a specific screen. In Next.js, files in `app/` or `pages/` become routes. | "`app/dashboard/page.tsx` is the route for `/dashboard`." |

---

## Section 4: Authentication & Security Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **Clerk** | — | The preferred third-party authentication provider for Revvel apps. Handles sign-up, sign-in, and session management. | "Clerk provides the login form and manages user sessions." |
| **JWT** | JSON Web Token | A compact, digitally signed token used to prove a user's identity. Three parts separated by dots. | "After login, the server issues a JWT that the browser sends on every future request." |
| **Payload (JWT)** | — | The data encoded inside a JWT — usually user ID and role. | "The JWT payload contains `{ userId: 'abc123', role: 'admin' }`." |
| **OAuth** | Open Authorization | An open standard protocol that lets users log in with a third-party account (Google, GitHub, etc.). | "Users can sign in with Google via OAuth without creating a new password." |
| **MFA / 2FA** | Multi-Factor / Two-Factor Authentication | Requiring a second proof of identity beyond just a password (e.g., a code texted to your phone). | "Admin users must enable 2FA." |
| **CORS** | Cross-Origin Resource Sharing | A browser security rule that controls which websites can call your API. | "CORS is configured to only allow requests from `growlingeyes.com`." |
| **CSP** | Content Security Policy | A set of rules telling the browser which scripts, images, and connections are allowed. Prevents XSS. | "The CSP header blocks inline scripts that could be injected by attackers." |
| **XSS** | Cross-Site Scripting | An attack where malicious scripts are injected into a web page. | "Input sanitization prevents XSS attacks." |
| **SQL Injection** | — | An attack where a malicious user inserts SQL commands into an input field. | "Parameterized queries via Drizzle prevent SQL injection." |
| **Helmet.js** | — | A Node.js middleware that automatically adds security headers to every HTTP response. | "Helmet sets X-Frame-Options and Content-Security-Policy headers." |
| **Rate Limiting** | — | Restricting how many requests a user or IP can make in a given time window. Prevents brute-force and abuse. | "The login endpoint is rate-limited to 10 attempts per 15 minutes." |
| **HashiCorp Vault** | — | The secure secret storage system used to store API keys, database passwords, and other sensitive values in production. | "The `STRIPE_SECRET_KEY` is retrieved from HashiCorp Vault at runtime." |
| **Environment Secret** | — | A sensitive value (API key, password) stored as an environment variable, never in source code. | "`CLERK_SECRET_KEY` is an environment secret — it never appears in the codebase." |
| **httpOnly Cookie** | — | A browser cookie that JavaScript cannot read, making it more secure for storing auth tokens. | "The JWT is stored in an httpOnly cookie to prevent theft via XSS." |
| **HTTPS** | HTTP Secure | Encrypted web traffic. The padlock in the browser. All Revvel apps require HTTPS. | "Certbot provides free HTTPS via Let's Encrypt." |
| **Bcrypt** | — | A one-way hashing algorithm used to store passwords securely. You can never reverse it to get the original password. | "Passwords are hashed with bcrypt before storing in the database." |

---

## Section 5: Payments & E-Commerce Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **Stripe** | — | The mandatory payment processing platform for all Revvel apps. | "Stripe handles all credit card payments and subscription billing." |
| **Stripe Dashboard** | — | The web interface at dashboard.stripe.com where you can see payments, refunds, and customers. | "Check the Stripe Dashboard to see if a payment was captured." |
| **Payment Intent** | — | A Stripe object that represents the entire lifecycle of a payment. | "A Payment Intent is created when the user starts checkout." |
| **Webhook** | — | An automatic HTTP request sent by an external service (like Stripe) to notify your app of an event. | "Stripe sends a webhook to `/api/webhooks/stripe` when a payment succeeds." |
| **Subscription** | — | A recurring payment that charges a customer automatically on a schedule (monthly, yearly). | "The Pro plan is a Stripe Subscription at $29/month." |
| **Price ID** | — | Stripe's internal identifier for a specific product/price combination. | "The Pro Monthly plan has Stripe Price ID `price_1AbcXXXX`." |
| **Customer ID** | — | Stripe's internal identifier for a customer. Stored in your database alongside the user. | "`stripe_customer_id` links a `users` table row to a Stripe customer." |
| **Refund** | — | Returning money to a customer after a purchase. | "Issue a refund from the Stripe Dashboard or via the admin panel." |
| **Plaid** | — | The banking data integration used to link bank accounts and view transactions. | "Plaid lets users connect their bank account to see transaction history." |
| **Cents** | — | How Revvel and Stripe store money — as whole integers representing the smallest currency unit. | "$19.99 = 1999 cents in the database." |
| **Cart** | — | The temporary collection of items a user intends to purchase. Stored in state, not yet in the DB. | "The cart state holds items before checkout." |
| **Order** | — | A confirmed purchase record stored permanently in the database after successful payment. | "An order row is created in the `orders` table after Stripe confirms payment." |
| **SKU** | Stock Keeping Unit | A unique identifier for a specific product variant. | "The blue Large T-shirt has SKU `TSHIRT-BLUE-L`." |

---

## Section 6: CI/CD and DevOps Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **CI/CD** | Continuous Integration / Continuous Deployment | An automated pipeline that tests and deploys code every time changes are pushed. | "The CI/CD pipeline runs tests, builds, and deploys to the server automatically." |
| **GitHub Actions** | — | The CI/CD tool built into GitHub. Runs workflows (YAML files) on events like pushes or PRs. | "A GitHub Actions workflow deploys to DigitalOcean on every push to `main`." |
| **Workflow** | — | A YAML file in `.github/workflows/` that defines what GitHub Actions does. | "The `deploy.yml` workflow runs on every push to `main`." |
| **Pipeline** | — | The full sequence of automated steps from code push to live deployment. | "The pipeline: push → test → build → deploy." |
| **Branch** | — | A parallel version of the codebase where work happens without affecting the main codebase. | "`feat/user-profile` is a feature branch." |
| **PR / Pull Request** | — | A request to merge code from one branch into another. Requires review before merging. | "Open a PR to merge `feat/checkout` into `main`." |
| **Merge** | — | Combining code from one branch into another. | "After approval, merge the PR into `main`." |
| **Commit** | — | A saved snapshot of changes to the codebase. Like a version save point. | "Each commit describes a specific change: `fix: correct cart total calculation`." |
| **Push** | — | Uploading local commits to GitHub. | "Push the branch to trigger the CI/CD pipeline." |
| **Rollback** | — | Reverting to a previous working version of the code. | "The deployment broke login, so we rolled back to the previous commit." |
| **DigitalOcean** | — | The cloud hosting provider used to run Revvel applications. | "The app runs on a DigitalOcean Droplet at 164.90.148.7." |
| **Droplet** | — | DigitalOcean's name for a virtual private server (VPS). | "The Droplet runs Ubuntu and hosts multiple Revvel apps via PM2." |
| **PM2** | Process Manager 2 | A process manager for Node.js that keeps apps running and restarts them if they crash. | "PM2 keeps the GrowlingEyes app running — `pm2 restart growlingeyes`." |
| **Nginx** | — | A web server that receives incoming HTTP requests and forwards them to the right Node.js app. | "Nginx routes `growlingeyes.com` traffic to port 3001 on the Droplet." |
| **SSH** | Secure Shell | An encrypted protocol for remotely connecting to a server via the terminal. | "`ssh root@164.90.148.7` connects to the DigitalOcean Droplet." |
| **rsync** | — | A tool for efficiently synchronizing files between computers. Used in deployments. | "rsync transfers the built app files to the Droplet." |
| **pnpm** | — | The package manager used in all Revvel projects. Faster and more disk-efficient than npm. | "`pnpm install` installs all project dependencies." |
| **CHANGELOG** | — | A file recording all notable changes to a project, in chronological order. Mandatory per the Auto-Documentation Standard. | "`CHANGELOG.md` shows what changed in each version of the app." |
| **Semantic Versioning** | SemVer | A version numbering system: `MAJOR.MINOR.PATCH` (e.g., `2.1.0`). | "Version `2.0.0` means a breaking change. `2.1.0` means a new feature. `2.1.1` means a bug fix." |

---

## Section 7: Testing Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **Vitest** | — | The unit testing framework used in all Revvel apps. Fast and Vite-powered. | "`npx vitest run` runs all unit and integration tests." |
| **Playwright** | — | The end-to-end browser testing framework. Automates real browser clicks and form fills. | "Playwright tests that the checkout flow completes successfully." |
| **Unit Test** | — | A test for a single, isolated function or piece of logic. | "A unit test checks that `calculateTotal([1999, 499])` returns `2498`." |
| **Integration Test** | — | A test that checks multiple parts working together, like an API route and the database. | "An integration test confirms that `POST /api/products` creates a DB row." |
| **E2E Test** | End-to-End Test | A test that simulates a real user journey through the full application in a browser. | "An E2E test signs up, adds a product, and completes checkout." |
| **Test Suite** | — | A collection of related tests. | "The auth test suite covers sign-up, sign-in, and sign-out." |
| **Assertion** | — | A statement in a test that checks an expected outcome. If it's false, the test fails. | "`expect(total).toBe(2498)` is an assertion." |
| **Mock** | — | A fake replacement for a real dependency (like an API or database) used in tests. | "The test mocks the Stripe API so no real charges are made." |
| **Coverage** | — | The percentage of source code lines executed during tests. | "80% test coverage means 80% of code lines run during the test suite." |
| **Threshold** | — | The minimum required coverage percentage. CI fails if coverage drops below it. | "The coverage threshold is 80% — failing coverage blocks deployment." |
| **MSW** | Mock Service Worker | A library that intercepts HTTP requests in tests to return fake API responses. | "MSW intercepts the Plaid API call and returns test data." |
| **CI Gate** | — | An automated check in the pipeline that blocks deployment if it fails. | "The test coverage CI gate blocks deployment if coverage drops below 80%." |

---

## Section 8: Project Management Terms

| Term | Full Name | Definition | Example in Context |
|---|---|---|---|
| **EXRUP** | Extreme Rapid Programming | Revvel's core development methodology — ship a complete, tested product in one intense iteration. | "Following EXRUP, the app goes from spec to production in one sprint." |
| **Sprint** | — | A time-boxed period of focused work (usually 1–2 weeks) with defined deliverables. | "Sprint 1 covers user authentication and the product listing page." |
| **Backlog** | — | The prioritized list of all work to be done. | "New feature requests go into the backlog until scheduled." |
| **User Story** | — | A short description of a feature from the user's perspective. Format: "As a [user], I want to [action] so that [benefit]." | "As a shopper, I want to add items to my cart so that I can check out later." |
| **Acceptance Criteria** | — | The specific, testable conditions that must be true for a user story to be considered complete. | "Acceptance criteria: cart persists when user refreshes the page." |
| **DARE Log** | Decisions, Actions, Results, Evidence | A running log of decisions made and their outcomes. | "The DARE log records why PostgreSQL was chosen over MySQL." |
| **RAID Log** | Risks, Assumptions, Issues, Dependencies | A log tracking potential problems and blockers. | "The RAID log notes that Plaid API limits could slow data sync." |
| **SSOT** | Single Source of Truth | One authoritative document or system that is always correct. All other references defer to it. | "`MASTER_APP_TEMPLATE.md` is the SSOT for how apps are built." |
| **ADR** | Architecture Decision Record | A document capturing a significant technical decision, why it was made, and what alternatives were rejected. | "ADR-0001 records why we chose Clerk over a custom auth system." |
| **Runbook** | — | An operational guide for managing a deployed service — how to restart, roll back, check logs. | "The runbook tells you how to restart GrowlingEyes if it goes down." |
| **Handoff** | — | The structured transfer of context between one agent or team member and the next. | "The handoff document lists what was done, what is blocked, and what to do next." |
| **PM2** | Process Manager 2 | Keeps Node.js apps running in production. | "PM2 auto-restarts the app if it crashes." |
| **Droplet** | — | A DigitalOcean virtual server. | "All Revvel apps run on the shared Droplet at 164.90.148.7." |
| **Blue Ocean** | — | A market strategy targeting uncontested spaces with little competition. Opposite of Red Ocean (crowded markets). | "GrowlingEyes targets a blue ocean by combining financial aggregation with neuro-inclusive design." |
| **WCAG** | Web Content Accessibility Guidelines | International standards for making web content accessible to people with disabilities. | "WCAG 2.1 AA compliance is mandatory for all Revvel apps." |

---

## Section 9: Revvel-Specific Acronyms and Terms

| Term | Full Name | Definition |
|---|---|---|
| **FM** | Field Map ID prefix | Used in field map IDs: `FM-AUTH-001` |
| **SSOT** | Single Source of Truth | The authoritative version of any document or data |
| **PK** | Primary Key | The unique ID column in a database table |
| **FK** | Foreign Key | A column that references another table's PK |
| **ORM** | Object-Relational Mapper | Code-to-database translation layer (Drizzle) |
| **DB** | Database | PostgreSQL or SQLite |
| **TS** | TypeScript | The programming language used in all Revvel projects |
| **API** | Application Programming Interface | How the frontend talks to the backend |
| **UI** | User Interface | What the user sees and interacts with |
| **UX** | User Experience | How the user feels while using the app |
| **ENV** | Environment Variable | A secret or config value stored outside the code |
| **CI** | Continuous Integration | Automated testing that runs on every code push |
| **CD** | Continuous Deployment | Automated deployment after tests pass |
| **PR** | Pull Request | A code review request in GitHub |
| **MVP** | Minimum Viable Product | The simplest version of an app that still delivers core value |
| **FOSS** | Free and Open Source Software | Free software with public source code |
| **P0** | Priority 0 | Blocking — must be fixed before deployment |
| **P1** | Priority 1 | High — must be resolved within 30 days |
| **P2** | Priority 2 | Medium — best practice, not blocking |
| **CTA** | Call to Action | A button or link prompting user action ("Sign Up", "Buy Now") |
| **SEO** | Search Engine Optimization | Practices to rank higher in Google search |
| **SEM** | Search Engine Marketing | Paid advertising to appear in search results |
| **UTM** | Urchin Tracking Module | Parameters added to URLs to track marketing campaign traffic |
| **JSON-LD** | JSON Linked Data | Structured data format Google reads for rich search results |
| **CSR** | Client-Side Rendering | Page HTML generated in the browser |
| **SSR** | Server-Side Rendering | Page HTML generated on the server before delivery |
| **CRUD** | Create, Read, Update, Delete | The four fundamental database operations |
| **JWT** | JSON Web Token | An encoded, signed identity proof used for authentication |
| **MFA** | Multi-Factor Authentication | Requiring two or more proofs of identity |
| **CORS** | Cross-Origin Resource Sharing | Controls which sites can call your API |
| **CSP** | Content Security Policy | HTTP header restricting what the browser can load |
| **XSS** | Cross-Site Scripting | An injection attack using malicious scripts |
| **E2E** | End-to-End (test) | A full user journey test in a real browser |
| **SaaS** | Software as a Service | Cloud-hosted software accessed via subscription |
| **PII** | Personally Identifiable Information | Any data that identifies a real person (name, email, SSN) |
| **GDPR** | General Data Protection Regulation | EU law governing personal data privacy |

---

## Section 10: Error Code Quick Reference

| Code | Meaning | What To Do |
|---|---|---|
| **200** | OK — request succeeded | Normal. No action needed. |
| **201** | Created — new record was created | Normal after POST requests that create data. |
| **204** | No Content — succeeded but nothing to return | Normal after DELETE requests. |
| **301 / 302** | Redirect — moved to a different URL | Check if the URL is correct. |
| **400** | Bad Request — invalid input sent to the API | Check the request body — something is malformed or missing. |
| **401** | Unauthorized — not logged in | User needs to log in. Token is missing or expired. |
| **403** | Forbidden — logged in but not allowed | User doesn't have permission. Check user role. |
| **404** | Not Found — the URL or record doesn't exist | Check the URL/route or the ID being requested. |
| **409** | Conflict — a duplicate already exists | Usually "email already registered." |
| **422** | Unprocessable Entity — validation failed | The data is in the right format but fails business rules. |
| **429** | Too Many Requests — rate limited | Slow down. Too many requests in a short period. |
| **500** | Internal Server Error — the backend crashed | Check server logs. Something unexpected broke. |
| **502** | Bad Gateway — Nginx can't reach the app | PM2 process crashed. Run `pm2 restart`. |
| **503** | Service Unavailable — temporarily down | Server is restarting or overloaded. |
| **504** | Gateway Timeout — app took too long to respond | Check for slow DB queries or hung processes. |
