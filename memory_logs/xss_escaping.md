## XSS Escaping Pattern

When directly interpolating strings into `innerHTML`, ensure user-supplied data (such as API responses for titles, names, URLs, and labels) is escaped to prevent Cross-Site Scripting (XSS).

A standard utility to add within HTML scripts for this is:

```javascript
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

Apply this specifically to variables that could contain user-generated content or arbitrary strings.
