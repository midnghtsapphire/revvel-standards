# Contributing to oAudrey

Welcome! We appreciate your interest in contributing to the oAudrey hub.

## Development Setup

1. Clone the repository and navigate to the `oaudrey` directory.
2. Run the site locally using any basic HTTP server. For example:
   ```bash
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser.
4. For more details, see [LOCAL_SETUP.md](./LOCAL_SETUP.md).

## Coding Standards

- **Static First**: This project uses plain HTML, CSS, and JavaScript. Do not introduce build tools (like Webpack or Vite) unless explicitly approved.
- **Tailwind CSS**: We use Tailwind CSS via CDN for styling. Stick to utility classes where possible.
- **Formatting**: Please ensure your code is formatted correctly. We recommend using Prettier for HTML/JS and markdownlint for Markdown files.
- **Security**: Always use `rel="noopener noreferrer"` on external links. Do not add inline scripts that violate the Content-Security-Policy.

## Submitting Pull Requests

1. Create a new branch for your feature or bugfix.
2. Make your changes and ensure they are tested locally.
3. Open a Draft PR to the `revvel-standards` repository (the host of the oAudrey directory).
4. Your PR will automatically be reviewed by our CI suite (OpenRouter, Jules, Semgrep, CodeQL). Address any feedback before marking it Ready for Review.
