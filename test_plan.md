1. **Update `route.ts` to accept a `theme_prompt`**:
   - In `products/music-video-creator/src/app/api/video/route.ts`, extract the `theme_prompt` from `formData`.
   - Update `submitLumaJob` to accept a `prompt` argument. If provided, use it (and optionally append the song name).
   - Pass the `theme_prompt` from `submitToProvider` down to `submitLumaJob`.

2. **Update `page.tsx` with a Dropdown for Themes**:
   - In `products/music-video-creator/src/app/page.tsx`, define the three themes provided in the instructions (Gen Z, Gen X, Glassmorphic).
   - Add a `<select>` input to the form to let the user pick one of these themes.
   - When submitting, if a theme is selected, pass its prompt string as `theme_prompt` in the `FormData`.

3. **Complete Pre-commit Steps**:
   - Ensure tests still pass.
   - Run linter and typecheck if available to ensure correct types.
   - Verify visually via checking the build.

4. **Submit the changes**.
