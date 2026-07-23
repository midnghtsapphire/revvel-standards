# 1. OBJECTIVE
Create a single shell script `scripts/create-product.sh` that:
- Takes a product name as input
- Creates a complete Next.js product folder in `products/` with all standard files
- Initializes a new GitHub repository
- Pushes everything to GitHub

## 2. CONTEXT SUMMARY
The `revvel-standards` repo contains multiple Next.js products under `products/`. Each product follows the same structure (package.json, app/, configs, tests/). A script is needed to bootstrap new products quickly.

## 3. APPROACH OVERVIEW
Create a standalone bash script that:
1. Accepts product name as argument
2. Creates folder structure from template
3. Substitutes product name in all files
4. Uses GitHub API via `gh` CLI to create repo under `midnghtsapphire`
5. Pushes to GitHub

## 4. IMPLEMENTATION STEPS

### Step 1: Create `scripts/create-product.sh`
- Create the script at `/workspace/project/revvel-standards/scripts/create-product.sh`
- Script accepts one argument: product name
- Usage: `./scripts/create-product.sh my-new-product`

### Step 2: Implement folder creation
- Create `products/$PRODUCT_NAME/` structure
- Create all required files with proper substitutions

### Step 3: Implement GitHub repo creation
- Use `gh repo create` to create repo under `midnghtsapphire`
- Set remote origin
- Initial commit and push

### Required files in new product
```text
products/$PRODUCT_NAME/
├── package.json          (Next.js + TypeScript + Tailwind)
├── package-lock.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── vercel.json
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── tests/
│   └── app.test.ts
├── README.md
├── CHANGELOG.md
└── DEPLOYMENT_GUIDE.md
```

## 5. TESTING AND VALIDATION
- Run script with test product name: `./scripts/create-product.sh test-product-123`
- Verify folder created in `products/`
- Verify files exist with correct content
- Verify GitHub repo created (check via `gh repo list midnghtsapphire`)
- Delete test product and repo after validation
