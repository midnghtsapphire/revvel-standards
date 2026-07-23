# PUBLIC IDENTITY STANDARD

**Purpose:** Establish a consistent, professional, public-facing GitHub identity for all Revvel / MIDNGHTSAPPHIRE contributors so that every account projects verifiable trust and integrity to employers, collaborators, and the open-source community.

**Scope:** Applies to every personal GitHub account that contributes to any Revvel, MIDNGHTSAPPHIRE, or Freedom Angel Corps repository. This standard governs profile presentation, collaboration hygiene, tool integration, and technical use of the numerical User ID.

---

## 1. Professional Developer Portfolio

Treat your [GitHub profile](https://docs.github.com/en/get-started/onboarding/getting-started-with-your-github-account) as a living résumé.

- **Showcase work** — Pin your best repositories to the top of your profile so visitors see your strongest code first.
- **Track contributions** — Keep the contribution graph active; consistent activity demonstrates experience and reliability.
- **Profile README** — Create a repository named after your username (e.g. `midnghtsapphire/midnghtsapphire`) that contains a `README.md`. Use it for a concise "About Me," current focus, featured projects, and contact links. See [Managing your profile README](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme).
- **Profile metadata** — Fill in a real name, bio, location (region-level is fine), company / affiliation, and a verified website. Upload a clear avatar.

## 2. Connect and Collaborate on Projects

Your account is your gateway to working with other developers.

- **Contribute to open source** — Fork a repository, make changes on a feature branch, and open a Pull Request upstream. Follow the receiving project's `CONTRIBUTING.md`.
- **Manage issues** — File clear, reproducible bug reports and feature requests via GitHub Issues; link related PRs.
- **Follow and star** — Follow influential developers and star repositories you rely on to stay current and signal interests.

## 3. Integrate with Developer Tools

Use GitHub as your primary developer identity across tooling.

- **Social login** — Sign in to tools such as Vercel, Netlify, and VS Code with "Sign in with GitHub" instead of creating new credentials.
- **GitHub Desktop** — Install [GitHub Desktop](https://desktop.github.com/) for a visual Git interface synced to your account.
- **VS Code integration** — Sign in to VS Code with GitHub to edit, commit, and push directly from the editor.

## 4. Technical Usage — Numerical User ID

Some technical scenarios require your permanent numerical User ID (stable across username changes).

- **Find your numerical ID** — Call `https://api.github.com/users/<your-username>` and read the `id` field.
- **API integrations** — Automated scripts and the [GitHub REST API](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api) should reference accounts by numerical ID when persistence is required.
- **No-reply email** — To keep your real email private while committing code, enable "Keep my email addresses private" in GitHub email settings and use the provided address in the form:

  ```text
  <ID>+<username>@users.noreply.github.com
  ```

  Configure it locally with:

  ```bash
  git config --global user.email "<ID>+<username>@users.noreply.github.com"
  ```

---

## Compliance Checklist

- [ ] Profile has real name, bio, avatar, and verified website
- [ ] Profile README repository exists and is populated
- [ ] Up to 6 best repositories pinned (GitHub's maximum)
- [ ] Two-factor authentication enabled
- [ ] Commit email set to the `ID+username@users.noreply.github.com` no-reply address
- [ ] GitHub used as social login for Vercel / Netlify / VS Code where applicable
- [ ] Numerical User ID recorded for any automation that identifies the contributor

---

*Part of the Revvel Master Standards. See [`README.md`](README.md) for the full inventory.*
