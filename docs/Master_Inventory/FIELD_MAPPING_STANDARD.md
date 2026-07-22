# Field Mapping Standard

**Version:** 1.0.0  
**Date:** April 6, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Audience:** Developers, AI agents, designers, project managers, non-technical stakeholders

---

## 1. What Is a Field Map and Why It Exists

A field map is a document that connects every visible piece of information on a screen — every text box, dropdown, button, toggle — to the exact technical variable name, database column, and API property it represents.

Think of it as a translation dictionary between the world a user sees and the world the code operates in.

**Without a field map:**
- A developer calls a field `usr_fn` in the database. A designer calls it "First Name Box." A PM calls it "the name field." An AI agent calls it `firstName`. Nobody knows they're talking about the same thing.
- When a bug appears ("the name isn't saving"), it takes hours to locate the right file, the right variable, and the right database column.
- Non-technical stakeholders cannot participate in QA or error reporting because they have no bridge to the technical world.

**With a field map:**
- Everyone speaks the same language.
- A non-coder can say "Field FM-003 is showing the wrong value" and a developer knows exactly where to look.
- AI agents can be given a field map and instantly understand the full data model without reading the source code.

---

## 2. When to Create a Field Map

A field map is **required** for every screen and modal in a Revvel application before development begins. It is created during Phase 2 (Design) of the project lifecycle and updated continuously through Phase 7 (Maintenance).

| Phase | Field Map Activity |
|---|---|
| Phase 2 — Design | Create initial field map from wireframes. Every planned input gets an ID. |
| Phase 3 — Development | Add Variable Name, Data Type, and Backend Target as they are coded |
| Phase 4 — Testing | QA team uses field map to verify every field saves and retrieves correctly |
| Phase 7 — Maintenance | Update field map when any field is added, renamed, or removed |

---

## 3. Field Map Standard Columns

Every field map document must contain exactly these columns, in this order:

| Column | Description | Example |
|---|---|---|
| **Field ID** | Unique identifier for this field, used in bug reports | `FM-AUTH-001` |
| **UI Screen / Page** | The page or modal where this field appears | `Sign Up Page` |
| **Section / Component** | The grouping or component within the page | `Registration Form` |
| **Field Label (What User Sees)** | The exact text label the user reads | `Email Address` |
| **UI Component Type** | The type of input element | `Text Input` |
| **Required?** | Whether the field must be filled in | `Yes / No` |
| **Placeholder Text** | The greyed-out hint text inside the field | `you@example.com` |
| **Validation Rules** | What is and is not accepted | `Valid email format, max 255 chars` |
| **Frontend Variable Name** | The name used in React/TypeScript code | `email` |
| **Frontend State Location** | Where the value lives in app state | `useForm → field: email` |
| **API Request Field** | The JSON key sent to the backend | `email` |
| **HTTP Method + Endpoint** | The API call this field is part of | `POST /api/auth/register` |
| **Backend Variable Name** | The name in the server-side handler | `req.body.email` |
| **Database Table** | The database table storing this value | `users` |
| **Database Column** | The exact column name in that table | `email` |
| **Data Type (DB)** | The database column type | `VARCHAR(255)` |
| **Data Type (Frontend)** | The TypeScript type | `string` |
| **Default Value** | What the field starts as if not filled | `null` |
| **Indexed?** | Whether the DB column is indexed for fast lookup | `Yes — unique index` |
| **Notes / Special Behavior** | Any unusual behavior, transformations, or business rules | `Lowercased before save` |

---

## 4. Field ID Naming Convention

Every field gets a unique ID following this format:

```text
FM-[SCREEN_CODE]-[NUMBER]

Examples:
  FM-AUTH-001   →  Field 1 on the Auth screens
  FM-CART-012   →  Field 12 on the Cart screen
  FM-ADMIN-005  →  Field 5 on the Admin panel
```

**Standard Screen Codes:**

| Code | Screen |
|---|---|
| `AUTH` | Authentication (Sign Up, Sign In, Password Reset) |
| `PROFILE` | User Profile / Account Settings |
| `CART` | Shopping Cart |
| `CHECKOUT` | Checkout / Payment |
| `PRODUCT` | Product Listing / Product Detail |
| `ADMIN` | Admin Panel / Dashboard |
| `ONBOARD` | Onboarding Flow |
| `SUBSCRIBE` | Subscription Management |
| `SEARCH` | Search / Filter UI |
| `NOTIFY` | Notifications / Alerts |

---

## 5. UI Component Type Reference

Use these exact terms in the "UI Component Type" column:

| Term | What It Is | Examples |
|---|---|---|
| `Text Input` | Single-line free-text box | Name, email, search box |
| `Password Input` | Text input that hides characters | Login password field |
| `Textarea` | Multi-line free-text box | Description, bio, notes |
| `Number Input` | Text input that only accepts numbers | Quantity, price |
| `Email Input` | Text input with email format validation | Email address |
| `Phone Input` | Text input with phone formatting | Phone number |
| `Date Picker` | Calendar selector | Birthday, date range |
| `Time Picker` | Clock selector | Appointment time |
| `Dropdown (Select)` | Click to expand a list of options | Country, category |
| `Multi-Select` | Dropdown allowing multiple choices | Tags, interests |
| `Radio Group` | Choose exactly one from a visible list | Gender, plan type |
| `Checkbox` | On/off toggle that can be in a group | Agree to terms, preferences |
| `Toggle / Switch` | On/off binary switch | Enable notifications |
| `Slider` | Drag to pick a numeric value | Price range, volume |
| `File Upload` | Click to select and upload a file | Profile photo, attachment |
| `Image Upload` | Specifically for images | Product photo |
| `Rich Text Editor` | WYSIWYG text editor with formatting | Blog post, description |
| `Color Picker` | Select a color | Theme color, branding |
| `Rating` | Stars or score selector | Product review |
| `Hidden Field` | Not visible to user; carries data | CSRF token, user ID |
| `Read-Only Display` | Shows data but cannot be edited | Order ID, created date |
| `Button` | Triggers an action | Submit, Cancel, Delete |
| `Link` | Navigation element | "Forgot password?" |

