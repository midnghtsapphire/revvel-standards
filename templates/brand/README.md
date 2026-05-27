# Brand Templates

How to use the brand templates for every new Revvel/MIDNGHTSAPPHIRE project.

---

## Steps

1. **Fill in `BRAND_IDENTITY_TEMPLATE.md` first**
   - Derive everything from the Revvel Emblem formula in `REVVEL_EMBLEM_STANDARD.md`
   - Define your 4 brand colors before doing anything else
   - Work through the Revvel Emblem Derivation table: topic → metaphor → visual translators → layers

2. **Commission or generate the Revvel Emblem**
   - Use the formula in `REVVEL_EMBLEM_STANDARD.md` as your creative brief
   - The formula is precise enough to give to any AI image generator or human designer
   - Deliver the emblem as a 1024x1024 PNG minimum (scale down from there)

3. **Export all required sizes**
   - Use `ICON_SIZE_SPEC.md` as your export checklist
   - Recommended tool: Sharp (Node.js) or ImageMagick for batch resizing
   - Use Squoosh for manual compression of individual sizes

4. **Place all icons**
   - Copy all icons to `client/public/icons/` in your app repo
   - Follow the directory structure in `ICON_SIZE_SPEC.md`

5. **Add all `<head>` tags**
   - Copy the HTML Head Tags section from your filled `BRAND_IDENTITY_TEMPLATE.md`
   - Add to your HTML entry point (e.g., `index.html`, `_document.tsx`, `app.html`)

6. **Commit your brand document**
   - Save filled `BRAND_IDENTITY_TEMPLATE.md` as `docs/{project-name}/BRAND.md` in `revvel-standards`
   - This creates a permanent record of all design decisions for future agents

---

## Files in This Directory

| File | Purpose |
|---|---|
| `REVVEL_EMBLEM_STANDARD.md` | Complete Revvel Emblem formula — universal design language |
| `BRAND_IDENTITY_TEMPLATE.md` | Blank brand identity document — fill in for every new project |
| `ICON_SIZE_SPEC.md` | Quick reference for all icon sizes, platforms, and export tools |
