/* ============================================================
 * Freedom Angel Corps Repo Manager — app.js
 *
 * Zero-dependency GitHub inventory + Revvel Standards audit.
 * All network calls go to api.github.com only. Token, if supplied,
 * is persisted in localStorage and never sent elsewhere.
 *
 * Reference: docs/Master_Inventory/ACCESSIBILITY_STANDARD.md,
 *            docs/Master_Inventory/COMPLIANCE_RUBRIC.md,
 *            docs/REPO_CATALOG.md
 * ============================================================ */

(function () {
  "use strict";

  /* ---------- Storage keys ---------- */
  var LS_TOKEN = "facrm.token";
  var LS_OWNER = "facrm.owner";
  var LS_MODE = "facrm.a11yMode";

  /* ---------- Standards checks ----------
   * Each check has an id, human label, and a fn(ctx) returning
   * a Promise<boolean | "pending"> — true means pass.
   */
  var CHECKS = [
    {
      id: "readme",
      label: "README.md present",
      run: function (ctx) {
        return hasFile(ctx, "README.md");
      },
    },
    {
      id: "license",
      label: "LICENSE present",
      run: function (ctx) {
        return hasFileAny(ctx, [
          "LICENSE",
          "LICENSE.md",
          "LICENSE.txt",
          "COPYING",
        ]);
      },
    },
    {
      id: "changelog",
      label: "CHANGELOG.md present",
      run: function (ctx) {
        return hasFileAny(ctx, ["CHANGELOG.md", "CHANGELOG"]);
      },
    },
    {
      id: "workflows",
      label: ".github/workflows/ present",
      run: function (ctx) {
        return hasDirectory(ctx, ".github/workflows");
      },
    },
    {
      id: "security",
      label: "SECURITY.md or security workflow",
      run: function (ctx) {
        return hasFile(ctx, "SECURITY.md").then(function (ok) {
          if (ok) return true;
          return hasFile(ctx, ".github/workflows/security.yml");
        });
      },
    },
    {
      id: "labels",
      label: "Standard labels (enhancement, bug, security)",
      run: function (ctx) {
        return gh(
          ctx,
          "/repos/" + ctx.owner + "/" + ctx.repo + "/labels?per_page=100"
        )
          .then(function (labels) {
            if (!Array.isArray(labels)) return false;
            var names = labels.map(function (l) {
              return String(l.name || "").toLowerCase();
            });
            var required = ["enhancement", "bug", "security"];
            return required.every(function (n) {
              return names.indexOf(n) !== -1;
            });
          })
          .catch(function () {
            return false;
          });
      },
    },
    {
      id: "accessibility",
      label: "README mentions accessibility",
      run: function (ctx) {
        return readmeText(ctx).then(function (txt) {
          return /accessib|wcag|a11y/i.test(txt || "");
        });
      },
    },
    {
      id: "ssot",
      label: "Inherits from revvel-standards",
      run: function (ctx) {
        return readmeText(ctx).then(function (txt) {
          return /revvel-standards/i.test(txt || "");
        });
      },
    },
  ];

  /* ---------- GitHub API helpers ---------- */

  function ghHeaders(token) {
    var h = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }

  function gh(ctx, path) {
    return fetch("https://api.github.com" + path, {
      headers: ghHeaders(ctx.token),
    }).then(function (res) {
      var remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining != null) updateRate(remaining);
      if (res.status === 404) return null;
      if (!res.ok) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (err) {
            var msg =
              (err && err.message) || "HTTP " + res.status + " from GitHub";
            var e = new Error(msg);
            e.status = res.status;
            throw e;
          });
      }
      return res.json();
    });
  }

  function hasFile(ctx, path) {
    return gh(
      ctx,
      "/repos/" +
        ctx.owner +
        "/" +
        ctx.repo +
        "/contents/" +
        encodeURIPath(path)
    )
      .then(function (data) {
        return !!data && !Array.isArray(data);
      })
      .catch(function () {
        return false;
      });
  }

  function hasDirectory(ctx, path) {
    return gh(
      ctx,
      "/repos/" +
        ctx.owner +
        "/" +
        ctx.repo +
        "/contents/" +
        encodeURIPath(path)
    )
      .then(function (data) {
        return Array.isArray(data) && data.length > 0;
      })
      .catch(function () {
        return false;
      });
  }

  function hasFileAny(ctx, paths) {
    // Sequential OR — stops at first hit to reduce API calls.
    return paths.reduce(function (chain, p) {
      return chain.then(function (found) {
        if (found) return true;
        return hasFile(ctx, p);
      });
    }, Promise.resolve(false));
  }

  function readmeText(ctx) {
    if (ctx._readmeCache !== undefined) return Promise.resolve(ctx._readmeCache);
    return gh(ctx, "/repos/" + ctx.owner + "/" + ctx.repo + "/readme")
      .then(function (data) {
        if (!data || !data.content) {
          ctx._readmeCache = "";
          return "";
        }
        try {
          var decoded = atob(data.content.replace(/\s+/g, ""));
          ctx._readmeCache = decoded;
          return decoded;
        } catch (e) {
          ctx._readmeCache = "";
          return "";
        }
      })
      .catch(function () {
        ctx._readmeCache = "";
        return "";
      });
  }

  function encodeURIPath(path) {
    return path
      .split("/")
      .map(encodeURIComponent)
      .join("/");
  }

  /* ---------- DOM helpers ---------- */

  function $(sel) {
    return document.querySelector(sel);
  }
  function $$(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function setStatus(msg, kind) {
    var el = $("#status");
    el.textContent = "";
    if (typeof msg === "string") {
      el.textContent = msg;
    } else if (msg instanceof Node) {
      el.appendChild(msg);
    }
    el.classList.remove("status-error", "status-success");
    if (kind) el.classList.add("status-" + kind);
  }

  function updateRate(remaining) {
    var el = $("#m-rate");
    if (el) el.textContent = remaining;
  }

  /* ---------- Rendering ---------- */

  var state = {
    owner: "",
    token: "",
    repos: [],
    auditResults: {}, // repoName -> {score, total, checks: [{id,label,status}]}
  };

  function renderRepoList(repos) {
    var list = $("#repo-list");
    list.textContent = "";
    var tpl = $("#repo-card-template");

    repos.forEach(function (repo) {
      var node = tpl.content.cloneNode(true);
      var article = node.querySelector(".repo-card");
      article.dataset.repo = repo.name;

      node.querySelector(".repo-name").textContent = repo.name;
      node.querySelector(".repo-description").textContent =
        repo.description || "No description provided.";

      var vis = node.querySelector(".repo-visibility");
      vis.textContent = repo.private ? "Private" : "Public";

      var link = node.querySelector(".repo-link");
      link.href = repo.html_url;
      link.textContent = "Open on GitHub ↗";

      var score = node.querySelector(".repo-score");
      score.textContent = "Not audited";
      score.dataset.tier = "";

      var checksEl = node.querySelector(".repo-checks");
      CHECKS.forEach(function (c) {
        var li = document.createElement("li");
        li.dataset.status = "pending";
        li.dataset.check = c.id;
        li.textContent = c.label;
        checksEl.appendChild(li);
      });

      var auditBtn = node.querySelector(".audit-btn");
      auditBtn.addEventListener("click", function () {
        auditOne(repo).catch(handleErr);
      });

      list.appendChild(node);
    });
  }

  function renderAuditResult(repoName, result) {
    var card = document.querySelector(
      '.repo-card[data-repo="' + cssEscape(repoName) + '"]'
    );
    if (!card) return;

    var score = card.querySelector(".repo-score");
    var pct = Math.round((result.score / result.total) * 100);
    score.textContent = result.score + " / " + result.total + " (" + pct + "%)";
    score.dataset.tier = pct >= 85 ? "good" : pct >= 60 ? "fair" : "poor";

    result.checks.forEach(function (c) {
      var li = card.querySelector('li[data-check="' + c.id + '"]');
      if (li) li.dataset.status = c.status;
    });
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    // Fallback: escape backslashes first, then any character that could
    // break out of a double-quoted attribute selector. Repo names from
    // GitHub cannot contain these characters today, but harden anyway.
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\a ")
      .replace(/\r/g, "\\d ");
  }

  function renderSummary() {
    var audited = Object.keys(state.auditResults).length;
    $("#m-total").textContent = state.repos.length;
    $("#m-audited").textContent = audited;
    if (audited > 0) {
      var pctSum = 0;
      Object.keys(state.auditResults).forEach(function (k) {
        var r = state.auditResults[k];
        pctSum += (r.score / r.total) * 100;
      });
      $("#m-avg").textContent = Math.round(pctSum / audited) + "%";
    } else {
      $("#m-avg").textContent = "—";
    }
  }

  /* ---------- Core flows ---------- */

  function loadRepos() {
    var owner = $("#owner").value.trim();
    var token = $("#token").value.trim();
    if (!owner) {
      setStatus("Please enter a GitHub owner or organization name.", "error");
      $("#owner").focus();
      return;
    }
    state.owner = owner;
    state.token = token;
    localStorage.setItem(LS_OWNER, owner);
    if (token) localStorage.setItem(LS_TOKEN, token);

    setStatus("Loading repositories for " + owner + "…");
    $("#summary-grid").hidden = true;
    $("#controls").hidden = true;
    $("#repo-list").textContent = "";

    fetchAllRepos(owner, token)
      .then(function (repos) {
        state.repos = repos.sort(function (a, b) {
          return a.name.localeCompare(b.name);
        });
        state.auditResults = {};
        renderRepoList(state.repos);
        renderSummary();
        $("#summary-grid").hidden = false;
        $("#controls").hidden = false;
        setStatus(
          "Loaded " +
            repos.length +
            " repositories. Click “Audit all” or audit a single repo.",
          "success"
        );
      })
      .catch(handleErr);
  }

  function fetchAllRepos(owner, token) {
    // Try /orgs/{owner}/repos first, fall back to /users/{owner}/repos.
    var ctx = { owner: owner, token: token };
    return gh(ctx, "/orgs/" + owner + "/repos?per_page=100&type=all")
      .then(function (data) {
        if (Array.isArray(data)) return data;
        return gh(ctx, "/users/" + owner + "/repos?per_page=100&type=owner");
      })
      .then(function (data) {
        return Array.isArray(data) ? data : [];
      });
  }

  function auditOne(repo) {
    var ctx = { owner: state.owner, repo: repo.name, token: state.token };
    setStatus("Auditing " + repo.name + "…");

    var results = CHECKS.map(function (c) {
      return Promise.resolve()
        .then(function () {
          return c.run(ctx);
        })
        .then(function (ok) {
          return { id: c.id, label: c.label, status: ok ? "pass" : "fail" };
        })
        .catch(function () {
          return { id: c.id, label: c.label, status: "fail" };
        });
    });

    return Promise.all(results).then(function (checks) {
      var score = checks.filter(function (c) {
        return c.status === "pass";
      }).length;
      var result = { score: score, total: checks.length, checks: checks };
      state.auditResults[repo.name] = result;
      renderAuditResult(repo.name, result);
      renderSummary();
      setStatus("Audit complete: " + repo.name, "success");
      return result;
    });
  }

  function auditAll() {
    if (state.repos.length === 0) return;
    var btn = $("#audit-all-btn");
    btn.disabled = true;
    setStatus("Auditing " + state.repos.length + " repositories sequentially…");

    var i = 0;
    function next() {
      if (i >= state.repos.length) {
        btn.disabled = false;
        setStatus(
          "All audits complete (" + state.repos.length + " repos).",
          "success"
        );
        return Promise.resolve();
      }
      var repo = state.repos[i++];
      return auditOne(repo)
        .catch(function () {
          /* swallow — already logged */
        })
        .then(next);
    }
    next();
  }

  function exportReport() {
    var payload = {
      generatedAt: new Date().toISOString(),
      owner: state.owner,
      totalRepos: state.repos.length,
      audits: state.auditResults,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download =
      "revvel-audit-" + state.owner + "-" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  function applyFilter() {
    var q = $("#filter").value.trim().toLowerCase();
    $$(".repo-card").forEach(function (card) {
      var name = card.dataset.repo.toLowerCase();
      var desc = (
        card.querySelector(".repo-description").textContent || ""
      ).toLowerCase();
      var match = !q || name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      card.style.display = match ? "" : "none";
    });
  }

  function forgetToken() {
    localStorage.removeItem(LS_TOKEN);
    $("#token").value = "";
    state.token = "";
    setStatus("Token removed from this browser.", "success");
  }

  function handleErr(err) {
    console.error(err);
    var msg = (err && err.message) || "Unknown error";
    if (err && err.status === 401) {
      msg = "GitHub rejected your token (401). Please check it and retry.";
    } else if (err && err.status === 403) {
      msg =
        "GitHub rate limit or permission error (403). Add a token or wait and retry.";
    } else if (err && err.status === 404) {
      msg = "Owner not found on GitHub (404).";
    }
    setStatus("Error: " + msg, "error");
  }

  /* ---------- Accessibility mode ---------- */

  function applyA11yMode(mode) {
    var valid = [
      "standard",
      "wcag_aaa",
      "dyslexia",
      "adhd",
      "sensory",
      "large_print",
      "eco",
    ];
    if (valid.indexOf(mode) === -1) mode = "standard";
    document.documentElement.setAttribute("data-a11y-mode", mode);
    $("#a11y-mode").value = mode;
    localStorage.setItem(LS_MODE, mode);
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    // Restore persisted state
    var savedOwner = localStorage.getItem(LS_OWNER);
    var savedToken = localStorage.getItem(LS_TOKEN);
    var savedMode = localStorage.getItem(LS_MODE) || "standard";
    if (savedOwner) $("#owner").value = savedOwner;
    if (savedToken) $("#token").value = savedToken;
    applyA11yMode(savedMode);

    $("#auth-form").addEventListener("submit", function (e) {
      e.preventDefault();
      loadRepos();
    });
    $("#forget-btn").addEventListener("click", forgetToken);
    $("#audit-all-btn").addEventListener("click", auditAll);
    $("#export-btn").addEventListener("click", exportReport);
    $("#filter").addEventListener("input", applyFilter);
    $("#a11y-mode").addEventListener("change", function (e) {
      applyA11yMode(e.target.value);
    });
  });
})();