---

## 6. Data Type Reference

Use these exact terms in the Data Type columns:

### Frontend (TypeScript) Types

| Type | Meaning | Example Values |
|---|---|---|
| `string` | Text of any length | `"hello"`, `"user@email.com"` |
| `number` | Any number (integer or decimal) | `42`, `19.99` |
| `boolean` | True or false only | `true`, `false` |
| `Date` | A date/time object | `new Date("2026-04-06")` |
| `string \| null` | Text or empty/unset | `"hello"` or `null` |
| `number \| null` | Number or empty/unset | `42` or `null` |
| `string[]` | List/array of text values | `["tag1", "tag2"]` |
| `UUID` | A unique identifier string | `"550e8400-e29b-41d4-a716-446655440000"` |

### Database (PostgreSQL) Types

| Type | Meaning | Max Size | Use For |
|---|---|---|---|
| `VARCHAR(n)` | Text up to n characters | Up to 255 typical | Names, emails, short text |
| `TEXT` | Unlimited text | Unlimited | Descriptions, bios, content |
| `INTEGER` | Whole number | ±2.1 billion | Counts, quantities |
| `BIGINT` | Very large whole number | ±9.2 quintillion | IDs, large counts |
| `BOOLEAN` | True/false | — | Flags, toggles |
| `DECIMAL(p,s)` | Precise decimal | Configurable | Prices (prefer INTEGER cents) |
| `TIMESTAMP WITH TIME ZONE` | Date and time with timezone | — | Created/updated timestamps |
| `DATE` | Date only (no time) | — | Birthdates |
| `UUID` | Universally unique ID | 36 chars | Primary keys |
| `JSONB` | Structured JSON data | Unlimited | Flexible metadata |
| `INTEGER (cents)` | Money stored as whole cents | ±2.1 billion | Prices ($19.99 = 1999) |

---

## 7. How to Read a Filled Field Map

When looking at a filled field map entry, read it as a sentence:

> **"The [Field Label] field on the [Screen] page is a [Component Type]. When the user fills it in and submits, the value is sent as [API Request Field] in a [HTTP Method] request to [Endpoint]. The backend receives it as [Backend Variable], validates it, and stores it in the [Database Table].[Database Column] column as a [Data Type (DB)]."**

**Example:**
> "The Email Address field on the Sign Up page is a Text Input. When submitted, the value is sent as `email` in a `POST` request to `/api/auth/register`. The backend receives it as `req.body.email`, lowercases it, validates email format, and stores it in the `users.email` column as a `VARCHAR(255)` with a unique index."

---

## 8. Figma Integration

In Figma, every field in the design file must be linked to a variable that matches the `Frontend Variable Name` column of the field map. See `docs/VISUAL_DOCUMENTATION_GUIDE.md` for step-by-step Figma setup.

**Naming convention for Figma variables:**
```text
[Screen Code]/[Field Label in camelCase]

Examples:
  auth/email
  auth/password
  profile/firstName
  checkout/cardNumber
```

---

## 9. Excel / Spreadsheet Format

When sharing field maps with non-technical stakeholders, the recommended format is an Excel workbook with one worksheet per screen. See `docs/VISUAL_DOCUMENTATION_GUIDE.md` for the exact column setup.

**Color coding convention for Excel:**
- 🟦 Blue column header = Visible to users (UI-facing)
- 🟩 Green column header = Technical/developer-facing
- 🟨 Yellow cell = Required field
- 🟥 Red cell = Security-sensitive field (password, tokens)
- ⬜ White cell = Optional field

---

## 10. Where Field Maps Live

```text
your-app-repo/
└── docs/
    └── field-maps/
        ├── AUTH_SCREENS_FIELD_MAP.md       # Sign Up, Sign In, Reset Password
        ├── PROFILE_FIELD_MAP.md            # User profile and account settings
        ├── ECOMMERCE_FIELD_MAP.md          # Cart, Checkout, Orders
        ├── PRODUCT_FIELD_MAP.md            # Product listing and detail
        ├── ADMIN_PANEL_FIELD_MAP.md        # Admin dashboard and controls
        └── [SCREEN_NAME]_FIELD_MAP.md      # One file per logical screen group
```

---

## 11. Keeping Field Maps Up to Date

A field map that is out of date is worse than no field map — it creates confusion and sends people looking in the wrong place.

**Mandatory update triggers:**
- A new field is added to any screen → Add a new row
- A field is removed → Mark as `DEPRECATED` in the Notes column, do NOT delete the row
- A field is renamed in the UI → Update the Field Label column
- A variable is renamed in code → Update the Frontend Variable Name column
- A database column is renamed or moved → Update DB columns
- An API endpoint changes → Update HTTP Method + Endpoint

The field map is updated in the same PR as the code change. A PR that changes a field without updating the field map will be rejected.
