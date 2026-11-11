/* GitCandyland world. Stations and quotes come from /api/team and /api/hub.
   A missing feed draws the island with the host sitting still. No invented
   checks. 2026-11-11 MarketShipper. */
(function (root) {
  var SPOTS = {
    pushPier: [120, 86],
    prGate: [330, 72],
    checkGrove: [600, 96],
    reviewHut: [830, 210],
    fixIt: [760, 420],
    mergeLagoon: [430, 462],
    releaseVolcano: [150, 400]
  };
  var HUB = [470, 255];
  var images = {};

  function loadImage(src) {
    if (!src || images[src]) return images[src];
    var image = new root.Image();
    image.src = src;
    images[src] = image;
    return image;
  }

  function themeOf(id) {
    return root.OaudreyThemes.get(id);
  }

  function drawTree(ctx, theme, x, y) {
    if (theme.tree === 'palm') {
      ctx.strokeStyle = '#6b3f1f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 8, y - 28, x, y - 48);
      ctx.stroke();
      ctx.fillStyle = '#1f8a70';
      for (var i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(x, y - 48, 18, 6, (i * Math.PI) / 3, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    ctx.strokeStyle = '#f7f4ee';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 28);
    ctx.stroke();
    ctx.fillStyle = theme.wall[iColor(x)];
    ctx.beginPath();
    ctx.arc(x, y - 38, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  function iColor(n) {
    return Math.abs(Math.floor(n)) % 4;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStation(ctx, theme, id, lit, t) {
    var p = SPOTS[id];
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.fillStyle = lit ? theme.accent : theme.station;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    if (theme.tree === 'palm') {
      roundRect(ctx, -28, -16, 56, 28, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.fillRect(-6, -28, 8, 14);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, lit ? 18 : 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = theme.ink;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(theme.stations[id], 0, 32);
    if (id === 'checkGrove') ctx.fillText('CircleCI · Sonar', 0, 46);
    ctx.restore();
    if (lit) {
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t / 20);
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawHub(ctx, theme, boards) {
    ctx.save();
    ctx.translate(HUB[0], HUB[1]);
    ctx.fillStyle = theme.tree === 'palm' ? '#c9854a' : '#fff6ea';
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, -70, -36, 140, 78, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.moveTo(-78, -30);
    ctx.lineTo(0, -68);
    ctx.lineTo(78, -30);
    ctx.closePath();
    ctx.fill();
    var shown = (boards || []).slice(0, 2);
    shown.forEach(function (board, index) {
      var y = -8 + index * 22;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-58, y, 116, 18);
      ctx.strokeRect(-58, y, 116, 18);
      ctx.fillStyle = theme.ink;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      var title = (board.title || 'Whiteboard').slice(0, 22);
      ctx.fillText(title, -54, y + 13);
    });
    ctx.restore();
    var host = loadImage('oaudrey-mascot.svg');
    if (host && host.complete) ctx.drawImage(host, HUB[0] - 28, HUB[1] - 78, 56, 56);
  }

  function pointAlong(a, b, u) {
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }

  function drawBot(ctx, theme, bot, t) {
    var here = SPOTS[bot.station] || HUB;
    var dest = bot.activity === 'handoff' && SPOTS[bot.handoffStation] ? SPOTS[bot.handoffStation] : here;
    var u = bot.activity === 'handoff' ? (Math.sin(t / 30) + 1) / 2 : 0;
    if (bot.activity === 'idle') here = [here[0] + 18, here[1] + 16];
    var p = pointAlong(here, dest, u);
    if (bot.activity === 'working') p[0] += Math.sin(t / 8) * 8;
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.stroke();
    var logo = bot.logo ? loadImage(bot.logo) : null;
    if (logo && logo.complete) ctx.drawImage(logo, -12, -12, 24, 24);
    if (bot.activity === 'failed') {
      ctx.fillStyle = theme.tree === 'palm' ? '#355070' : '#d6ff4a';
      ctx.beginPath();
      ctx.arc(22, 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (bot.activity === 'handoff') {
      if (theme.handoff === 'surf') {
        ctx.fillStyle = '#f2c14e';
        ctx.fillRect(16, -6, 18, 6);
      } else {
        ctx.fillStyle = '#fff';
        ctx.strokeRect(16, -8, 16, 12);
        ctx.fillStyle = theme.ink;
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(bot.prNumber ? '#' + bot.prNumber : '#', 18, 1);
      }
    }
    if (bot.activity === 'idle') {
      ctx.fillStyle = theme.ink;
      ctx.font = '12px ui-monospace, monospace';
      ctx.fillText('z', 14, -14 + Math.sin(t / 10) * 2);
    }
    if (bot.speech) {
      roundRect(ctx, -70, -48, 140, 26, 8);
      ctx.fillStyle = '#fffef8';
      ctx.fill();
      ctx.strokeStyle = theme.ink;
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(bot.speech).slice(0, 28), 0, -31);
    }
    ctx.restore();
    bot._x = p[0];
    bot._y = p[1];
  }

  function paint(ctx, theme, model, t) {
    var w = ctx.canvas.width;
    var h = ctx.canvas.height;
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(1, theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = theme.pathEdge;
    ctx.lineWidth = 28;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    var keys = Object.keys(SPOTS);
    keys.forEach(function (id, index) {
      var p = SPOTS[id];
      if (index === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = theme.path;
    ctx.lineWidth = 18;
    ctx.stroke();
    keys.forEach(function (id, index) {
      var a = SPOTS[id];
      var b = SPOTS[keys[(index + 1) % keys.length]];
      for (var step = 1; step < 5; step += 1) {
        var q = pointAlong(a, b, step / 5);
        var eaten = model.munch && Math.floor(t / 12) % 5 === step;
        if (eaten) continue;
        ctx.fillStyle = theme.pellet;
        ctx.beginPath();
        ctx.arc(q[0], q[1], 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    for (var n = 0; n < 8; n += 1) {
      drawTree(ctx, theme, 40 + (n % 4) * 240, 40 + Math.floor(n / 4) * 460);
    }
    keys.forEach(function (id) {
      var lit = model.stations && model.stations[id] && model.stations[id].lit;
      drawStation(ctx, theme, id, !!lit, t);
    });
    drawHub(ctx, theme, model.boards || []);
    (model.envelopes || []).forEach(function (item) {
      var path = (item.stations || []).map(function (id) { return SPOTS[id]; }).filter(Boolean);
      if (!path.length) return;
      var at = Math.max(0, path.length - 1);
      var p = path[at];
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = theme.ink;
      ctx.strokeRect(p[0] - 10, p[1] - 22, 22, 14);
      ctx.fillRect(p[0] - 10, p[1] - 22, 22, 14);
      ctx.fillStyle = theme.ink;
      ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('#' + item.number, p[0] - 8, p[1] - 12);
    });
    (model.bots || []).forEach(function (bot) { drawBot(ctx, theme, bot, t); });
  }

  function card(bot) {
    var article = document.createElement('article');
    article.className = 'product team-card';
    if (bot.logo) {
      var img = document.createElement('img');
      img.src = bot.logo;
      img.alt = '';
      img.width = 40;
      img.height = 40;
      article.appendChild(img);
    }
    var title = document.createElement('h3');
    title.textContent = bot.name || bot.id;
    article.appendChild(title);
    var badge = document.createElement('p');
    var label = bot.activity === 'failed' ? 'Failing' : bot.activity === 'working' ? 'Pending' : bot.activity === 'handoff' ? 'Handoff' : 'Idle';
    badge.textContent = label;
    badge.className = 'badge badge-' + (bot.activity || 'idle');
    article.appendChild(badge);
    if (bot.speech) {
      var quote = document.createElement('p');
      quote.textContent = bot.speech;
      quote.title = 'quoted from GitHub';
      article.appendChild(quote);
    }
    return article;
  }

  function fillDom(model) {
    var caption = document.getElementById('world-caption');
    var closed = document.getElementById('hub-closed');
    var boards = document.getElementById('hub-boards');
    var team = document.getElementById('team-board');
    var score = document.getElementById('team-score');
    var mood = document.getElementById('team-mood');
    if (!model.connected) {
      if (caption) caption.textContent = "Live feed not connected — everyone's on break";
      if (closed) closed.hidden = false;
      if (boards) boards.replaceChildren();
      if (team) team.replaceChildren();
      if (score) score.textContent = '';
      if (mood) mood.textContent = '';
      return;
    }
    if (caption) caption.textContent = model.brand + ' · live from GitHub';
    if (closed) closed.hidden = true;
    if (boards) {
      boards.replaceChildren();
      (model.boardLinks || []).forEach(function (link) {
        var a = document.createElement('a');
        a.className = 'go';
        a.href = link.url;
        a.rel = 'noopener noreferrer';
        a.textContent = link.title || link.label;
        boards.appendChild(a);
      });
    }
    if (team) {
      team.replaceChildren();
      (model.bots || []).forEach(function (bot) { team.appendChild(card(bot)); });
    }
    if (score) score.textContent = model.passing + ' passing · ' + model.failing + ' failing';
    if (mood) mood.textContent = model.failing > model.passing && model.failing > 0 ? 'the bots are learning 😴' : '';
  }

  function modelFromPayload(team, hub, theme) {
    if (!team || team.connected === false) {
      return { connected: false, brand: theme.brand, stations: {}, bots: [], boards: [], munch: false };
    }
    var links = [];
    var boards = [];
    ((hub && hub.connected !== false && hub.boards) || []).forEach(function (board) {
      (board.threads || []).forEach(function (thread) {
        if (!thread || !thread.url) return;
        links.push({ url: thread.url, title: thread.title, label: board.label });
        boards.push({ title: thread.title || board.label, url: thread.url });
      });
    });
    var bots = (team.team || []).map(function (bot) {
      var next = Object.assign({}, bot);
      if (bot.handoffTo) {
        var other = (team.team || []).find(function (item) { return item.id === bot.handoffTo; });
        next.handoffStation = other && other.station ? other.station : 'reviewHut';
      }
      return next;
    });
    return {
      connected: true,
      brand: theme.brand,
      stations: team.stations || {},
      bots: bots,
      envelopes: (team.prs || []).map(function (pr) {
        return { number: pr.number, stations: pr.stations || [pr.station] };
      }),
      boards: boards,
      boardLinks: links,
      passing: team.passing || 0,
      failing: team.failing || 0,
      munch: bots.some(function (bot) { return bot.activity === 'working'; })
    };
  }

  function start(canvas, options) {
    var opts = options || {};
    var themeId = opts.themeId || root.OaudreyThemes.defaultId;
    var reduced = opts.reducedMotion;
    if (reduced == null && root.matchMedia) reduced = root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = canvas.getContext('2d');
    var t = 0;
    var model = { connected: false, stations: {}, bots: [], boards: [] };
    var tip = document.getElementById('world-tip');
    function stillFrame() {
      var mode = document.documentElement.getAttribute('data-a11y');
      return reduced || mode === 'sensory' || mode === 'eco';
    }
    function frame() {
      var still = stillFrame();
      paint(ctx, themeOf(themeId), model, still ? 0 : t);
      if (!still) {
        t += 1;
        root.requestAnimationFrame(frame);
      }
    }
    function apply(team, hub) {
      model = modelFromPayload(team, hub, themeOf(themeId));
      fillDom(model);
      if (reduced) paint(ctx, themeOf(themeId), model, 0);
    }
    canvas.addEventListener('pointermove', function (event) {
      if (!tip) return;
      var rect = canvas.getBoundingClientRect();
      var x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      var y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      var hit = (model.bots || []).find(function (bot) {
        return bot._x != null && Math.hypot(bot._x - x, bot._y - y) < 28;
      });
      if (!hit) {
        tip.textContent = '';
        return;
      }
      tip.textContent = (hit.name || hit.id) + ' · ' + (hit.activity || 'idle') + (hit.speech ? ' · quoted from GitHub' : '');
    });
    canvas.addEventListener('click', function (event) {
      var rect = canvas.getBoundingClientRect();
      var x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      var y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      if (Math.hypot(HUB[0] - x, HUB[1] - y) < 80 && model.boardLinks && model.boardLinks[0]) {
        root.open(model.boardLinks[0].url, '_blank', 'noopener');
      }
    });
    function setTheme(id) {
      themeId = themeOf(id).id;
      try { root.localStorage.setItem('oaudrey-theme', themeId); } catch (error) { /* storage can be blocked */ }
      document.documentElement.dataset.theme = themeId;
    }
    document.querySelectorAll('[data-theme-id]').forEach(function (button) {
      button.addEventListener('click', function () { setTheme(button.getAttribute('data-theme-id')); });
    });
    try {
      var saved = root.localStorage.getItem('oaudrey-theme');
      if (saved) themeId = themeOf(saved).id;
    } catch (error) { /* ignore */ }
    document.documentElement.dataset.theme = themeId;
    if (opts.fixture) apply(opts.fixture.team, opts.fixture.hub);
    else {
      function poll() {
        Promise.all([
          fetch('/api/team').then(function (res) { return res.ok ? res.json() : null; }),
          fetch('/api/hub').then(function (res) { return res.ok ? res.json() : null; })
        ]).then(function (pair) {
          apply(pair[0], pair[1]);
        }).catch(function () { apply(null, null); });
      }
      poll();
      root.setInterval(poll, 60000);
    }
    frame();
    return { setTheme: setTheme, apply: apply };
  }

  root.OaudreyWorld = { start: start, paint: paint };

  function boot() {
    var canvas = document.getElementById('candy-world');
    if (!canvas || !root.OaudreyThemes) return;
    if (canvas.getAttribute('data-fixture') === '1') {
      start(canvas, { fixture: root.OAUDREY_FIXTURE, reducedMotion: false });
      return;
    }
    start(canvas, {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window === 'undefined' ? globalThis : window);
