/* Maze world for GitCandyland and GitAloha. Stations, quotes, and pellets
   follow /api/team. A missing feed draws the maze with the host napping.
   2026-11-11 MarketShipper. */
(function (root) {
  var ROWS = [
    '#######################',
    '#P..#....T......#...#C#',
    '#.#.#.#########.#.#.#.#',
    '#.#...#.......#.#.#...#',
    '#.###.#.##.##.#.#.###.#',
    '#..T..#.#...#.#.#..T..#',
    '###.#.#.#####.#.#.#.###',
    '#G..#...#HHH#...#...#R#',
    '#.#.###.#HHH#.###.#.#.#',
    '#.#...#.#HHH#.#...#.#.#',
    '#.###.#.#####.#.###.#.#',
    '#M..#.........#.....#F#',
    '#.#.#########.#####.#.#',
    '#V..T...............T.#',
    '#######################'
  ];
  var STATION_OF = {
    P: 'pushPier',
    G: 'prGate',
    C: 'checkGrove',
    R: 'reviewHut',
    F: 'fixIt',
    M: 'mergeLagoon',
    V: 'releaseVolcano'
  };
  var CELL = 56;
  var MARGIN = 58;
  var COLS = ROWS[0].length;
  var GRID_ROWS = ROWS.length;
  var images = {};
  var eaten = {};

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

  function cellChar(c, r) {
    if (r < 0 || c < 0 || r >= GRID_ROWS || c >= COLS) return '#';
    return ROWS[r].charAt(c);
  }

  function isWall(ch) { return ch === '#'; }
  function isHub(ch) { return ch === 'H'; }
  function isTree(ch) { return ch === 'T'; }
  function isPath(ch) { return ch === '.' || isTree(ch) || STATION_OF[ch] || isHub(ch); }

  function cellOrigin(c, r) {
    return [MARGIN + c * CELL + CELL / 2, MARGIN + r * CELL + CELL / 2];
  }

  function roundRect(ctx, x, y, w, h, rad) {
    var r = Math.min(rad, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function findStations() {
    var list = [];
    var hub = null;
    for (var r = 0; r < GRID_ROWS; r += 1) {
      for (var c = 0; c < COLS; c += 1) {
        var ch = cellChar(c, r);
        if (STATION_OF[ch]) {
          var p = cellOrigin(c, r);
          list.push({ id: STATION_OF[ch], c: c, r: r, x: p[0], y: p[1] });
        }
        if (ch === 'H' && !hub) hub = { c: c, r: r };
      }
    }
    return { stations: list, hub: hub };
  }

  var LAYOUT = findStations();

  function stationById(id) {
    for (var i = 0; i < LAYOUT.stations.length; i += 1) {
      if (LAYOUT.stations[i].id === id) return LAYOUT.stations[i];
    }
    return LAYOUT.stations[0];
  }

  function neighbors(c, r) {
    var out = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      var nc = c + d[0];
      var nr = r + d[1];
      if (isPath(cellChar(nc, nr))) out.push([nc, nr]);
    });
    return out;
  }

  function bfs(from, to) {
    var start = from.c + ',' + from.r;
    var goal = to.c + ',' + to.r;
    var queue = [start];
    var prev = {};
    prev[start] = null;
    while (queue.length) {
      var key = queue.shift();
      if (key === goal) break;
      var bits = key.split(',');
      neighbors(Number(bits[0]), Number(bits[1])).forEach(function (n) {
        var nk = n[0] + ',' + n[1];
        if (prev[nk] === undefined) {
          prev[nk] = key;
          queue.push(nk);
        }
      });
    }
    var path = [];
    var cursor = prev[goal] === undefined ? null : goal;
    while (cursor) {
      var part = cursor.split(',');
      path.push(cellOrigin(Number(part[0]), Number(part[1])));
      cursor = prev[cursor];
    }
    path.reverse();
    return path.length ? path : [cellOrigin(from.c, from.r)];
  }

  function drawCandyWall(ctx, theme, x, y) {
    var left = x - CELL / 2 + 4;
    var top = y - CELL / 2 + 4;
    var size = CELL - 8;
    if ((Math.round(x / CELL) + Math.round(y / CELL)) % 2 === 0) {
      roundRect(ctx, left, top, size, size, 10);
      ctx.save();
      ctx.clip();
      for (var band = 0; band < size; band += 8) {
        ctx.fillStyle = band % 16 === 0 ? '#e23b4a' : '#fff';
        ctx.fillRect(left, top + band, size, 8);
      }
      ctx.restore();
      ctx.strokeStyle = '#9a1b2e';
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    ctx.fillStyle = theme.wall[(Math.round(x / 9) + Math.round(y / 5)) % theme.wall.length];
    ctx.beginPath();
    ctx.arc(x, y, CELL * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, CELL * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRock(ctx, theme, x, y) {
    ctx.fillStyle = theme.wall[(Math.round(x / 7) + Math.round(y / 5)) % theme.wall.length];
    roundRect(ctx, x - CELL * 0.42, y - CELL * 0.36, CELL * 0.84, CELL * 0.72, 14);
    ctx.fill();
    ctx.strokeStyle = '#0c2a24';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawLollipop(ctx, theme, x, y) {
    ctx.strokeStyle = '#f4efe6';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 16);
    ctx.lineTo(x, y - 10);
    ctx.stroke();
    ctx.fillStyle = theme.wall[Math.abs(Math.round(x)) % theme.wall.length];
    ctx.beginPath();
    ctx.arc(x, y - 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 18, 12, 0.2, 1.4);
    ctx.stroke();
  }

  function drawPalm(ctx, x, y) {
    ctx.strokeStyle = '#6b3f1f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x, y + 18);
    ctx.quadraticCurveTo(x + 10, y - 8, x, y - 28);
    ctx.stroke();
    ctx.fillStyle = '#1f8a70';
    for (var i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y - 28, 22, 7, (i * Math.PI) / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBuilding(ctx, theme, id, x, y, lit) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = theme.ink;
    var body = lit ? theme.accent : theme.station;
    if (id === 'pushPier') {
      ctx.fillStyle = theme.tree === 'palm' ? '#c9854a' : '#f6d7a8';
      roundRect(ctx, -22, -8, 44, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.fillRect(-16, -18, 4, 14);
      ctx.fillRect(12, -18, 4, 14);
    } else if (id === 'prGate') {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-24, 16);
      ctx.lineTo(-24, -8);
      ctx.arc(0, -8, 24, Math.PI, 0);
      ctx.lineTo(24, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (id === 'checkGrove') {
      ctx.fillStyle = '#fff';
      roundRect(ctx, -26, -4, 24, 20, 4);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, 2, -4, 24, 20, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.moveTo(-26, -4);
      ctx.lineTo(-14, -18);
      ctx.lineTo(-2, -4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -4);
      ctx.lineTo(14, -18);
      ctx.lineTo(26, -4);
      ctx.fill();
    } else if (id === 'reviewHut') {
      ctx.fillStyle = body;
      roundRect(ctx, -20, -4, 40, 22, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.moveTo(-26, -2);
      ctx.lineTo(0, -22);
      ctx.lineTo(26, -2);
      ctx.fill();
      ctx.stroke();
    } else if (id === 'fixIt') {
      ctx.fillStyle = body;
      roundRect(ctx, -22, -2, 44, 22, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e23b4a';
      ctx.fillRect(-22, -10, 44, 8);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-22, -8, 8, 6);
      ctx.fillRect(-6, -8, 8, 6);
      ctx.fillRect(10, -8, 8, 6);
    } else if (id === 'mergeLagoon') {
      ctx.fillStyle = theme.water || '#7fd0ff';
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = lit ? '#ff6b3d' : '#c4492a';
      ctx.beginPath();
      ctx.moveTo(-26, 16);
      ctx.lineTo(0, -24);
      ctx.lineTo(26, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(0, -8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCastle(ctx, theme, box) {
    var x = box.x;
    var y = box.y;
    var w = box.w;
    var h = box.h;
    ctx.save();
    if (theme.tree === 'palm') {
      ctx.fillStyle = '#e7c48a';
      roundRect(ctx, x, y, w, h, 10);
      ctx.fill();
      ctx.strokeStyle = theme.ink;
      ctx.stroke();
      ctx.fillStyle = '#1f8a70';
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 8);
      ctx.lineTo(x + w / 2, y - 28);
      ctx.lineTo(x + w + 8, y + 8);
      ctx.fill();
    } else {
      ctx.fillStyle = '#c47a45';
      roundRect(ctx, x, y + 10, w, h - 10, 8);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ff8fb8';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + 8, w * 0.55, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e23b4a';
      ctx.beginPath();
      ctx.arc(x + w / 2, y - 6, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 8, y + h * 0.35, w - 16, 28, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function labelBoxes(ctx, theme) {
    ctx.font = 'bold 14px ui-monospace, Menlo, monospace';
    var placed = [];
    LAYOUT.stations.forEach(function (st) {
      var text = theme.stations[st.id];
      var w = ctx.measureText(text).width + 18;
      var h = 24;
      var x = st.x - w / 2;
      var y = st.r <= 2 ? st.y - CELL - 8 : st.r >= GRID_ROWS - 3 ? st.y + CELL * 0.62 : st.y - CELL - 8;
      if (st.c <= 2 && st.r > 2) x = 8;
      if (st.c >= COLS - 3 && st.r > 2) {
        x = st.x - w / 2;
        y = st.y - CELL - 8;
      }
      var guard = 0;
      function hit(box) {
        return placed.some(function (p) {
          return !(box.x + box.w < p.x || p.x + p.w < box.x || box.y + box.h < p.y || p.y + p.h < box.y);
        });
      }
      var box = { x: x, y: y, w: w, h: h, text: text };
      var limit = MARGIN * 2 + COLS * CELL - 6;
      if (box.x < 4) box.x = 4;
      if (box.x + box.w > limit) box.x = limit - box.w;
      while (hit(box) && guard < 10) {
        box.y += 26;
        guard += 1;
      }
      placed.push(box);
    });
    return placed;
  }

  function drawPill(ctx, theme, box) {
    ctx.fillStyle = theme.tree === 'palm' ? '#fff8e8' : '#fff';
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 2;
    roundRect(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.ink;
    ctx.font = 'bold 14px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(box.text, box.x + 9, box.y + box.h / 2);
  }

  function drawBot(ctx, theme, bot, t) {
    var home = stationById(bot.station || 'prGate');
    var dest = bot.activity === 'handoff' ? stationById(bot.handoffStation || 'reviewHut') : home;
    var path = bot.activity === 'handoff' ? bfs(home, dest) : [cellOrigin(home.c, home.r)];
    var u = bot.activity === 'handoff' ? ((Math.sin(t / 40) + 1) / 2) * (path.length - 1) : 0;
    var i0 = Math.floor(u);
    var i1 = Math.min(path.length - 1, i0 + 1);
    var f = u - i0;
    var p = [
      path[i0][0] + (path[i1][0] - path[i0][0]) * f,
      path[i0][1] + (path[i1][1] - path[i0][1]) * f
    ];
    if (bot.activity === 'working') {
      var step = neighbors(home.c, home.r)[0];
      if (step) {
        var q = cellOrigin(step[0], step[1]);
        var m = (Math.sin(t / 10) + 1) / 2;
        p = [home.x + (q[0] - home.x) * m, home.y + (q[1] - home.y) * m];
        eaten[home.c + ',' + home.r] = true;
        if (m > 0.45) eaten[step[0] + ',' + step[1]] = true;
      }
    }
    if (bot.activity === 'idle') p = [home.x + 6, home.y + 4];
    ctx.save();
    ctx.translate(p[0], p[1]);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.lineTo(-18, 30);
    ctx.moveTo(12, 14);
    ctx.lineTo(18, 30);
    ctx.stroke();
    ctx.fillStyle = '#f7f4ee';
    roundRect(ctx, -24, -8, 48, 36, 12);
    ctx.fill();
    ctx.stroke();
    var logo = bot.logo ? loadImage(bot.logo) : null;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -24, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (logo && logo.complete && logo.naturalWidth) ctx.drawImage(logo, -12, -36, 24, 24);
    ctx.fillStyle = '#16324f';
    if (bot.activity === 'idle') {
      ctx.fillRect(-14, 6, 12, 3);
      ctx.fillRect(2, 6, 12, 3);
      ctx.font = 'bold 22px ui-monospace, Menlo, monospace';
      ctx.fillText('z z z', 18, -46 + Math.sin(t / 8) * 3);
    } else {
      ctx.beginPath();
      ctx.arc(-8, 8, 3, 0, Math.PI * 2);
      ctx.arc(8, 8, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (bot.activity === 'failed') {
      ctx.fillStyle = theme.tree === 'palm' ? '#355070' : '#c6f25a';
      ctx.beginPath();
      ctx.arc(26, 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (bot.activity === 'handoff') {
      ctx.fillStyle = theme.handoff === 'surf' ? '#f2c14e' : '#fff';
      roundRect(ctx, 20, -18, 28, 16, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.fillText(bot.prNumber ? '#' + bot.prNumber : '#', 24, -6);
    }
    if (bot.speech) {
      ctx.font = '12px ui-monospace, Menlo, monospace';
      var quote = String(bot.speech).slice(0, 26);
      var bw = ctx.measureText(quote).width + 14;
      ctx.fillStyle = '#fffef8';
      roundRect(ctx, -bw / 2, -48, bw, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.textAlign = 'center';
      ctx.fillText(quote, 0, -34);
    }
    ctx.restore();
    bot._x = p[0];
    bot._y = p[1];
  }

  function paint(ctx, theme, model, t) {
    var w = MARGIN * 2 + COLS * CELL;
    var h = MARGIN * 2 + GRID_ROWS * CELL;
    if (ctx.canvas.width !== w) ctx.canvas.width = w;
    if (ctx.canvas.height !== h) ctx.canvas.height = h;
    var sky = ctx.createLinearGradient(0, 0, 0, h);
    if (theme.tree === 'palm') {
      sky.addColorStop(0, '#08324a');
      sky.addColorStop(1, theme.water || '#1aa6c9');
    } else {
      sky.addColorStop(0, theme.sky[0]);
      sky.addColorStop(1, theme.sky[1]);
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    if (theme.tree === 'palm') {
      ctx.fillStyle = theme.path;
      roundRect(ctx, MARGIN - 18, MARGIN - 18, COLS * CELL + 36, GRID_ROWS * CELL + 36, 28);
      ctx.fill();
      for (var palm = 0; palm < 6; palm += 1) {
        drawPalm(ctx, 36 + palm * 220, palm % 2 === 0 ? 30 : h - 20);
      }
    }
    var hubBox = null;
    for (var r = 0; r < GRID_ROWS; r += 1) {
      for (var c = 0; c < COLS; c += 1) {
        var ch = cellChar(c, r);
        var p = cellOrigin(c, r);
        if (isWall(ch)) {
          if (theme.tree === 'palm') drawRock(ctx, theme, p[0], p[1]);
          else drawCandyWall(ctx, theme, p[0], p[1]);
        } else if (isPath(ch)) {
          ctx.fillStyle = theme.tree === 'palm' ? '#e7c48a' : theme.path;
          ctx.fillRect(p[0] - CELL / 2, p[1] - CELL / 2, CELL, CELL);
        }
        if (ch === 'H') {
          if (!hubBox) hubBox = { x: p[0] - CELL / 2, y: p[1] - CELL / 2, w: CELL, h: CELL };
          else {
            hubBox.w = Math.max(hubBox.w, p[0] + CELL / 2 - hubBox.x);
            hubBox.h = Math.max(hubBox.h, p[1] + CELL / 2 - hubBox.y);
          }
        }
      }
    }
    for (r = 0; r < GRID_ROWS; r += 1) {
      for (c = 0; c < COLS; c += 1) {
        ch = cellChar(c, r);
        if (ch !== '.' && ch !== 'T') continue;
        if (eaten[c + ',' + r]) continue;
        p = cellOrigin(c, r);
        if (theme.tree === 'palm') {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e23b4a';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 4, 0.2, 2.2);
          ctx.stroke();
        }
      }
    }
    for (r = 0; r < GRID_ROWS; r += 1) {
      for (c = 0; c < COLS; c += 1) {
        if (cellChar(c, r) !== 'T') continue;
        p = cellOrigin(c, r);
        if (theme.tree === 'palm') drawPalm(ctx, p[0], p[1] + 10);
        else drawLollipop(ctx, theme, p[0], p[1]);
      }
    }
    if (hubBox) drawCastle(ctx, theme, hubBox);
    var host = loadImage('oaudrey-mascot.svg');
    if (hubBox && host && host.complete && host.naturalWidth) {
      ctx.drawImage(host, hubBox.x + hubBox.w / 2 - 24, hubBox.y - 36, 48, 48);
      if (!model.connected) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px ui-monospace, Menlo, monospace';
        ctx.fillText('z z z', hubBox.x + hubBox.w / 2 + 18, hubBox.y - 20);
      }
    }
    LAYOUT.stations.forEach(function (st) {
      var lit = model.stations && model.stations[st.id] && model.stations[st.id].lit;
      drawBuilding(ctx, theme, st.id, st.x, st.y, !!lit);
    });
    labelBoxes(ctx, theme).forEach(function (box) { drawPill(ctx, theme, box); });
    (model.envelopes || []).forEach(function (item) {
      var ids = item.stations || [];
      if (!ids.length) return;
      var last = stationById(ids[ids.length - 1]);
      var prev = ids.length > 1 ? stationById(ids[ids.length - 2]) : last;
      var path = bfs(prev, last);
      var u = ((t / 50) % 1) * Math.max(0, path.length - 1);
      var i0 = Math.min(path.length - 1, Math.floor(u));
      var i1 = Math.min(path.length - 1, i0 + 1);
      var f = u - i0;
      var ep = path[i0] && path[i1]
        ? [path[i0][0] + (path[i1][0] - path[i0][0]) * f, path[i0][1] + (path[i1][1] - path[i0][1]) * f]
        : [last.x, last.y];
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = theme.ink;
      roundRect(ctx, ep[0] - 16, ep[1] - 28, 32, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.ink;
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('#' + item.number, ep[0] - 12, ep[1] - 15);
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
    if (model.fixture) {
      if (caption) caption.textContent = 'Fixture — not live data';
    } else if (!model.connected) {
      if (caption) caption.textContent = "Live feed not connected — everyone's on break";
    } else if (caption) caption.textContent = model.brand + ' · live from GitHub';
    if (!model.connected) {
      if (closed) closed.hidden = false;
      if (boards) boards.replaceChildren();
      if (team) team.replaceChildren();
      if (score) score.textContent = '';
      if (mood) mood.textContent = '';
      return;
    }
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

  function modelFromPayload(team, hub, theme, fixture) {
    if (!team || team.connected === false) {
      return { connected: false, fixture: !!fixture, brand: theme.brand, stations: {}, bots: [], boards: [], munch: false };
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
      fixture: !!fixture,
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
    var params = new root.URLSearchParams(root.location ? root.location.search : '');
    if (params.get('skin')) themeId = params.get('skin');
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
      model = modelFromPayload(team, hub, themeOf(themeId), !!opts.fixture);
      fillDom(model);
      if (reduced) paint(ctx, themeOf(themeId), model, 0);
    }
    canvas.addEventListener('pointermove', function (event) {
      if (!tip) return;
      var rect = canvas.getBoundingClientRect();
      var x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      var y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      var hit = (model.bots || []).find(function (bot) {
        return bot._x != null && Math.hypot(bot._x - x, bot._y - y) < 36;
      });
      tip.textContent = hit
        ? (hit.name || hit.id) + ' · ' + (hit.activity || 'idle') + (hit.speech ? ' · quoted from GitHub' : '')
        : '';
    });
    canvas.addEventListener('click', function (event) {
      if (!model.boardLinks || !model.boardLinks[0] || !LAYOUT.hub) return;
      var rect = canvas.getBoundingClientRect();
      var x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      var y = ((event.clientY - rect.top) / rect.height) * canvas.height;
      var hub = cellOrigin(LAYOUT.hub.c, LAYOUT.hub.r);
      if (Math.hypot(hub[0] - x, hub[1] - y) < 90) root.open(model.boardLinks[0].url, '_blank', 'noopener');
    });
    function setTheme(id) {
      themeId = themeOf(id).id;
      if (!params.get('skin')) {
        try { root.localStorage.setItem('oaudrey-theme', themeId); } catch (error) { /* storage can be blocked */ }
      }
      document.documentElement.dataset.theme = themeId;
    }
    document.querySelectorAll('[data-theme-id]').forEach(function (button) {
      button.addEventListener('click', function () { setTheme(button.getAttribute('data-theme-id')); });
    });
    if (!params.get('skin')) {
      try {
        var saved = root.localStorage.getItem('oaudrey-theme');
        if (saved) themeId = themeOf(saved).id;
      } catch (error) { /* ignore */ }
    }
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
