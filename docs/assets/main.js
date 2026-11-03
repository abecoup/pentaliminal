/* ==========================================================================
   V3 — the products: behavior
   Loaded before main.js, which calls window.__plProducts(api) from boot() with its
   shared helpers (listeners, observers, animation loops, motion state, drawing).
   Modules:
     - demos:  each concept window plays its example one step at a time, once, when
               it comes into view; "Play it again" restarts it. Still motion shows the end.
     - waves:  the speaking rhythm lines in the Rhetor window.
     - rails:  the feature carousels (buttons, "1 of 6").
     - art:    the isometric drawing on each feature card.
     - vortex: sources and products spiral into the shared memory.
   ========================================================================== */
window.__plProducts = function (api) {
  "use strict";
  var on = api.on, svgEl = api.svgEl, iso = api.iso, isoBox = api.isoBox, isoGrid = api.isoGrid, pts = api.pts;
  var motion = api.motion, mount = api.mount;

  /* ---------- demos ---------- */
  mount("demos", function () {
    var STEP_MS = 1150;
    Array.prototype.forEach.call(document.querySelectorAll(".win[data-steps]"), function (win) {
      var steps = +win.getAttribute("data-steps"), step = -1, timer = 0, played = false;
      var timed = Array.prototype.slice.call(win.querySelectorAll("[data-at], [data-until]"));
      var presses = Array.prototype.slice.call(win.querySelectorAll("[data-press]"));
      var speakers = Array.prototype.slice.call(win.querySelectorAll("[data-speak]"));
      var swaps = Array.prototype.slice.call(win.querySelectorAll("[data-swap-at]"));
      var meters = Array.prototype.slice.call(win.querySelectorAll("[data-v2-at]"));
      swaps.forEach(function (n) { if (!n.dataset.orig) n.dataset.orig = n.textContent; });
      meters.forEach(function (n) { if (!n.dataset.v1) n.dataset.v1 = n.style.getPropertyValue("--v"); });

      function set(k) {
        step = k;
        for (var i = 1; i <= steps; i++) win.classList.toggle("st-" + i, i <= k);
        timed.forEach(function (n) {
          var at = n.hasAttribute("data-at") ? +n.getAttribute("data-at") : 0;
          var until = n.hasAttribute("data-until") ? +n.getAttribute("data-until") : Infinity;
          n.classList.toggle("is-off", !(k >= at && k < until));
        });
        presses.forEach(function (n) {
          var at = +n.getAttribute("data-press");
          n.classList.toggle("done", k >= at);
          if (k === at) { n.classList.add("press"); setTimeout(function () { n.classList.remove("press"); }, 160); }
        });
        speakers.forEach(function (n) { n.classList.toggle("on", n.getAttribute("data-speak").split("|").indexOf(String(k)) >= 0); });
        swaps.forEach(function (n) { n.textContent = k >= +n.getAttribute("data-swap-at") ? n.getAttribute("data-swap") : n.dataset.orig; });
        meters.forEach(function (n) { n.style.setProperty("--v", k >= +n.getAttribute("data-v2-at") ? n.getAttribute("data-v2") : n.dataset.v1); });
        win.dispatchEvent(new CustomEvent("pl-step", { detail: k }));
      }
      function stop() { clearTimeout(timer); timer = 0; }
      function play() {
        stop();
        if (motion.still()) { set(steps); return; }
        set(0);
        (function next() {
          timer = setTimeout(function () {
            if (!api.alive()) return;
            set(step + 1);
            if (step < steps) next(); else timer = 0;
          }, step === 0 ? 500 : STEP_MS);
        })();
      }
      // at rest the window shows its finished state, so the page reads complete without scripts or motion
      set(steps);
      var io = api.observer("IntersectionObserver", function (entries) {
        var e = entries[entries.length - 1];
        if (e.isIntersecting && !played) { played = true; play(); }
        if (!e.isIntersecting && timer) { stop(); set(steps); played = false; }
      }, { threshold: 0.35 });
      if (io && !motion.still()) io.observe(win);
      motion.handlers.push(function () { if (motion.still()) { stop(); set(steps); } });
      var btn = document.querySelector('.replay[data-win="' + win.id + '"]');
      if (btn) on(btn, "click", function () { played = true; play(); });
    });
  }, ".win[data-steps]");

  /* ---------- waves: the model's rhythm, and yours (rushed at the turn, then closer) ---------- */
  mount("waves", function () {
    var model = document.querySelector('.wave[data-wave="model"]'), you = document.querySelector('.wave[data-wave="you"]');
    if (!model || !you) return;
    var N = 100, W = 600, H = 40;
    // speech: syllable bursts with gaps where the speaker pauses
    var pauses = [[27, 31], [44, 52], [74, 80]];
    function shape(seed, rush) {
      var r = api.seeded(seed), out = [];
      for (var i = 0; i < N; i++) {
        var x = i;
        if (rush && i > 62) x = 62 + (i - 62) * 1.45; // you sped through the turn: the pause closes up
        var gap = pauses.some(function (p) { return x >= p[0] && x < p[1] && !(rush && p[0] > 70); });
        var a = gap ? 0.04 : 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + r() * 2)) * (0.55 + 0.45 * r());
        out.push(x > N ? 0.03 : a);
      }
      return out;
    }
    function draw(svg, amps) {
      svg.innerHTML = "";
      var bw = W / N;
      amps.forEach(function (a, i) {
        var h = Math.max(1.5, a * (H - 4));
        svgEl(svg, "rect", { x: (i * bw + 1).toFixed(1), y: ((H - h) / 2).toFixed(1), width: (bw - 2.2).toFixed(1), height: h.toFixed(1) });
      });
    }
    draw(model, shape(7, false));
    var rushed = shape(11, true), steady = shape(11, false);
    draw(you, steady);
    var win = document.getElementById("winRhetor");
    if (win) on(win, "pl-step", function (e) { draw(you, e.detail >= 6 ? steady : rushed); });
  }, ".wave");

  /* ---------- rails: buttons and a "1 of 6" count ---------- */
  mount("rails", function () {
    Array.prototype.forEach.call(document.querySelectorAll(".rail"), function (rail) {
      var head = rail.previousElementSibling, cards = rail.children;
      if (!head || !head.classList.contains("rail-head")) return;
      var count = head.querySelector(".rail-n"), prev = head.querySelector('[data-dir="-1"]'), next = head.querySelector('[data-dir="1"]');
      function first() { var w = cards[0].getBoundingClientRect().width || 1; return Math.round(rail.scrollLeft / w); }
      function shown() { var w = cards[0].getBoundingClientRect().width || 1; return Math.max(1, Math.round(rail.clientWidth / w)); }
      function update() {
        var f = first(), s = shown(), n = cards.length;
        count.textContent = s >= n ? n + " of " + n : (f + 1) + " of " + n;
        prev.disabled = f <= 0;
        next.disabled = f + s >= n;
      }
      function go(dir) {
        var w = cards[0].getBoundingClientRect().width;
        rail.scrollBy({ left: dir * w, behavior: motion.still() ? "auto" : "smooth" });
      }
      on(prev, "click", function () { go(-1); });
      on(next, "click", function () { go(1); });
      var pending = 0;
      on(rail, "scroll", function () { if (!pending) pending = requestAnimationFrame(function () { pending = 0; update(); }); }, { passive: true });
      on(window, "resize", update, { passive: true });
      update();
    });
  }, ".rail");

  /* ---------- art: an isometric drawing on each feature card ---------- */
  mount("art", function () {
    var S = 22, OX = 150, OY = 92;
    function P(x, y, z) { return iso(x, y, z || 0, S, OX, OY); }
    function g(parent, cls) { return svgEl(parent, "g", cls ? { "class": cls } : {}); }
    function box(parent, x, y, z, w, d, h, opt) {
      opt = opt || {};
      isoBox(parent, [x, y, z, x + w, y + d, z + h], S, OX, OY, { dashed: opt.dashed, shade: opt.shade || "hs-s" });
      if (opt.ink) svgEl(parent, "polygon", { "class": "ink-f", points: pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]) });
      if (opt.hatch) svgEl(parent, "polygon", { "class": "hatch", points: pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]) });
      if (opt.icon) flatIcon(parent, opt.icon, x + w / 2, y + d / 2, z + h, opt.iconSize || Math.min(w, d) * 0.62, opt.ink);
    }
    // a 16-unit icon laid flat on a top face
    function flatIcon(parent, id, cx, cy, z, size, inverse) {
      var c = P(cx, cy, z), k = size * S / 16;
      var m = [0.866 * k, 0.5 * k, -0.866 * k, 0.5 * k];
      var tx = c[0] - (m[0] * 8 + m[2] * 8), ty = c[1] - (m[1] * 8 + m[3] * 8);
      var u = svgEl(parent, "use", { href: "#" + id, width: 16, height: 16, "class": "flat" + (inverse ? " inv" : ""), transform: "matrix(" + m.map(function (v) { return v.toFixed(3); }).join(" ") + " " + tx.toFixed(1) + " " + ty.toFixed(1) + ")" });
      u.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + id);
      return u;
    }
    function line(parent, a, b, dashed) { svgEl(parent, "line", { "class": dashed ? "hid" : "ln", x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1) }); }
    function arrow(parent, a, b, dashed) {
      line(parent, a, b, dashed);
      var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 7, W = 3.6;
      svgEl(parent, "polygon", { "class": "ar", points: pts([b, [b[0] - L * Math.cos(ang) + W * Math.sin(ang), b[1] - L * Math.sin(ang) - W * Math.cos(ang)], [b[0] - L * Math.cos(ang) - W * Math.sin(ang), b[1] - L * Math.sin(ang) + W * Math.cos(ang)]]) });
    }
    function node(parent, p, r, kind) { return svgEl(parent, "circle", { "class": "nd" + (kind ? " " + kind : ""), cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: r }); }
    // a person: a small post with a round head, standing on the plane
    function person(parent, x, y, z, kind) {
      var b = P(x, y, z), t = P(x, y, (z || 0) + 1.1);
      svgEl(parent, "line", { "class": "ln", x1: b[0].toFixed(1), y1: b[1].toFixed(1), x2: t[0].toFixed(1), y2: (t[1] + 6).toFixed(1) });
      node(parent, t, 6.5, kind || "");
    }

    var ART = {
      /* Trust */
      ledger: function (s) {
        var rows = [-2.6, -1.3, 0, 1.3, 2.6];
        rows.forEach(function (y, i) { box(i === 2 ? g(s, "lift") : s, -1.4, y - 0.5, 0, 2.8, 1, 0.22, { ink: i === 2, icon: ["i-person", "i-agent", "i-tool", "i-rule", "i-tool"][i], iconSize: 0.8 }); });
      },
      provenance: function (s) {
        person(s, -3.2, -1.6, 0, "ink");
        var chain = [[-1.6, -0.6], [0.2, 0.4], [2, 1.4]];
        chain.forEach(function (c, i) { box(i === 2 ? g(s, "lift") : s, c[0] - 0.55, c[1] - 0.55, 0, 1.1, 1.1, 0.5, { ink: i === 2, icon: ["i-agent", "i-tool", "i-doc"][i] }); });
        arrow(s, P(-1.1, 1.4, 0.2), P(-2.9, 0.2, 0.2), true);
        arrow(s, P(-2.7, -1.25, 0.6), P(-2.0, -0.85, 0.6));
        arrow(s, P(-0.9, -0.2, 0.25), P(-0.35, 0.1, 0.25));
        arrow(s, P(0.9, 0.8, 0.25), P(1.45, 1.1, 0.25));
      },
      guard: function (s) {
        [[-3.4, -2.6], [-3.9, -0.8], [-2.8, -1.6], [-3.5, 0.9], [-2.6, 0.2]].forEach(function (p, i) {
          var a = P(p[0], p[1], 0.25); node(s, a, 4.5, i % 2 ? "" : "sh");
          if (i < 3) arrow(s, a, P(-1.75, p[1] * 0.6, 0.25), true);
        });
        box(s, -1.7, -2.8, 0, 0.32, 5.6, 1.6, { shade: "hs" });
        box(g(s, "lift"), 0.4, -1.3, 0, 2.6, 2.6, 0.32, { ink: true, icon: "i-guard", iconSize: 1.2 });
      },
      limits: function (s) {
        box(s, -3.4, -0.9, 0, 6.8, 1.8, 0.16);
        var y = 0;
        line(s, P(-3, y, 0.16), P(2.9, y, 0.16), false);
        box(s, 0, -1.25, 0.16, 0.18, 2.5, 1.25, { shade: "hs" });
        node(g(s, "lift"), P(-0.75, y, 0.55), 8, "ink");
        line(s, P(-0.75, y, 0.16), P(-0.75, y, 0.4), false);
        person(s, 0.9, -1.9, 0.16);
        arrow(s, P(-0.4, -0.6, 0.9), P(0.55, -1.5, 0.9), true);
        node(s, P(2.4, y, 0.4), 6, "");
      },
      packet: function (s) {
        [0, 0.36, 0.72].forEach(function (z, i) { box(i === 2 ? g(s, "lift") : s, -1.6 + i * 0.12, -1.2 - i * 0.12, z, 3.2, 2.4, 0.16, { ink: i === 2, icon: i === 2 ? "i-report" : null, iconSize: 1.6 }); });
        box(s, 2.1, 1.4, 0, 0.9, 0.9, 0.5, { icon: "i-check" });
        arrow(s, P(0.9, 1.6, 0.4), P(2.0, 1.8, 0.4), true);
      },
      fair: function (s) {
        box(s, -2.6, -2.2, 0, 3.4, 4.4, 0.16, { hatch: true });
        [[-1.6, -1.2], [-0.2, -1.2], [-1.6, 0.8], [-0.2, 0.8]].forEach(function (p) { person(s, p[0], p[1], 0.16); });
        box(s, 1.8, -0.7, 0, 1.6, 1.4, 0.16, { dashed: true });
        var lp = g(s, "lift"); person(lp, 2.6, 0, 0.16, "ink");
        flatIcon(s, "i-search", 2.6, 1.1, 0.16, 0.9);
      },
      /* Notebook */
      gather: function (s) {
        [["i-doc", -3.4, -2.2], ["i-mic", -3.6, -0.2], ["i-chat", -2.6, 1.6], ["i-play", -1.6, -2.9]].forEach(function (it) {
          box(s, it[1] - 0.45, it[2] - 0.45, 0.3, 0.9, 0.9, 0.3, { icon: it[0] });
          arrow(s, P(it[1] + 0.5, it[2] + 0.2, 0.45), P(0.2, 0.1, 0.35), true);
        });
        box(g(s, "lift"), 0.4, -1.3, 0, 2.6, 2.6, 0.4, { ink: true, icon: "i-learn", iconSize: 1.3 });
      },
      find: function (s) {
        box(s, -3.2, -2.4, 0, 6.4, 4.8, 0.14);
        var N = [[-2.4, -1.6], [-1.2, -0.4], [-2.2, 1.2], [0.2, -1.8], [0.6, 0.6], [1.9, -0.6], [2.2, 1.5], [-0.6, 1.8]];
        var E = [[0, 1], [1, 2], [1, 3], [1, 4], [3, 5], [4, 5], [4, 6], [4, 7], [2, 7]], path = { "0-1": 1, "1-4": 1, "4-6": 1 };
        E.forEach(function (e) { line(s, P(N[e[0]][0], N[e[0]][1], 0.14), P(N[e[1]][0], N[e[1]][1], 0.14), !path[e.join("-")]); });
        N.forEach(function (n, i) { node(s, P(n[0], n[1], 0.14), i === 6 ? 7 : 4.5, i === 0 || i === 6 ? "ink" : ""); });
        var lf = g(s, "lift"); box(lf, 1.2, 0.9, 0.9, 1.3, 1.3, 0.12, { icon: "i-search" });
      },
      connect: function (s) {
        var N = [[-2.6, -1.4, 0.9], [-0.4, -2.2, 0.5], [1.6, -0.8, 1.1], [-1.4, 1.2, 0.4], [1.2, 1.6, 0.8]];
        [[0, 1, 0], [1, 2, 0], [0, 3, 1], [2, 4, 0], [3, 4, 1], [1, 4, 1]].forEach(function (e) {
          line(s, P(N[e[0]][0], N[e[0]][1], N[e[0]][2] + 0.25), P(N[e[1]][0], N[e[1]][1], N[e[1]][2] + 0.25), !!e[2]);
        });
        N.forEach(function (n, i) { box(i === 2 ? g(s, "lift") : s, n[0] - 0.42, n[1] - 0.42, n[2], 0.84, 0.84, 0.25, { ink: i === 2 }); });
      },
      learn: function (s) {
        box(s, -1.8, -1.2, 0, 3.6, 2.4, 0.2, { icon: "i-q", iconSize: 1.3 });
        box(g(s, "lift"), -1.8, -1.2, 1.1, 3.6, 2.4, 0.2, { dashed: true });
        line(s, P(-1.8, 1.2, 0.2), P(-1.8, 1.2, 1.1), true);
        line(s, P(1.8, 1.2, 0.2), P(1.8, 1.2, 1.1), true);
        box(s, 2.5, 0.2, 0, 0.9, 0.9, 0.5, { ink: true, icon: "i-check" });
      },
      apply: function (s) {
        box(s, -2.2, -1.6, 0, 4.4, 3.2, 0.24, { ink: true, icon: "i-doc", iconSize: 1.6 });
        var lf = g(s, "lift");
        box(lf, 0.6, -2.6, 1.6, 1.6, 1.2, 0.2, { icon: "i-doc" });
        line(s, P(1.4, -2, 0.24), P(1.4, -2, 1.6), true);
        box(s, -3.6, 1.6, 0, 0.9, 0.9, 0.3, { dashed: true });
        flatIcon(s, "i-q", -3.15, 2.05, 0, 0.7);
      },
      status: function (s) {
        var kinds = [{ ink: true }, { shade: "hs" }, { dashed: true }, { hatch: true }, {}];
        kinds.forEach(function (o, i) {
          var x = -3.2 + i * 1.45;
          box(i === 0 ? g(s, "lift") : s, x - 0.5, -0.5, 0, 1, 1, i === 4 ? 0.3 : 0.75, o);
        });
        node(s, P(2.6, 0, 0.6), 4, "");
      },
      /* Rhetor */
      study: function (s) {
        box(s, -2.9, -0.5, 0, 1, 1, 2.4, { shade: "hs" });
        node(s, P(-2.4, 0, 2.95), 9, "sh");
        var bp = g(s, "lift");
        box(bp, -0.6, -1.8, 0, 3.6, 3.6, 0.14);
        [-1.2, -0.4, 0.4, 1.2].forEach(function (y, i) { line(bp, P(-0.2, y, 0.14), P(i === 2 ? 1.4 : 2.5, y, 0.14), i % 2 === 1); });
        node(bp, P(2.6, 0.4, 0.14), 4, "ink");
      },
      imitate: function (s) {
        box(s, -2.6, -0.7, 0, 1.4, 1.4, 1.6, { shade: "hs" });
        node(s, P(-1.9, 0, 2.2), 8, "sh");
        box(g(s, "lift"), 1.2, -0.7, 0, 1.4, 1.4, 1.6, { ink: true });
        node(s, P(1.9, 0, 2.2), 8, "ink");
        line(s, P(0, -2.6, 0), P(0, 2.6, 0), true);
        line(s, P(0, -2.6, 0), P(0, -2.6, 2.4), true);
      },
      compare: function (s) {
        [[-0.9, false], [0.6, true]].forEach(function (r) {
          var gg = r[1] ? g(s, "lift") : s;
          box(gg, -3.4, r[0], 0, 6.8, 0.7, 0.12, { ink: r[1] });
          for (var i = 0; i < 16; i++) {
            var x = -3.1 + i * 0.4, h = 0.15 + Math.abs(Math.sin(i * 1.7 + (r[1] ? 0.4 : 0))) * 0.75;
            if (i === 6 || i === 7 || i === 11) continue;
            line(gg, P(x, r[0] + 0.35, 0.12), P(x, r[0] + 0.35, 0.12 + h), false);
          }
        });
      },
      drill: function (s) {
        box(s, -3.6, -0.5, 0, 7.2, 1, 0.14);
        box(s, 0.6, -0.5, 0.14, 2.2, 1, 0.08, { shade: "hs", hatch: true });
        var lp = g(s, "lift"), a = P(0.6, 0, 0.6), b = P(2.8, 0, 0.6);
        svgEl(lp, "path", { "class": "ln", d: "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " C " + (a[0] + 10).toFixed(1) + " " + (a[1] - 42).toFixed(1) + " " + (b[0] - 10).toFixed(1) + " " + (b[1] - 42).toFixed(1) + " " + b[0].toFixed(1) + " " + b[1].toFixed(1) });
        arrow(lp, [a[0] + 4, a[1] - 10], a);
        for (var i = 0; i < 9; i++) { var p = P(-3.3 + i * 0.8, 0.5, 0.14); svgEl(s, "line", { "class": "dim", x1: p[0].toFixed(1), y1: p[1].toFixed(1), x2: p[0].toFixed(1), y2: (p[1] + 5).toFixed(1) }); }
      },
      line: function (s) {
        box(s, -0.4, -0.4, 0, 0.8, 0.8, 0.9, { shade: "hs" });
        var beam = g(s, "lift");
        var l = P(-3, 0, 1.2), r = P(3, 0, 0.75);
        svgEl(beam, "line", { "class": "ln", x1: l[0].toFixed(1), y1: l[1].toFixed(1), x2: r[0].toFixed(1), y2: r[1].toFixed(1) });
        box(s, 1.9, -0.6, 0.8, 1.2, 1.2, 1, { ink: true, icon: "i-doc" });
        box(s, -3.1, -0.5, 1.25, 1, 1, 0.8, { dashed: true });
      },
      /* Forum */
      live: function (s) {
        box(s, -2.6, -2.8, 0, 5.2, 1.8, 0.3);
        node(g(s, "lift"), P(-1, -1.9, 0.75), 9, "ink");
        node(s, P(1, -1.9, 0.75), 9, "sh");
        for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) node(s, P(-2.4 + c * 0.95, 0.4 + r * 0.9, 0.1), 3.6, "");
      },
      kept: function (s) {
        for (var i = 0; i < 4; i++) box(i === 3 ? g(s, "lift") : s, -2, -1.4, i * 0.34, 4, 2.8, 0.18, { ink: i === 3 });
        [-1.2, -0.2, 1.1].forEach(function (x) { var p = P(x, 1.4, 1.2); svgEl(s, "line", { "class": "dim", x1: p[0].toFixed(1), y1: p[1].toFixed(1), x2: p[0].toFixed(1), y2: (p[1] + 7).toFixed(1) }); });
      },
      mapped: function (s) {
        box(g(s, "lift"), -0.6, -0.6, 1.4, 1.2, 1.2, 0.3, { ink: true, icon: "i-q" });
        box(s, -3.2, 0.6, 0, 1.6, 1, 0.3, { icon: "i-check" });
        box(s, 1.6, -1.6, 0, 1.6, 1, 0.3, { hatch: true });
        line(s, P(0, 0, 1.4), P(-2.4, 1.1, 0.3), false);
        line(s, P(0, 0, 1.4), P(2.4, -1.1, 0.3), false);
        arrow(s, P(1.7, -0.9, 0.2), P(-1.7, 0.9, 0.2), true);
      },
      followed: function (s) {
        var c = P(0, 0, 0.9);
        for (var i = 0; i < 7; i++) {
          var a = i / 7 * Math.PI * 2, x = Math.cos(a) * 2.8, y = Math.sin(a) * 2.2;
          line(s, c, P(x, y, 0.2), i % 3 === 2);
          box(s, x - 0.38, y - 0.38, 0, 0.76, 0.76, 0.2, { shade: "hs" });
        }
        node(g(s, "lift"), c, 10, "ink");
      },
      consent: function (s) {
        box(s, -1.4, -1, 0, 2.8, 2, 0.3, { dashed: true, icon: "i-play" });
        flatIcon(s, "i-play", 0, 0, 0.3, 1.1);
        [[-2.8, -1.8], [2.6, -1.5], [0.2, 2.4]].forEach(function (p, i) {
          person(i === 2 ? g(s, "lift") : s, p[0], p[1], 0, i === 2 ? "ink" : "sh");
          box(s, p[0] + 0.3, p[1] + 0.3, 0, 0.6, 0.6, 0.12, { icon: "i-check" });
        });
      }
    };

    Array.prototype.forEach.call(document.querySelectorAll(".card-art[data-art]"), function (svg) {
      svg.innerHTML = "";
      isoGrid(svgEl(svg, "g", {}), -300, -200, 900, 640, 22, "2 3");
      var fn = ART[svg.getAttribute("data-art")];
      if (!fn) return;
      var fig = svgEl(svg, "g", { "class": "fig" });
      fn(fig);
      // fit each drawing to its card: centered, as large as the frame comfortably allows
      try {
        var bb = fig.getBBox();
        if (bb.width && bb.height) {
          var k = Math.min(230 / bb.width, 136 / bb.height, 1.4);
          fig.setAttribute("transform", "translate(" + (150 - (bb.x + bb.width / 2) * k).toFixed(1) + " " + (104 - (bb.y + bb.height / 2) * k).toFixed(1) + ") scale(" + k.toFixed(3) + ")");
        }
      } catch (e) { /* not rendered yet: leave it as drawn */ }
    });
  }, ".card-art");

  /* ---------- vortex: everything spirals into the shared memory ---------- */
  mount("vortex", function () {
    var field = document.querySelector("#vortex .vx-field"), holder = field.querySelector(".vx-items"), guide = field.querySelector(".vx-guide");
    var core = field.querySelector(".vx-core svg");
    holder.innerHTML = ""; guide.innerHTML = ""; core.innerHTML = "";

    var SOURCES = [
      ["t", "i-doc"], ["p", "Meeting notes"], ["t", "i-mic"], ["p", "Papers"], ["k", "Trust"], ["t", "i-agent"], ["p", "Agent runs"],
      ["t", "i-chat"], ["p", "Chat logs"], ["k", "Notebook"], ["t", "i-play"], ["p", "Lectures"], ["t", "i-mail"], ["p", "Debates"],
      ["k", "Rhetor"], ["t", "i-tool"], ["p", "Tool calls"], ["t", "i-wave"], ["p", "Recordings"], ["k", "Forum"], ["t", "i-check"],
      ["p", "Sign-offs"], ["t", "i-q"], ["p", "Open questions"], ["p", "Highlights"], ["t", "i-report"], ["p", "Drafts"]
    ];
    var rnd = api.seeded(42), items = SOURCES.map(function (src, i) {
      var el = document.createElement("span");
      el.className = "vx";
      if (src[0] === "t") el.innerHTML = '<span class="vx-t"><svg class="ic"><use href="#' + src[1] + '"/></svg></span>';
      else el.innerHTML = '<span class="vx-p' + (src[0] === "k" ? " ink" : "") + '">' + src[1] + "</span>";
      holder.appendChild(el);
      return { el: el, u0: (i / SOURCES.length + rnd() * 0.02) % 1, a0: rnd() * Math.PI * 2, jitter: 0.88 + rnd() * 0.22 };
    });

    // the drawing behind it: orbit rings, the axis, and the core (a pentagon in plan, three rings deep)
    var w = 0, h = 0, rx = 0, ry = 0;
    function drawGuide() {
      guide.innerHTML = "";
      guide.setAttribute("viewBox", "0 0 " + w + " " + h);
      [1, 0.72, 0.46].forEach(function (k) { svgEl(guide, "ellipse", { "class": "orb", cx: w / 2, cy: h / 2, rx: (rx * k).toFixed(1), ry: (ry * k).toFixed(1) }); });
      svgEl(guide, "line", { "class": "ax", x1: w / 2, y1: h / 2 - ry - 30, x2: w / 2, y2: h / 2 + ry + 30, "stroke-dasharray": "8 4 2 4" });
      svgEl(guide, "line", { "class": "ax", x1: w / 2 - rx - 20, y1: h / 2, x2: w / 2 + rx + 20, y2: h / 2, "stroke-dasharray": "8 4 2 4" });
    }
    (function drawCore() {
      function pent(r, z) { var out = []; for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * 2 * Math.PI / 5; out.push([60 + Math.cos(a) * r, 60 + Math.sin(a) * r * 0.62 - z]); } return out; }
      var top = pent(40, 14), bot = pent(40, -14);
      [2, 3].forEach(function (k) { var j = (k + 1) % 5; svgEl(core, "polygon", { "class": "ln-f", points: pts([bot[k], bot[j], top[j], top[k]]) }); svgEl(core, "polygon", { "class": "hs", points: pts([bot[k], bot[j], top[j], top[k]]) }); });
      [1, 4].forEach(function (k) { var j = k === 1 ? 2 : 0; svgEl(core, "polygon", { "class": "ln-f", points: pts([bot[k], bot[j], top[j], top[k]]) }); });
      svgEl(core, "polygon", { "class": "ln-f", points: pts(top) });
      svgEl(core, "polygon", { "class": "ln", points: pts(pent(24, 14)) });
      svgEl(core, "polygon", { "class": "ln", points: pts(pent(10, 14)), style: "fill: var(--ink)" });
    })();

    function resize() {
      var r = field.getBoundingClientRect();
      if (!r.width || (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 1)) return false;
      w = r.width; h = r.height;
      rx = Math.min(w * 0.46, 560); ry = Math.min(h * 0.4, rx * (w < 700 ? 0.85 : 0.5));
      drawGuide();
      return true;
    }

    var T = 56000; // one item takes this long to travel from the rim into the core
    function place(t) {
      var cx = w / 2, cy = h / 2;
      items.forEach(function (it) {
        var u = (it.u0 + t / T) % 1;                        // 0 at the rim, 1 at the core
        var r = (1 - 0.84 * Math.pow(u, 1.7)) * it.jitter;     // lingers on the outer rings, speeds up near the core
        var a = it.a0 + u * Math.PI * 2.3;                   // a little over one turn on the way in
        var x = Math.cos(a) * rx * r, z = Math.sin(a), y = z * ry * r;
        var depth = (z + 1) / 2;                             // 0 far, 1 near
        var scale = (0.72 + 0.28 * depth) * (0.62 + 0.38 * (1 - u * u));
        var op = Math.min(1, u / 0.05, (1 - u) / 0.22) * (0.45 + 0.55 * depth);
        it.el.style.transform = "translate(-50%, -50%) translate(" + (cx + x - w / 2).toFixed(1) + "px," + (y).toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
        it.el.style.opacity = Math.max(0, op).toFixed(3);
        it.el.style.zIndex = String(Math.round(depth * 100));
        var far = z < -0.12;
        if (far !== it.far) { it.far = far; it.el.classList.toggle("far", far); }
      });
    }
    resize();
    var clock = 0, view = api.watchVisible(field, function (v) { if (v) start(); }, "80px");
    function active() { return view.visible && !document.hidden && !motion.still(); }
    var start = api.animator(function (dt) { clock += dt; place(clock); }, active, 32);
    place(0);
    on(window, "resize", function () { if (resize()) place(clock); }, { passive: true });
    on(document, "visibilitychange", function () { start(); });
    motion.handlers.push(function () { place(clock); start(); });
    start();
  }, "#vortex");
};
/* ==========================================================================
   Pentaliminal — behavior
   Vanilla JS, no dependencies. Everything starts in boot().

   - Each feature is a small module started through mount(), so one failing
     module logs an error instead of stopping the rest of the page.
   - Animation loops run only while their figure is on screen and stop when
     motion is paused, reduced, or the page is torn down.
   - boot() can run again on the same page (the claude.ai preview swaps updates
     into an open page). The previous run is torn down first: its listeners are
     removed through an AbortController and its observers are disconnected.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var THEME_KEY = "pentaliminal-theme";
  var MOTION_KEY = "pentaliminal-motion";

  /* ---------- small helpers (no state) ---------- */
  function svgEl(parent, tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    parent.appendChild(e);
    return e;
  }
  function pts(list) { return list.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function seeded(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function store(key, value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (e) { /* storage blocked: keep going */ } }
  function stored(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

  /* Isometric projection used by the line drawings: x and y run along the 30° axes, z is up. */
  function iso(x, y, z, s, ox, oy) { return [ox + (x - y) * 0.866 * s, oy + (x + y) * 0.5 * s - z * s]; }

  /* An isometric triangle grid: vertical lines plus lines at +30° and -30°. */
  function isoGrid(g, x0, y0, w, h, step, dash) {
    var dx = step * Math.cos(Math.PI / 6), t = Math.tan(Math.PI / 6), a = { "class": "gl" };
    if (dash) a["stroke-dasharray"] = dash;
    function line(x1, y1, x2, y2) { svgEl(g, "line", Object.assign({ x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1) }, a)); }
    for (var x = x0 - ((x0 % dx) + dx) % dx; x <= x0 + w; x += dx) line(x, y0, x, y0 + h);
    var cMin = y0 - (x0 + w) * t - step, cMax = y0 + h + (x0 + w) * t + step;
    for (var c = Math.floor(cMin / step) * step; c <= cMax; c += step) {
      line(x0, c + x0 * t, x0 + w, c + (x0 + w) * t);
      line(x0, c - x0 * t, x0 + w, c - (x0 + w) * t);
    }
  }

  /* A filled polygon with optional halftone shading on top. */
  function face(g, poly, shadeClass) {
    svgEl(g, "polygon", { "class": "ln-f", points: pts(poly) });
    if (shadeClass) svgEl(g, "polygon", { "class": shadeClass, points: pts(poly) });
  }
  /* An axis-aligned box drawn as its three visible faces; the right-hand face is shaded. */
  function isoBox(g, b, s, ox, oy, opts) {
    opts = opts || {};
    var x0 = b[0], y0 = b[1], z0 = b[2], x1 = b[3], y1 = b[4], z1 = b[5];
    var top = [iso(x0, y0, z1, s, ox, oy), iso(x1, y0, z1, s, ox, oy), iso(x1, y1, z1, s, ox, oy), iso(x0, y1, z1, s, ox, oy)];
    var right = [iso(x1, y0, z0, s, ox, oy), iso(x1, y1, z0, s, ox, oy), iso(x1, y1, z1, s, ox, oy), iso(x1, y0, z1, s, ox, oy)];
    var front = [iso(x0, y1, z0, s, ox, oy), iso(x1, y1, z0, s, ox, oy), iso(x1, y1, z1, s, ox, oy), iso(x0, y1, z1, s, ox, oy)];
    if (opts.dashed) { [top, right, front].forEach(function (f) { svgEl(g, "polygon", { "class": "hid", points: pts(f) }); }); return; }
    var shade = opts.shade || "hs-s";
    face(g, front, null); face(g, right, shade); face(g, top, null);
  }

  /* Light comes from the upper left, slightly toward the viewer. */
  var LIGHT = norm([-0.45, 0.7, 0.55]);

  /* Turn about the vertical axis by th, then tip the top toward the viewer by ph. */
  function turn(p, th, ph) {
    var x = p[0] * Math.cos(th) + p[2] * Math.sin(th), z = -p[0] * Math.sin(th) + p[2] * Math.cos(th), y = p[1];
    return [x, y * Math.cos(ph) - z * Math.sin(ph), y * Math.sin(ph) + z * Math.cos(ph)];
  }

  /* A regular dodecahedron: 20 vertices, 12 pentagonal faces, 30 edges. */
  function dodecahedron() {
    var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, V = [], F = [], E = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { V.push([a, b, c]); }); }); });
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { V.push([0, a * IP, b * PHI]); V.push([a * IP, b * PHI, 0]); V.push([a * PHI, 0, b * IP]); }); });
    // each face normal points at a vertex of the dual icosahedron; its five nearest vertices form the face
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) {
      [[a, 0, b * PHI], [0, a * PHI, b], [a * PHI, b, 0]].forEach(function (n0) {
        var n = norm(n0);
        var idx = V.map(function (v, i) { return [dot(v, n), i]; }).sort(function (p, q) { return q[0] - p[0]; }).slice(0, 5).map(function (p) { return p[1]; });
        var c = [0, 0, 0]; idx.forEach(function (i) { c[0] += V[i][0] / 5; c[1] += V[i][1] / 5; c[2] += V[i][2] / 5; });
        var u = norm(sub(V[idx[0]], c)), w = cross(n, u);
        idx.sort(function (p, q) { var dp = sub(V[p], c), dq = sub(V[q], c); return Math.atan2(dot(dp, w), dot(dp, u)) - Math.atan2(dot(dq, w), dot(dq, u)); });
        F.push({ n: n, v: idx });
      });
    }); });
    for (var i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) {
      if (Math.abs(Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]) - 2 * IP) < 0.01) {
        E.push({ a: i, b: j, faces: F.map(function (f, k) { return f.v.indexOf(i) >= 0 && f.v.indexOf(j) >= 0 ? k : -1; }).filter(function (k) { return k >= 0; }) });
      }
    }
    return { V: V, F: F, E: E };
  }

  /* A regular tetrahedron standing on its base: vertex 0 is the apex, 1–3 the base corners. */
  function tetrahedron() {
    var V = [[0, 0.6124, 0]];
    for (var k = 0; k < 3; k++) { var a = Math.PI / 2 + k * 2 * Math.PI / 3; V.push([0.5774 * Math.cos(a), -0.2041, 0.5774 * Math.sin(a)]); }
    var F = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]].map(function (f) {
      var n = cross(sub(V[f[1]], V[f[0]]), sub(V[f[2]], V[f[0]]));
      var m = [(V[f[0]][0] + V[f[1]][0] + V[f[2]][0]) / 3, (V[f[0]][1] + V[f[1]][1] + V[f[2]][1]) / 3, (V[f[0]][2] + V[f[1]][2] + V[f[2]][2]) / 3];
      if (dot(n, m) < 0) n = [-n[0], -n[1], -n[2]];
      return { n: norm(n), v: f };
    });
    var E = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
    return { V: V, F: F, E: E };
  }

  /* ======================================================================= */
  function boot() {
    if (window.__pentaliminalTeardown) window.__pentaliminalTeardown();
    var controller = new AbortController(), signal = controller.signal, observers = [];
    window.__pentaliminalTeardown = function () {
      controller.abort();
      observers.forEach(function (o) { o.disconnect(); });
      window.__pentaliminalTeardown = null;
    };
    function alive() { return !signal.aborted; }
    function on(target, type, fn, opts) { target.addEventListener(type, fn, Object.assign({ signal: signal }, opts || {})); }
    function observer(Kind, callback, opts) {
      if (!(Kind in window)) return null;
      var o = new window[Kind](callback, opts);
      observers.push(o);
      return o;
    }
    // `needs`: a selector the module draws into; on pages without it (the roadmap page) the module is skipped.
    function mount(name, fn, needs) {
      if (needs && !document.querySelector(needs)) return;
      try { fn(); } catch (e) { if (window.console) console.error("[pentaliminal] " + name + " failed:", e); }
    }

    var root = document.documentElement;
    var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    /* ---------- shared state: colors and motion ---------- */
    var C = {}, themeHandlers = [];
    function readColors() {
      var cs = getComputedStyle(root);
      ["paper", "ink", "ink-2", "ink-3", "rule", "grid", "shade-op"].forEach(function (k) { C[k] = cs.getPropertyValue("--" + k).trim(); });
    }
    function themeChanged() { if (!alive()) return; readColors(); themeHandlers.forEach(function (f) { f(); }); }
    readColors();
    on(darkQuery, "change", themeChanged);
    var themeObserver = observer("MutationObserver", themeChanged);
    if (themeObserver) themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    var motion = { reduced: reduceQuery.matches, paused: stored(MOTION_KEY) === "paused", handlers: [] };
    motion.still = function () { return motion.reduced || motion.paused; };
    function motionChanged() { root.classList.toggle("motion-paused", motion.paused); motion.handlers.forEach(function (f) { f(); }); }
    on(reduceQuery, "change", function () { motion.reduced = reduceQuery.matches; motionChanged(); });
    root.classList.toggle("motion-paused", motion.paused);

    /* Runs a frame callback while `active()` is true; stops itself otherwise. Returns a starter. */
    function animator(frame, active, minInterval) {
      var running = false, last = 0;
      function tick(t) {
        if (!alive() || !active()) { running = false; last = 0; return; }
        if (!minInterval || !last || t - last >= minInterval) { var dt = last ? Math.min(t - last, 64) : 16; last = t; frame(dt, t); }
        requestAnimationFrame(tick);
      }
      return function start() { if (!running && alive() && active()) { running = true; requestAnimationFrame(tick); } };
    }
    /* Tracks whether an element is on screen; calls back when it changes. */
    function watchVisible(elm, cb, margin) {
      var state = { visible: true };
      var o = observer("IntersectionObserver", function (entries) { state.visible = entries[entries.length - 1].isIntersecting; cb(state.visible); }, { rootMargin: margin || "0px" });
      if (o) o.observe(elm);
      return state;
    }

    // a previous boot may have drawn into these; start every figure from an empty slate
    ["#construct .hf-base", "#meetFig", "#lensFig", "#artOrientation", "#artCognitive", "#artAgency"].forEach(function (q) { var n = document.querySelector(q); if (n) n.innerHTML = ""; });
    document.querySelectorAll(".construct .hf-layer").forEach(function (n) { n.remove(); });
    document.querySelectorAll(".glyph").forEach(function (n) { n.innerHTML = ""; });
    document.querySelectorAll(".rv").forEach(function (n) { n.classList.remove("rv", "pre"); n.style.removeProperty("--d"); });

    /* ---------- hero: a dodecahedron turning inside a construction drawing ---------- */
    mount("hero", function () {
      var fig = document.getElementById("construct"), base = fig.querySelector(".hf-base");
      var VB = "0 0 800 840", CX = 400, CY = 440, S = 168, PH = 0.42, RC = Math.sqrt(3) * S;
      function layer(cls) {
        var s = document.createElementNS(NS, "svg");
        s.setAttribute("viewBox", VB); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "hf hf-layer " + cls);
        fig.insertBefore(s, fig.querySelector(".motion-btn"));
        return s;
      }

      // grid (moves a little with the pointer), on its own layer
      var grid = layer("hf-grid"), defs = svgEl(grid, "defs", {}), hex = [];
      for (var h = 0; h < 6; h++) { var a = -Math.PI / 2 + h * Math.PI / 3; hex.push([CX + 395 * Math.cos(a), CY - 15 + 395 * Math.sin(a)]); }
      svgEl(svgEl(defs, "clipPath", { id: "hexclip" }), "polygon", { points: pts(hex) });
      var fade = svgEl(defs, "radialGradient", { id: "fade" });
      svgEl(fade, "stop", { offset: "0.55", "stop-color": "#fff" });
      svgEl(fade, "stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "0" });
      svgEl(svgEl(defs, "mask", { id: "gridmask" }), "rect", { x: 0, y: 0, width: 800, height: 840, fill: "url(#fade)" });
      isoGrid(svgEl(grid, "g", { "clip-path": "url(#hexclip)", mask: "url(#gridmask)" }), 0, 0, 800, 840, 34, "2 3");

      // two construction rings, each its own layer so the compositor can rotate them
      var orb1 = layer("hf-orb hf-orb1");
      svgEl(orb1, "circle", { "class": "orb dash", cx: CX, cy: CY, r: 370 });
      for (var q = 0; q < 24; q++) {
        var qa = q * Math.PI / 12, r1 = q % 6 === 0 ? 352 : 362;
        svgEl(orb1, "line", { "class": "orb", x1: (CX + r1 * Math.cos(qa)).toFixed(1), y1: (CY + r1 * Math.sin(qa)).toFixed(1), x2: (CX + 370 * Math.cos(qa)).toFixed(1), y2: (CY + 370 * Math.sin(qa)).toFixed(1) });
      }
      var orb2 = layer("hf-orb hf-orb2");
      svgEl(orb2, "polygon", { "class": "orb dash", points: pts([[CX, CY - 340], [CX + 340, CY], [CX, CY + 340], [CX - 340, CY]]) });

      // what stays true while it turns: the vertical axis, the sphere it fits in, and that sphere's radius
      svgEl(base, "circle", { "class": "dim", cx: CX, cy: CY, r: RC.toFixed(1), "stroke-dasharray": "4 6" });
      svgEl(base, "line", { "class": "dim", x1: CX, y1: (CY - RC - 30).toFixed(1), x2: CX, y2: (CY + RC + 30).toFixed(1), "stroke-dasharray": "6 5" });
      var ra = -Math.PI / 5, rx = CX + RC * Math.cos(ra), ry = CY + RC * Math.sin(ra);
      svgEl(base, "line", { "class": "dim", x1: CX, y1: CY, x2: rx.toFixed(1), y2: ry.toFixed(1) });
      svgEl(base, "circle", { "class": "dim", cx: rx.toFixed(1), cy: ry.toFixed(1), r: 4 });
      svgEl(base, "text", { "class": "dim-t", x: (CX + RC * 0.55 * Math.cos(ra) + 10).toFixed(1), y: (CY + RC * 0.55 * Math.sin(ra) - 10).toFixed(1), "font-size": 20, "font-style": "italic" }, "R");
      [[CX, CY - RC - 52], [CX, CY + RC + 52]].forEach(function (p) {
        svgEl(base, "line", { "class": "xh", x1: p[0] - 22, y1: p[1].toFixed(1), x2: p[0] + 22, y2: p[1].toFixed(1) });
        svgEl(base, "line", { "class": "xh", x1: p[0], y1: (p[1] - 22).toFixed(1), x2: p[0], y2: (p[1] + 22).toFixed(1) });
      });

      // the solid, plus a drafting crosshair: the only layer that repaints while it turns
      var solid = layer("hf-solid"), D = dodecahedron();
      var hidden = D.E.map(function () { return svgEl(solid, "line", { "class": "solid-hidden" }); });
      var faces = D.F.map(function () { return svgEl(solid, "polygon", { "class": "solid-face" }); });
      var edges = D.E.map(function () { return svgEl(solid, "line", { "class": "solid-edge" }); });
      var nodes = D.V.map(function () { return svgEl(solid, "circle", { "class": "solid-node", r: 4.5 }); });
      var cursor = svgEl(solid, "g", { "class": "cursor" });
      var curH = svgEl(cursor, "line", { x1: 0, y1: 0, x2: 800, y2: 0 }), curV = svgEl(cursor, "line", { x1: 0, y1: 0, x2: 0, y2: 840 }), curC = svgEl(cursor, "circle", { cx: 0, cy: 0, r: 9 });

      function setVisible(node, show) { var want = show ? "" : "none"; if (node.style.display !== want) node.style.display = want; }
      var angle = 0.6, nudge = 0, nudgeTarget = 0;
      function draw() {
        var t = angle + nudge;
        var pv = D.V.map(function (p) { var r = turn(p, t, PH); return [CX + r[0] * S, CY - r[1] * S]; });
        var front = D.F.map(function (f) { return turn(f.n, t, PH)[2] > 0; });
        var seen = D.V.map(function () { return false; });
        D.F.forEach(function (f, k) {
          setVisible(faces[k], front[k]);
          if (!front[k]) return;
          f.v.forEach(function (i) { seen[i] = true; });
          var lit = Math.max(0, dot(turn(f.n, t, PH), LIGHT));
          faces[k].setAttribute("points", pts(f.v.map(function (i) { return pv[i]; })));
          faces[k].style.opacity = Math.max(0, (0.85 - lit) * 0.85).toFixed(2);
        });
        D.E.forEach(function (e, k) {
          var visible = e.faces.some(function (fi) { return front[fi]; }), lineEl = visible ? edges[k] : hidden[k];
          setVisible(edges[k], visible); setVisible(hidden[k], !visible);
          lineEl.setAttribute("x1", pv[e.a][0].toFixed(1)); lineEl.setAttribute("y1", pv[e.a][1].toFixed(1));
          lineEl.setAttribute("x2", pv[e.b][0].toFixed(1)); lineEl.setAttribute("y2", pv[e.b][1].toFixed(1));
        });
        nodes.forEach(function (n, i) {
          setVisible(n, seen[i]);
          if (seen[i]) { n.setAttribute("cx", pv[i][0].toFixed(1)); n.setAttribute("cy", pv[i][1].toFixed(1)); }
        });
      }

      var view = watchVisible(fig, function (v) { if (v) start(); });
      function needsFrames() { return view.visible && !document.hidden && (!motion.still() || Math.abs(nudgeTarget - nudge) > 0.001); }
      // it turns about one revolution a minute, so 30 frames a second is plenty
      var start = animator(function (dt) {
        if (!motion.still()) angle += dt * 0.00012;
        nudge += (nudgeTarget - nudge) * Math.min(1, dt * 0.004);
        draw();
      }, needsFrames, 32);

      var pending = 0;
      on(fig, "pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var r = fig.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        nudgeTarget = motion.reduced ? 0 : x * 1.4;
        if (!motion.reduced) grid.style.transform = "translate(" + (-x * 10).toFixed(1) + "px," + (-y * 10).toFixed(1) + "px)";
        var sx = ((x + 0.5) * 800).toFixed(1), sy = ((y + 0.5) * 840).toFixed(1);
        if (!pending) pending = requestAnimationFrame(function () {
          pending = 0;
          curH.setAttribute("transform", "translate(0," + sy + ")");
          curV.setAttribute("transform", "translate(" + sx + ",0)");
          curC.setAttribute("transform", "translate(" + sx + "," + sy + ")");
        });
        start();
      });
      on(fig, "pointerleave", function () { nudgeTarget = 0; grid.style.transform = ""; start(); });
      on(document, "visibilitychange", start);
      motion.handlers.push(start);
      draw();
      start();
    }, "#construct");

    /* ---------- pause / resume motion (WCAG 2.2.2) ---------- */
    mount("motionToggle", function () {
      var btn = document.getElementById("motionBtn"); if (!btn) return;
      var label = btn.querySelector(".hbtn-label");
      function render() {
        btn.setAttribute("aria-pressed", String(motion.paused));
        label.textContent = motion.paused ? "Play motion" : "Pause motion";
        btn.querySelector("path").setAttribute("d", motion.paused ? "M5 3l8 5-8 5Z" : "M5 3v10M11 3v10");
        btn.querySelector("path").setAttribute("fill", motion.paused ? "currentColor" : "none");
      }
      on(btn, "click", function () {
        motion.paused = !motion.paused;
        store(MOTION_KEY, motion.paused ? "paused" : null);
        render(); motionChanged();
      });
      render();
    });

    /* ---------- 01 intersection: a still tetrahedron, labeled ---------- */
    mount("intersection", function () {
      var svg = document.getElementById("meetFig"), T = tetrahedron(), PH = 0.42, S = 250, CX = 220, CY = 238, TH = -0.52;
      var pv = T.V.map(function (p) { var q = turn(p, TH, PH); return [CX + q[0] * S, CY - q[1] * S]; });
      var front = T.F.map(function (f) { return turn(f.n, TH, PH)[2] > 0; });
      var lit = T.F.map(function (f) { return Math.max(0, dot(turn(f.n, TH, PH), LIGHT)); });
      var edgeVisible = T.E.map(function (e) { return T.F.some(function (f, i) { return front[i] && f.v.indexOf(e[0]) >= 0 && f.v.indexOf(e[1]) >= 0; }); });

      svgEl(svg, "line", { "class": "mt-ax", x1: CX, y1: (pv[0][1] - 40).toFixed(1), x2: CX, y2: (CY + 0.2041 * Math.cos(PH) * S).toFixed(1) });
      T.E.forEach(function (e, i) { if (!edgeVisible[i]) svgEl(svg, "line", { "class": "mt-h", x1: pv[e[0]][0].toFixed(1), y1: pv[e[0]][1].toFixed(1), x2: pv[e[1]][0].toFixed(1), y2: pv[e[1]][1].toFixed(1) }); });
      T.F.forEach(function (f, i) { if (front[i] && lit[i] < 0.6) svgEl(svg, "polygon", { "class": "mt-f", points: pts(f.v.map(function (k) { return pv[k]; })) }); });
      var edges = {};
      T.E.forEach(function (e, i) { if (edgeVisible[i]) edges[e.join("-")] = svgEl(svg, "line", { "class": "mt-e", x1: pv[e[0]][0].toFixed(1), y1: pv[e[0]][1].toFixed(1), x2: pv[e[1]][0].toFixed(1), y2: pv[e[1]][1].toFixed(1) }); });
      var nodes = pv.map(function (p, i) { return svgEl(svg, "circle", { "class": "mt-n" + (i === 0 ? " apex" : ""), cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: i === 0 ? 7 : 5.5 }); });
      var marks = [null];
      for (var v = 1; v <= 3; v++) {
        var p = pv[v], dx = p[0] - CX, dy = p[1] - CY, l = Math.hypot(dx, dy) || 1;
        var lx = p[0] + dx / l * 34, ly = p[1] + dy / l * 26 + 6;
        marks.push([
          svgEl(svg, "circle", { "class": "mt-c", cx: lx.toFixed(1), cy: ly.toFixed(1), r: 14 }),
          svgEl(svg, "text", { "class": "mt-t", x: lx.toFixed(1), y: (ly + 0.5).toFixed(1), "text-anchor": "middle", "dominant-baseline": "middle" }, "0" + v)
        ]);
      }
      svgEl(svg, "text", { "class": "mt-t", x: pv[0][0].toFixed(1), y: (pv[0][1] - 22).toFixed(1), "text-anchor": "middle" }, "PENTALIMINAL");

      // pointing at a field lights its corner and its edge up to Pentaliminal; pointing at the result lights all three
      function highlight(which) {
        Object.keys(edges).forEach(function (k) { edges[k].classList.toggle("on", which !== null && (which === 0 || k === "0-" + which)); });
        nodes.forEach(function (n, i) { if (i) n.classList.toggle("on", i === which); });
        marks.forEach(function (m, i) { if (!m) return; var lit2 = which !== null && (i === which || which === 0); m[0].classList.toggle("on", lit2); m[1].classList.toggle("inv", lit2); });
      }
      document.querySelectorAll("#meetList [data-v]").forEach(function (li) {
        var which = +li.getAttribute("data-v");
        on(li, "mouseenter", function () { li.classList.add("on"); highlight(which); });
        on(li, "mouseleave", function () { li.classList.remove("on"); highlight(null); });
      });
    }, "#meetFig");

    /* ---------- page mesh: a loose triangular lattice behind everything ---------- */
    mount("mesh", function () {
      var cv = document.getElementById("bgmesh"), ctx = cv.getContext("2d");
      var STEP = 112, ROW = STEP * 0.866, w = 0, h = 0, cols = 0, rows = 0, points = [], scroll = 0, mx = 0.5, my = 0.5, ink = [20, 20, 20];
      function rgb(hex) { hex = hex.replace("#", ""); if (hex.length === 3) hex = hex.replace(/./g, "$&$&"); var n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
      function resize() {
        var cw = cv.clientWidth, ch = cv.clientHeight;
        if (cw === w && ch === h) return false; // e.g. a phone's address bar moved: nothing to do
        var d = Math.min(window.devicePixelRatio || 1, 2);
        w = cw; h = ch;
        cv.width = Math.round(w * d); cv.height = Math.round(h * d);
        ctx.setTransform(d, 0, 0, d, 0, 0);
        cols = Math.ceil(w / STEP) + 3; rows = Math.ceil(h / ROW) + 6; points = [];
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          points.push({ x: (i - 1) * STEP + (j % 2 ? STEP / 2 : 0), y: (j - 3) * ROW, ph: Math.sin(i * 7.13 + j * 2.97) * 6.28, node: (i * 3 + j * 7) % 11 === 0 });
        }
        return true;
      }
      function draw(t) {
        if (!w) return;
        ctx.clearRect(0, 0, w, h);
        var dark = ink[0] + ink[1] + ink[2] > 380, base = dark ? 0.028 : 0.024, boost = dark ? 0.04 : 0.035;
        var moving = !motion.still();
        var shift = moving ? (scroll * 0.05) % (2 * ROW) : 0, dx = moving ? (mx - 0.5) * 14 : 0, dy = moving ? (my - 0.5) * 14 : 0;
        var fx = w * 0.7, fy = h * 0.36, R = Math.max(w, h);
        var Q = points.map(function (p) {
          var wave = moving ? Math.sin(t * 0.00026 + p.ph) * 7 : 0;
          var bend = Math.sin(p.x / w * 3.2 + p.y / h * 2.7 + (moving ? scroll * 0.0004 : 0)) * 16;
          var x = p.x + wave + bend + dx * (p.y / h), y = p.y + wave * 0.4 + shift + dy * (p.x / w);
          return { x: x, y: y, n: Math.max(0, 1 - Math.hypot(x - fx, y - fy) / R), node: p.node };
        });
        var buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
        function seg(a, b) { var k = Math.min(3, Math.floor(((a.n + b.n) / 2) * 4)); buckets[k].moveTo(a.x, a.y); buckets[k].lineTo(b.x, b.y); }
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var a = Q[j * cols + i];
          if (i + 1 < cols) seg(a, Q[j * cols + i + 1]);
          if (j + 1 >= rows) continue;
          if (j % 2 === 0) { if (i > 0) seg(a, Q[(j + 1) * cols + i - 1]); seg(a, Q[(j + 1) * cols + i]); }
          else { seg(a, Q[(j + 1) * cols + i]); if (i + 1 < cols) seg(a, Q[(j + 1) * cols + i + 1]); }
        }
        ctx.lineWidth = 0.7;
        buckets.forEach(function (p, k) { ctx.strokeStyle = "rgba(" + ink.join(",") + "," + (base + boost * k / 3).toFixed(3) + ")"; ctx.stroke(p); });
        Q.forEach(function (q) {
          if (!q.node) return;
          ctx.fillStyle = "rgba(" + ink.join(",") + "," + (0.06 + q.n * 0.14).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(q.x, q.y, 1.7, 0, 6.2832); ctx.fill();
        });
      }
      function active() { return !document.hidden && !motion.still(); }
      var start = animator(function (dt, t) { draw(t); }, active, 32);
      function redraw() { draw(performance.now()); start(); }
      on(window, "resize", function () { if (resize()) redraw(); }, { passive: true });
      on(window, "scroll", function () { scroll = window.scrollY; }, { passive: true });
      on(window, "pointermove", function (e) { if (w) { mx = e.clientX / w; my = e.clientY / h; } }, { passive: true });
      on(document, "visibilitychange", start);
      themeHandlers.push(function () { ink = rgb(C.ink || "#141414"); redraw(); });
      motion.handlers.push(redraw);
      ink = rgb(C.ink || "#141414");
      resize(); scroll = window.scrollY; redraw();
    });

    /* ---------- 04 lenses: a plan drawing; the chosen lens hatches the ground it covers ---------- */
    mount("lenses", function () {
      var svg = document.getElementById("lensFig"), cx = 200, cy = 222, R = 150, V = [];
      for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; V.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      var defs = svgEl(svg, "defs", {});
      svgEl(svgEl(defs, "clipPath", { id: "lfPent" }), "polygon", { points: pts(V) });
      // the covered wedge is drawn for the top corner and rotated to the chosen one
      var half = 24 * Math.PI / 180, L = R * 2.2, top = V[0];
      var wedge = [top, [top[0] - Math.sin(half) * L, top[1] + Math.cos(half) * L], [top[0] + Math.sin(half) * L, top[1] + Math.cos(half) * L]];
      svgEl(svgEl(defs, "clipPath", { id: "lfWedge" }), "polygon", { points: pts(wedge) });
      svgEl(svg, "circle", { "class": "lf-circ", cx: cx, cy: cy, r: R });
      var rot = svgEl(svgEl(svg, "g", { "clip-path": "url(#lfPent)" }), "g", { "class": "lf-rot" });
      var hatch = svgEl(rot, "g", { "class": "lf-hatch", "clip-path": "url(#lfWedge)" });
      for (var k = -460; k < 460; k += 8) svgEl(hatch, "line", { x1: k, y1: 0, x2: k + 440, y2: 440 });
      svgEl(rot, "line", { "class": "lf-ray", x1: top[0].toFixed(1), y1: top[1].toFixed(1), x2: wedge[1][0].toFixed(1), y2: wedge[1][1].toFixed(1) });
      svgEl(rot, "line", { "class": "lf-ray", x1: top[0].toFixed(1), y1: top[1].toFixed(1), x2: wedge[2][0].toFixed(1), y2: wedge[2][1].toFixed(1) });
      svgEl(svg, "polygon", { "class": "lf-out", points: pts(V) });
      svgEl(svg, "line", { "class": "lf-ctr", x1: cx - 7, y1: cy, x2: cx + 7, y2: cy });
      svgEl(svg, "line", { "class": "lf-ctr", x1: cx, y1: cy - 7, x2: cx, y2: cy + 7 });
      var arc = svgEl(svg, "path", { "class": "lf-arc" });
      var angleLabel = svgEl(svg, "text", { "class": "lf-ang", "text-anchor": "middle", "dominant-baseline": "middle" }, "108°");
      var nodes = [], nums = [];
      V.forEach(function (p, j) {
        var ox = p[0] - cx, oy = p[1] - cy, l = Math.hypot(ox, oy);
        nums.push(svgEl(svg, "text", { "class": "lf-num", x: (p[0] + ox / l * 24).toFixed(1), y: (p[1] + oy / l * 24).toFixed(1), "text-anchor": "middle", "dominant-baseline": "middle" }, "0" + (j + 1)));
        nodes.push(svgEl(svg, "circle", { "class": "lf-node", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 5.5 }));
      });

      var rotation = 0, rows = Array.prototype.slice.call(document.querySelectorAll("#lensList li")), current = -1;
      function choose(n) {
        if (n === current) return;
        current = n;
        rotation += ((n * 72 - rotation) % 360 + 540) % 360 - 180; // shortest way round
        rot.style.transform = "rotate(" + rotation + "deg)";
        nodes.forEach(function (x, j) { x.classList.toggle("on", j === n); });
        nums.forEach(function (x, j) { x.classList.toggle("on", j === n); });
        rows.forEach(function (r, j) { r.classList.toggle("on", j === n); r.querySelector(".lens-btn").setAttribute("aria-pressed", String(j === n)); });
        // mark the interior angle at the chosen corner
        var p = V[n], r = 30;
        function toward(q) { var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [p[0] + dx / l * r, p[1] + dy / l * r]; }
        var s = toward(V[(n + 4) % 5]), e = toward(V[(n + 1) % 5]);
        arc.setAttribute("d", "M" + s[0].toFixed(1) + "," + s[1].toFixed(1) + " A" + r + "," + r + " 0 0 0 " + e[0].toFixed(1) + "," + e[1].toFixed(1));
        var mx = cx - p[0], my = cy - p[1], ml = Math.hypot(mx, my);
        angleLabel.setAttribute("x", (p[0] + mx / ml * 50).toFixed(1)); angleLabel.setAttribute("y", (p[1] + my / ml * 50).toFixed(1));
      }
      rows.forEach(function (row, j) {
        on(row, "mouseenter", function () { choose(j); });
        on(row.querySelector(".lens-btn"), "click", function () { choose(j); });
      });
      choose(0);
    }, "#lensFig");

    /* ---------- 05 framework: a different drawing for each step ---------- */
    mount("framework", function () {
      var drawings = {
        // Knowing: what is known (solid) and what is only assumed (dashed). Hover pulls the assumption apart from the evidence.
        1: function (svg) {
          var s = 26, ox = 60, oy = 104;
          isoBox(svg, [0, 0, 0, 1, 1, 1], s, ox, oy);
          var g = svgEl(svg, "g", { "class": "mv g1-assume" });
          isoBox(g, [0, 0, 1, 1, 1, 2], s, ox, oy, { dashed: true });
          var q = iso(0.5, 0.5, 2, s, ox, oy);
          svgEl(g, "text", { "class": "gtxt", x: (q[0] + 26).toFixed(1), y: (q[1] - 2).toFixed(1) }, "?");
        },
        // Seeing: one object, three points of view. Hover makes the sight lines solid.
        2: function (svg) {
          var s = 24, ox = 72, oy = 84, eyes = [[18, 24], [132, 34], [16, 112]];
          var targets = [iso(0.5, 0.5, 1, s, ox, oy), iso(1, 0.5, 0.5, s, ox, oy), iso(0.5, 1, 0.5, s, ox, oy)];
          eyes.forEach(function (e, i) { svgEl(svg, "line", { "class": "g2-sight", x1: e[0], y1: e[1], x2: targets[i][0].toFixed(1), y2: targets[i][1].toFixed(1) }); });
          isoBox(svg, [0, 0, 0, 1, 1, 1], s, ox, oy);
          eyes.forEach(function (e) { svgEl(svg, "circle", { "class": "g2-eye", cx: e[0], cy: e[1], r: 4 }); });
        },
        // Situating: the object on its ground, among its neighbors. Hover reveals the ground grid.
        3: function (svg) {
          var s = 19, ox = 72, oy = 70, G = 1.9;
          svgEl(svg, "polygon", { "class": "ln-f", points: pts([iso(-G, -G, 0, s, ox, oy), iso(G, -G, 0, s, ox, oy), iso(G, G, 0, s, ox, oy), iso(-G, G, 0, s, ox, oy)]) });
          var grid = svgEl(svg, "g", { "class": "show" });
          for (var k = -G + 0.95; k < G - 0.1; k += 0.95) {
            var a = iso(k, -G, 0, s, ox, oy), b = iso(k, G, 0, s, ox, oy), c = iso(-G, k, 0, s, ox, oy), d = iso(G, k, 0, s, ox, oy);
            svgEl(grid, "line", { "class": "hid", x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1) });
            svgEl(grid, "line", { "class": "hid", x1: c[0].toFixed(1), y1: c[1].toFixed(1), x2: d[0].toFixed(1), y2: d[1].toFixed(1) });
          }
          isoBox(svg, [-1.6, -1.6, 0, -0.9, -0.9, 0.5], s, ox, oy);
          isoBox(svg, [0.9, -1.5, 0, 1.6, -0.8, 0.35], s, ox, oy);
          isoBox(svg, [-0.45, -0.45, 0, 0.45, 0.45, 1.5], s, ox, oy);
          isoBox(svg, [-1.5, 0.9, 0, -0.8, 1.6, 0.3], s, ox, oy);
        },
        // Valuing: two unequal weights on one beam. Hover tips the balance.
        4: function (svg) {
          var s = 20, ox = 74, oy = 92, apex = iso(0, 0, 1.1, s, ox, oy);
          var fl = iso(-0.45, 0.35, 0, s, ox, oy), fr = iso(0.45, 0.35, 0, s, ox, oy), bl = iso(0.45, -0.35, 0, s, ox, oy);
          face(svg, [fl, fr, apex], null);
          face(svg, [fr, bl, apex], "hs-s");
          var g = svgEl(svg, "g", { "class": "mv g4-beam", "data-ox": apex[0].toFixed(1), "data-oy": apex[1].toFixed(1) });
          isoBox(g, [-2.1, -0.25, 1.1, 2.1, 0.25, 1.28], s, ox, oy);
          isoBox(g, [-1.95, -0.45, 1.28, -1.05, 0.45, 2.18], s, ox, oy);
          isoBox(g, [1.35, -0.25, 1.28, 1.85, 0.25, 1.78], s, ox, oy);
        },
        // Acting: a measured move from where things were to where they go. Hover carries it through.
        5: function (svg) {
          var s = 22, ox = 40, oy = 82;
          isoBox(svg, [0, 0, 0, 1, 1, 1], s, ox, oy, { dashed: true });
          var a = iso(1.15, 0.5, 0.02, s, ox, oy), b = iso(2.9, 0.5, 0.02, s, ox, oy);
          svgEl(svg, "line", { "class": "ln", x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1) });
          face(svg, [[b[0] + 0.866 * 7, b[1] + 0.5 * 7], [b[0] - 0.5 * 4, b[1] + 0.866 * 4], [b[0] + 0.5 * 4, b[1] - 0.866 * 4]], null);
          isoBox(svgEl(svg, "g", { "class": "mv g5-cube" }), [1.3, 0, 0, 2.3, 1, 1], s, ox, oy);
        }
      };
      document.querySelectorAll("#path .glyph").forEach(function (box) {
        var svg = svgEl(box, "svg", { viewBox: "0 0 150 132", preserveAspectRatio: "xMinYMax meet" });
        drawings[box.getAttribute("data-g")](svg);
        // fit each drawing to its frame so all five read at the same size
        var bb = svg.getBBox(), vx = bb.x - 8, vy = bb.y - 14;
        svg.setAttribute("viewBox", [vx, vy, bb.width + 16, bb.height + 18].map(function (n) { return n.toFixed(1); }).join(" "));
        // pivots are in drawing units; the view box now starts at (vx, vy)
        svg.querySelectorAll("[data-ox]").forEach(function (n) { n.style.transformOrigin = (n.getAttribute("data-ox") - vx).toFixed(1) + "px " + (n.getAttribute("data-oy") - vy).toFixed(1) + "px"; });
      });
    }, "#path");

    /* ---------- 07 infrastructure: three isometric drawings on their own grids ---------- */
    mount("infrastructure", function () {
      function canvas(id) {
        var svg = document.getElementById(id);
        // the grid runs well past the view box so it fills the card at any shape; the card clips it
        isoGrid(svgEl(svg, "g", {}), -300, -200, 900, 640, 26, "2 3");
        return svgEl(svg, "g", { "class": "fig" });
      }
      // Orientation: a pentagonal pyramid pointing up. Hover raises it and shows the axis it aims along.
      (function () {
        var g = canvas("artOrientation"), s = 42, ox = 150, oy = 178, H = 1.75, ring = [];
        for (var k = 0; k < 5; k++) { var a = Math.PI / 4 + k * 2 * Math.PI / 5; ring.push([Math.cos(a) * 1.05, Math.sin(a) * 1.05]); }
        var apex = iso(0, 0, H, s, ox, oy), foot = iso(0, 0, 0, s, ox, oy);
        var aim = svgEl(g, "g", { "class": "aim" });
        svgEl(aim, "line", { "class": "dashed", x1: foot[0].toFixed(1), y1: foot[1].toFixed(1), x2: apex[0].toFixed(1), y2: (apex[1] - 34).toFixed(1) });
        svgEl(aim, "circle", { cx: apex[0].toFixed(1), cy: (apex[1] - 42).toFixed(1), r: 7 });
        svgEl(aim, "line", { x1: (apex[0] - 13).toFixed(1), y1: (apex[1] - 42).toFixed(1), x2: (apex[0] + 13).toFixed(1), y2: (apex[1] - 42).toFixed(1) });
        svgEl(aim, "line", { x1: apex[0].toFixed(1), y1: (apex[1] - 55).toFixed(1), x2: apex[0].toFixed(1), y2: (apex[1] - 29).toFixed(1) });
        var pyramid = svgEl(g, "g", { "class": "pyr" });
        ring.map(function (p, i) {
          var q = ring[(i + 1) % 5];
          return { depth: p[0] + p[1] + q[0] + q[1], shaded: p[0] - p[1] + q[0] - q[1] > 0, poly: [iso(p[0], p[1], 0, s, ox, oy), iso(q[0], q[1], 0, s, ox, oy), apex] };
        }).sort(function (x, y) { return x.depth - y.depth; }).forEach(function (f) { face(pyramid, f.poly, f.shaded ? "hs" : null); });
      })();
      // Cognitive: a wireframe cube holding a solid smaller cube
      (function () {
        var g = canvas("artCognitive"), s = 36, ox = 150, oy = 168;
        var outer = 1, z0 = 0, z1 = 2;
        var back = iso(-outer, -outer, z0, s, ox, oy);
        [iso(outer, -outer, z0, s, ox, oy), iso(-outer, outer, z0, s, ox, oy), iso(-outer, -outer, z1, s, ox, oy)].forEach(function (q) {
          svgEl(g, "line", { "class": "hid", x1: back[0].toFixed(1), y1: back[1].toFixed(1), x2: q[0].toFixed(1), y2: q[1].toFixed(1) });
        });
        [
          [iso(-1, -1, z1, s, ox, oy), iso(1, -1, z1, s, ox, oy), iso(1, 1, z1, s, ox, oy), iso(-1, 1, z1, s, ox, oy)],
          [iso(1, -1, z0, s, ox, oy), iso(1, 1, z0, s, ox, oy), iso(1, 1, z1, s, ox, oy), iso(1, -1, z1, s, ox, oy)],
          [iso(-1, 1, z0, s, ox, oy), iso(1, 1, z0, s, ox, oy), iso(1, 1, z1, s, ox, oy), iso(-1, 1, z1, s, ox, oy)]
        ].forEach(function (poly) { svgEl(g, "polygon", { "class": "ln", points: pts(poly) }); });
        isoBox(svgEl(g, "g", { "class": "inner" }), [-0.42, -0.42, 0.58, 0.42, 0.42, 1.42], s, ox, oy, { shade: "hs" });
      })();
      // Agency: three stacked plates
      (function () {
        var g = canvas("artAgency"), s = 36, ox = 150, oy = 160, half = 1.2, t = 0.26;
        [0, 0.72, 1.44].forEach(function (z, i) {
          isoBox(svgEl(g, "g", { "class": "pl pl" + i }), [-half, -half, z, half, half, z + t], s, ox, oy, { shade: "hs" });
        });
      })();
    }, "#artOrientation");

    /* ---------- close: the monogram crossing a threshold ---------- */
    // Above the line the mark is drawn crisp. Below it, the ink is sampled into dots that drop out, drift and fade.
    mount("threshold", function () {
      var cv = document.getElementById("dissolve"); if (!cv) return;
      var ctx = cv.getContext("2d"), src = document.getElementById("mono");
      var pBody = new Path2D(src.querySelector(".m-body").getAttribute("d"));
      var pShade = new Path2D(src.querySelector(".m-shade").getAttribute("d"));
      var pInk = new Path2D(src.querySelector(".m-ink").getAttribute("d"));
      var VB = { x: 40, y: 36, w: 676, h: 968 }, REST = 0.6, MIN = 0.08;
      var line = REST, target = REST, w = 0, h = 0, scale = 1, ox = 0, oy = 0, top = 0, markH = 0, pitch = 2, dots = [], shadePattern = null, ready = false, dragging = false;

      function layout() {
        var d = Math.min(window.devicePixelRatio || 1, 2), cw = cv.clientWidth, ch = cv.clientHeight;
        if (!cw || !ch) return;
        w = cw; h = ch; cv.width = Math.round(w * d); cv.height = Math.round(h * d);
        scale = (w * 0.9) / VB.w; markH = VB.h * scale;
        ox = (w - VB.w * scale) / 2 - VB.x * scale; oy = h * 0.03 - VB.y * scale; top = oy + VB.y * scale;
        // sample the ink and the shaded faces into dots, once per size
        var off = document.createElement("canvas"); off.width = Math.ceil(w); off.height = Math.ceil(h);
        var o = off.getContext("2d", { willReadFrequently: true }), rnd = seeded(11);
        dots = []; pitch = Math.max(1.6, w / 190);
        function sample(path, rule, step, kind) {
          o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, off.width, off.height);
          o.setTransform(scale, 0, 0, scale, ox, oy); o.fillStyle = "#000"; o.fill(path, rule);
          var data = o.getImageData(0, 0, off.width, off.height).data;
          for (var y = step / 2; y < off.height; y += step) for (var x = step / 2; x < off.width; x += step) {
            if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 110) dots.push({ x: x, y: y, kind: kind, r1: rnd(), r2: rnd(), r3: rnd() });
          }
        }
        sample(pInk, "evenodd", pitch, 0);
        sample(pShade, "nonzero", pitch * 3, 1);
        ready = true;
        draw();
      }
      function makePattern() {
        var pc = document.createElement("canvas"); pc.width = pc.height = 7;
        var p = pc.getContext("2d"); p.fillStyle = C.ink; p.globalAlpha = parseFloat(C["shade-op"]) || 0.5;
        p.beginPath(); p.arc(3.5, 3.5, 1.55, 0, 6.2832); p.fill();
        shadePattern = ctx.createPattern(pc, "repeat");
      }
      function draw() {
        if (!ready) return;
        var d = Math.min(window.devicePixelRatio || 1, 2), Y = top + line * markH, span = Math.max(1, h - Y);
        ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
        // crisp mark above the line
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, Y); ctx.clip();
        ctx.translate(ox, oy); ctx.scale(scale, scale);
        ctx.fillStyle = C.paper; ctx.fill(pBody);
        if (!shadePattern) makePattern();
        ctx.fillStyle = shadePattern; ctx.fill(pShade);
        ctx.fillStyle = C.ink; ctx.fill(pInk, "evenodd");
        ctx.restore();
        // dust below it
        var buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], alphas = [1, 0.66, 0.4, 0.18];
        dots.forEach(function (p) {
          if (p.y < Y) return;
          var k = Math.min(1, (p.y - Y) / (span * 0.8));
          if (p.r1 < k * 0.8) return;
          var spread = k * k, x = p.x + (p.r2 - 0.5) * spread * w * 0.55, y = p.y + p.r3 * spread * h * 0.22;
          var s = (p.kind ? pitch * 0.9 : pitch * 0.92) * (1 - k * 0.45);
          buckets[p.kind ? Math.min(3, 1 + Math.floor(k * 3)) : Math.min(3, Math.floor(k * 4))].rect(x - s / 2, y - s / 2, s, s);
        });
        ctx.fillStyle = C.ink;
        buckets.forEach(function (path, i) { ctx.globalAlpha = alphas[i]; ctx.fill(path); });
        ctx.globalAlpha = 1;
        // the line itself, with square end marks
        ctx.fillRect(w * 0.04, Y - 0.5, w * 0.92, 1);
        ctx.fillRect(w * 0.04 - 3.5, Y - 3.5, 7, 7); ctx.fillRect(w * 0.96 - 3.5, Y - 3.5, 7, 7);
      }
      // the line eases toward its target, then the loop stops
      var start = animator(function (dt) { line += (target - line) * Math.min(1, dt * 0.012); if (Math.abs(target - line) < 0.0008) line = target; draw(); }, function () { return Math.abs(target - line) > 0; });

      function setTarget(v) {
        target = clamp(v, MIN, 1);
        var dissolved = Math.round((1 - target) * 100);
        cv.setAttribute("aria-valuenow", dissolved);
        cv.setAttribute("aria-valuetext", dissolved + "% of the mark dissolved");
        if (motion.reduced) { line = target; draw(); } else start();
      }
      function fromPointer(e) { var r = cv.getBoundingClientRect(); setTarget((e.clientY - r.top - top) / markH); }
      on(cv, "pointermove", function (e) { if (e.pointerType === "mouse" || dragging) fromPointer(e); });
      on(cv, "pointerdown", function (e) {
        fromPointer(e);
        // a mouse can drag the line; on touch a tap places it, and swiping still scrolls the page
        if (e.pointerType === "mouse") { dragging = true; cv.setPointerCapture(e.pointerId); }
      });
      on(cv, "pointerup", function () { dragging = false; });
      on(cv, "pointercancel", function () { dragging = false; });
      on(cv, "pointerleave", function (e) { if (e.pointerType === "mouse" && !dragging) setTarget(REST); });
      on(cv, "keydown", function (e) {
        // value = how much of the mark has dissolved; raising it moves the line up
        var step = { ArrowUp: -0.05, ArrowRight: -0.05, ArrowDown: 0.05, ArrowLeft: 0.05, PageUp: -0.2, PageDown: 0.2 }[e.key];
        if (e.key === "Home") setTarget(1);
        else if (e.key === "End") setTarget(MIN);
        else if (step) setTarget(target + step);
        else return;
        e.preventDefault();
      });
      themeHandlers.push(function () { shadePattern = null; draw(); });
      // sample the mark only when it comes near the screen, and again if its size changes
      var near = false;
      var io = observer("IntersectionObserver", function (entries) { if (entries[entries.length - 1].isIntersecting && !near) { near = true; layout(); } }, { rootMargin: "600px 0px" });
      if (io) io.observe(cv); else layout();
      var ro = observer("ResizeObserver", function () { if (near && (cv.clientWidth !== w || cv.clientHeight !== h)) layout(); });
      if (ro) ro.observe(cv);
    });

    /* ---------- light and dark ---------- */
    mount("theme", function () {
      var btn = document.getElementById("themeBtn"), label = btn.querySelector(".hbtn-label");
      function current() { return root.getAttribute("data-theme") || (darkQuery.matches ? "dark" : "light"); }
      function render() {
        var dark = current() === "dark";
        label.textContent = dark ? "Light" : "Dark";
        btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      }
      on(btn, "click", function () {
        var next = current() === "dark" ? "light" : "dark";
        function apply() { root.setAttribute("data-theme", next); store(THEME_KEY, next); render(); }
        if (document.startViewTransition && !motion.reduced && !document.hidden) {
          var r = btn.getBoundingClientRect();
          root.style.setProperty("--vt-x", Math.round(r.left + r.width / 2) + "px");
          root.style.setProperty("--vt-y", Math.round(r.top + r.height / 2) + "px");
          try { document.startViewTransition(apply).ready.catch(function () {}); } catch (e) { apply(); }
        } else apply();
      });
      on(darkQuery, "change", render);
      render();
    });

    /* ---------- menu (narrow windows) ---------- */
    mount("menu", function () {
      var btn = document.getElementById("menuBtn"), nav = document.getElementById("siteNav"), label = btn.querySelector(".hbtn-label");
      function setOpen(open) {
        nav.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", String(open));
        label.textContent = open ? "Close" : "Menu";
      }
      on(btn, "click", function () { setOpen(!nav.classList.contains("open")); });
      on(nav, "click", function (e) { if (e.target.closest("a")) setOpen(false); });
      on(document, "keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); btn.focus(); } });
      on(document, "click", function (e) { if (nav.classList.contains("open") && !e.target.closest(".hdr-r")) setOpen(false); });
      setOpen(false);
    }, "#menuBtn");

    /* ---------- header: compacts once the page moves; publishes its height for sticky offsets ---------- */
    mount("header", function () {
      var header = document.querySelector(".top"), sentinel = document.getElementById("topSentinel");
      var io = observer("IntersectionObserver", function (entries) { header.classList.toggle("stuck", !entries[entries.length - 1].isIntersecting); });
      if (io && sentinel) io.observe(sentinel);
      function publish() { root.style.setProperty("--hdr-h", header.offsetHeight + "px"); }
      var ro = observer("ResizeObserver", publish);
      if (ro) ro.observe(header); else publish();
    });

    /* ---------- arrivals: content below the first screen rises into place once ---------- */
    mount("arrivals", function () {
      if (motion.reduced || !("IntersectionObserver" in window)) return;
      var selector = ".label, .head, .split, .define, .quote, .meet-fig, .meet-list, .charter > div, .lens-fig, .lenses li, .engineering, .path li, .shift, .sub, .criteria li, .atlas, .planes > li, .aside, .principles > div, .labs .body, .close-fig, .close h2, .close p, .ask-intro, .ask-form, .pr-intro-grid, .pr-index, .pr-loop, .prod-top, .demo, .rail-head, .rail, .cases, .value, .mem-head, .vortex, .mem-note, .tblock, .rm-strip, .rm-seq, .ph-head, .rmfig, .facts > div";
      var items = Array.prototype.slice.call(document.querySelectorAll(selector)), vh = window.innerHeight;
      var tops = items.map(function (n) { return n.getBoundingClientRect().top; }); // read everything first, then write
      var todo = items.filter(function (n, i) { return tops[i] >= vh * 0.92; });
      todo.forEach(function (n) {
        var index = Array.prototype.indexOf.call(n.parentElement.children, n), delay = 0;
        if (n.matches(".path li, .planes > li")) delay = index * 0.11;
        else if (n.matches(".principles > div")) delay = (index % 3) * 0.1;
        else if (n.matches(".head, .close h2")) delay = 0.1;
        else if (n.matches(".close-note")) delay = 0.4;
        else if (n.matches(".close p")) delay = 0.25;
        n.classList.add("rv", "pre");
        if (delay) n.style.setProperty("--d", delay.toFixed(2) + "s");
      });
      var io = observer("IntersectionObserver", function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -10% 0px" });
      todo.forEach(function (n) { io.observe(n); });
    });

    /* ---------- the tagline: how each half arrives ---------- */
    // Each half carries data-fx (set in tools/build.py):
    //   "decode": the words resolve out of drafting marks, one letter at a time, left to right; again on hover.
    //   "label":  an ink tag wipes in behind the words (a copy of them in paper color sits on the tag).
    // Order on load: the decode runs first, then the tag wipes in once it has finished. Each half reacts
    // only to the pointer over its own words.
    mount("tagline", function () {
      var line = document.querySelector(".tagline"); if (!line) return;
      var MARKS = "/\\|+×◇─╱╲·#=";
      var decoders = [], labels = [];

      line.querySelectorAll("[data-fx]").forEach(function (host) {
        var text = host.getAttribute("data-text") || host.textContent;
        host.setAttribute("data-text", text);
        host.textContent = text; // undo a previous boot's markup
        host.classList.remove("in");
        var fx = host.getAttribute("data-fx");
        if (fx === "label") {
          var ink = document.createElement("span"); ink.className = "tl-ink"; ink.setAttribute("aria-hidden", "true"); ink.textContent = text;
          host.appendChild(ink);
          labels.push(host);
          // a mouse lifts it on hover (CSS); a tap lifts it briefly
          var drop = 0;
          on(host, "pointerdown", function (e) {
            if (e.pointerType === "mouse") return;
            host.classList.add("lift"); clearTimeout(drop);
            drop = setTimeout(function () { host.classList.remove("lift"); }, 1100);
          });
        } else if (fx === "decode") {
          var d = decoder(host, text);
          decoders.push(d);
          // each half reacts only to its own words: pointing at (or tapping) these runs the decode again
          on(host, "pointerenter", function (e) { if (e.pointerType === "mouse" && !d.busy()) d.run(); });
          on(host, "pointerdown", function (e) { if (e.pointerType !== "mouse" && !d.busy()) d.run(); });
        }
      });

      function decoder(host, text) {
        // screen readers get the words once; the animated letters are hidden from them
        host.textContent = "";
        var said = document.createElement("span"); said.className = "sr"; said.textContent = text; host.appendChild(said);
        var box = document.createElement("span"); box.className = "tl-fx"; box.setAttribute("aria-hidden", "true"); host.appendChild(box);
        var cells = text.split("").map(function (ch) {
          var c = document.createElement("span"); c.className = "ch"; c.textContent = ch; box.appendChild(c);
          return { el: c, ch: ch, still: ch === " " || ch === "." };
        });
        var timer = 0;
        function settle() { clearInterval(timer); timer = 0; cells.forEach(function (c) { c.el.textContent = c.ch; c.el.classList.remove("busy"); }); }
        signal.addEventListener("abort", settle);
        return {
          // lock each cell to its letter's width, in em so it scales with the line
          lock: function () {
            var fs = parseFloat(getComputedStyle(box).fontSize) || 16;
            cells.forEach(function (c) { c.el.style.width = ""; });
            cells.forEach(function (c) { c.el.style.width = (c.el.getBoundingClientRect().width / fs).toFixed(3) + "em"; });
          },
          busy: function () { return !!timer; },
          duration: 120 + cells.length * 55,
          run: function () {
            if (motion.reduced || !alive()) return;
            clearInterval(timer);
            var t0 = performance.now();
            timer = setInterval(function () {
              if (!alive()) { settle(); return; }
              var t = performance.now() - t0, left = false;
              cells.forEach(function (c, i) {
                if (c.still) return;
                if (t < 120 + i * 55) { c.el.textContent = MARKS.charAt(Math.floor(Math.random() * MARKS.length)); c.el.classList.add("busy"); left = true; }
                else if (c.el.classList.contains("busy")) { c.el.textContent = c.ch; c.el.classList.remove("busy"); }
              });
              if (!left) settle();
            }, 45);
          }
        };
      }

      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        if (!alive()) return;
        decoders.forEach(function (d) { d.lock(); });
        var start = 900; // after the wordmark has drawn in
        var tagAt = start + decoders.reduce(function (a, d) { return Math.max(a, d.duration); }, 0) + 150;
        setTimeout(function () { decoders.forEach(function (d) { d.run(); }); }, start);
        setTimeout(function () { if (alive()) labels.forEach(function (l) { l.classList.add("in"); }); }, motion.reduced ? 0 : tagAt);
      });
    });

    /* ---------- 10 your question: the contact form ---------- */
    // Visitors pick "Ask a question" or "Leave a note". A question gets a drawn question mark after the last word
    // and is sent with one; a note is sent as written.
    mount("ask", function () {
      var form = document.getElementById("askForm"); if (!form) return;
      var q = document.getElementById("askQ"), box = q.parentNode, mirror = box.querySelector(".q-text");
      var more = document.getElementById("askMore"), status = document.getElementById("askStatus");
      var done = document.getElementById("askDone"), email = form.elements.email, sendLabel = form.querySelector(".ask-send-label");
      var mark = form.querySelector(".q-mark"), qLabel = document.getElementById("askQLabel");
      var hintQ = form.querySelector(".hint-q"), hintN = form.querySelector(".hint-n");
      var KINDS = {
        question: {
          mark: "Q.", label: "Your question", noun: "question", empty: "Start with the question.",
          ideas: ["How would an AI know it’s out of its depth?", "Can good judgment be measured?", "What should a system refuse to optimize?",
            "Who decides what’s worth doing?", "What does an AI owe the people who rely on it?"]
        },
        note: {
          mark: "N.", label: "Your note", noun: "note", empty: "Start with your note.",
          ideas: ["I’d like to work with you on this.", "I read the thesis and want to push back on one part.", "We’re building something you should see.",
            "Count me in for Labs.", "Hello. That’s it, just hello."]
        }
      };
      /* B. Where does it sit? A pentagon with one lens at each corner. The visitor drops a pin; the corners it is
         closest to are drawn solid and named in plain words. Touch: tap to place (swiping still scrolls).
         Mouse: click or drag. Keyboard: arrow keys move it, Home centers it, Delete removes it. */
      var map = (function () {
        var svg = document.getElementById("askMap"), read = document.getElementById("askMapRead");
        var clear = document.getElementById("askMapClear"), field = document.getElementById("askSits");
        var CX = 200, CY = 156, R = 112;
        // same order as the lens drawing in section 04, clockwise from the top
        var LENSES = [
          { label: "Cognitive science", name: "cognitive science" },
          { label: "Psychology", name: "psychology" },
          { label: "Anthropology", name: "anthropology" },
          { label: "Philosophy", name: "philosophy" },
          { label: "History &\nsystems", name: "systems thinking" }
        ];
        var V = LENSES.map(function (l, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [CX + R * Math.cos(a), CY + R * Math.sin(a)]; });
        svg.innerHTML = "";
        svg.setAttribute("viewBox", "0 0 400 300");
        svgEl(svg, "polygon", { "class": "mp-out", points: pts(V) });
        [0.5].forEach(function (k) { svgEl(svg, "polygon", { "class": "mp-in", points: pts(V.map(function (p) { return [CX + (p[0] - CX) * k, CY + (p[1] - CY) * k]; })) }); });
        svgEl(svg, "line", { "class": "mp-ctr", x1: CX - 6, y1: CY, x2: CX + 6, y2: CY });
        svgEl(svg, "line", { "class": "mp-ctr", x1: CX, y1: CY - 6, x2: CX, y2: CY + 6 });
        var rays = V.map(function (p) { return svgEl(svg, "line", { "class": "mp-ray", x1: CX, y1: CY, x2: p[0].toFixed(1), y2: p[1].toFixed(1) }); });
        var nodes = V.map(function (p) { return svgEl(svg, "circle", { "class": "mp-node", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 5.5 }); });
        var labels = V.map(function (p, i) {
          var dx = p[0] - CX, dy = p[1] - CY, l = Math.hypot(dx, dy);
          var x = p[0] + dx / l * 16, y = p[1] + dy / l * 16 + 4;
          var anchor = Math.abs(dx) < 10 ? "middle" : dx > 0 ? "start" : "end";
          if (i === 0) y -= 4; if (i === 2 || i === 3) y += 8;
          var lines = LENSES[i].label.split("\n"), t = svgEl(svg, "text", { "class": "mp-lab", x: x.toFixed(1), y: (y - (lines.length - 1) * 7).toFixed(1), "text-anchor": anchor });
          lines.forEach(function (line, k) { svgEl(t, "tspan", { x: x.toFixed(1), dy: k ? 14 : 0 }, line); });
          return t;
        });
        var hint = svgEl(svg, "text", { "class": "mp-hint", x: CX, y: CY + 30, "text-anchor": "middle" }, "drop your question here");
        var pin = svgEl(svg, "g", { "class": "mp-pin" }); pin.style.display = "none";
        svgEl(pin, "circle", { "class": "mp-ring", r: 13 });
        svgEl(pin, "circle", { "class": "mp-dot", r: 5 });
        svgEl(pin, "line", { "class": "mp-ctr", x1: -20, y1: 0, x2: -14, y2: 0 }); svgEl(pin, "line", { "class": "mp-ctr", x1: 14, y1: 0, x2: 20, y2: 0 });
        svgEl(pin, "line", { "class": "mp-ctr", x1: 0, y1: -20, x2: 0, y2: -14 }); svgEl(pin, "line", { "class": "mp-ctr", x1: 0, y1: 14, x2: 0, y2: 20 });

        var at = null, dragging = false;
        function inside(p) {
          var c = false;
          for (var i = 0, j = 4; i < 5; j = i++) {
            if ((V[i][1] > p[1]) !== (V[j][1] > p[1]) && p[0] < (V[j][0] - V[i][0]) * (p[1] - V[i][1]) / (V[j][1] - V[i][1]) + V[i][0]) c = !c;
          }
          return c;
        }
        // a point outside the shape slides in toward the center until it is inside
        function keepInside(p) {
          if (inside(p)) return p;
          var lo = 0, hi = 1;
          for (var k = 0; k < 18; k++) { var mid = (lo + hi) / 2; if (inside([CX + (p[0] - CX) * mid, CY + (p[1] - CY) * mid])) lo = mid; else hi = mid; }
          return [CX + (p[0] - CX) * lo * 0.97, CY + (p[1] - CY) * lo * 0.97];
        }
        function describe(p) {
          if (Math.hypot(p[0] - CX, p[1] - CY) < R * 0.2) return { text: "Right in the middle: it needs all five lenses.", near: [0, 1, 2, 3, 4] };
          var w = V.map(function (v, i) { return { i: i, w: 1 / (Math.hypot(p[0] - v[0], p[1] - v[1]) + 1) }; }).sort(function (a, b) { return b.w - a.w; });
          var a = LENSES[w[0].i].name, b = LENSES[w[1].i].name;
          if (w[1].w / w[0].w > 0.78) return { text: "Between " + a + " and " + b + ".", near: [w[0].i, w[1].i] };
          if (w[1].w / w[0].w < 0.45) return { text: "Squarely in " + a + ".", near: [w[0].i] };
          return { text: "Mostly " + a + ", with some " + b + ".", near: [w[0].i, w[1].i] };
        }
        function place(p) {
          at = keepInside(p);
          var d = describe(at), text = d.text.charAt(0).toUpperCase() + d.text.slice(1);
          pin.style.display = ""; hint.style.display = "none";
          pin.setAttribute("transform", "translate(" + at[0].toFixed(1) + "," + at[1].toFixed(1) + ")");
          rays.forEach(function (r, i) { r.setAttribute("x1", at[0].toFixed(1)); r.setAttribute("y1", at[1].toFixed(1)); r.classList.toggle("near", d.near.indexOf(i) >= 0); });
          nodes.forEach(function (n, i) { n.classList.toggle("near", d.near.indexOf(i) >= 0); });
          labels.forEach(function (n, i) { n.classList.toggle("near", d.near.indexOf(i) >= 0); });
          read.textContent = text; read.classList.remove("empty");
          field.value = text; clear.hidden = false;
        }
        function reset() {
          at = null; pin.style.display = "none"; hint.style.display = "";
          rays.forEach(function (r) { r.setAttribute("x1", CX); r.setAttribute("y1", CY); r.classList.remove("near"); });
          nodes.concat(labels).forEach(function (n) { n.classList.remove("near"); });
          read.textContent = "Not placed yet."; read.classList.add("empty"); field.value = ""; clear.hidden = true;
        }
        function fromEvent(e) {
          var r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
          return [vb.x + (e.clientX - r.left) / r.width * vb.width, vb.y + (e.clientY - r.top) / r.height * vb.height];
        }
        on(svg, "pointerdown", function (e) {
          place(fromEvent(e));
          if (e.pointerType === "mouse") { dragging = true; svg.setPointerCapture(e.pointerId); pin.style.transition = "none"; }
        });
        on(svg, "pointermove", function (e) { if (dragging) place(fromEvent(e)); });
        function stop() { dragging = false; pin.style.transition = ""; }
        on(svg, "pointerup", stop); on(svg, "pointercancel", stop);
        on(svg, "keydown", function (e) {
          var step = e.shiftKey ? 30 : 12, p = at || [CX, CY];
          var move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
          if (move) place([p[0] + move[0], p[1] + move[1]]);
          else if (e.key === "Home") place([CX, CY]);
          else if (e.key === "Delete" || e.key === "Backspace") reset();
          else return;
          e.preventDefault();
        });
        on(clear, "click", function () { reset(); svg.focus(); });
        reset();
        return { reset: reset, value: function () { return field.value; } };
      })();

      function kind() { var r = form.querySelector('input[name="kind"]:checked'); return r ? r.value : "question"; }
      function K() { return KINDS[kind()]; }
      function written() { return q.value.trim(); }
      function needsMark(text) { return kind() === "question" && text && !/[?？]$/.test(text); }
      function finalText() { var t = written(); return t + (needsMark(t) ? "?" : ""); }

      // The field grows with what's typed. While it's empty it holds the height of the longest example,
      // so the typed-out placeholder never makes the page below it jump.
      function fit() {
        q.style.height = "auto";
        if (q.value) { q.style.height = q.scrollHeight + "px"; return; }
        mirror.textContent = K().ideas.reduce(function (a, b) { return b.length > a.length ? b : a; });
        q.style.height = mirror.parentNode.scrollHeight + "px"; mirror.textContent = "";
      }
      // the mirror holds the same words (invisible) so the drawn question mark lands right after the last one
      function update() {
        var text = written();
        mirror.textContent = q.value;
        box.classList.toggle("tail", !!needsMark(text));
        fit();
        var waiting = text.length < 2;
        form.classList.toggle("waiting", waiting);
        more.inert = waiting;
      }
      function setKind() {
        var k = K();
        mark.textContent = k.mark; qLabel.textContent = k.label;
        hintQ.hidden = kind() !== "question"; hintN.hidden = kind() === "question";
        sendLabel.textContent = "Send the " + k.noun;
        idea = 0; settlePlaceholder(); status.textContent = "";
        update();
        if (document.activeElement !== q) timer = setTimeout(cycle, 1500);
      }
      form.querySelectorAll('input[name="kind"]').forEach(function (r) { on(r, "change", setKind); });
      on(form.querySelector(".ask-switch"), "click", function () { form.querySelector('input[name="kind"][value="note"]').checked = true; setKind(); q.focus(); });

      on(q, "input", function () { status.textContent = ""; update(); });
      on(q, "keydown", function (e) {
        // Enter moves on to the next step; Shift+Enter still starts a new line
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); update(); if (written().length >= 2) email.focus(); }
      });
      on(window, "resize", fit, { passive: true });
      on(form, "input", function (e) { if (e.target !== q) status.textContent = ""; });

      // the placeholder types out examples while the field is empty and on screen
      var idea = 0, chars = 0, deleting = false, timer = 0;
      var view = watchVisible(form, function (v) { if (v) cycle(); });
      function cycle() {
        clearTimeout(timer);
        if (!alive() || !view.visible || motion.still() || q.value || document.activeElement === q) return;
        var list = K().ideas, wait;
        if (deleting) { chars--; wait = 22; if (chars <= 0) { deleting = false; idea = (idea + 1) % list.length; wait = 350; } }
        else { chars++; wait = 45; if (chars >= list[idea].length) { chars = list[idea].length; deleting = true; wait = 2800; } }
        q.setAttribute("placeholder", list[idea].slice(0, Math.max(0, chars)));
        timer = setTimeout(cycle, wait);
      }
      function settlePlaceholder() { clearTimeout(timer); var list = K().ideas; idea = idea % list.length; q.setAttribute("placeholder", list[idea]); chars = list[idea].length; deleting = true; }
      on(q, "focus", settlePlaceholder);
      on(q, "blur", function () { timer = setTimeout(cycle, 1500); });
      motion.handlers.push(function () { if (motion.still()) settlePlaceholder(); else cycle(); });
      signal.addEventListener("abort", function () { clearTimeout(timer); });

      function say(text, link) {
        status.textContent = text;
        if (link) { status.appendChild(document.createTextNode(" ")); var a = document.createElement("a"); a.href = link.href; a.textContent = link.text; status.appendChild(a); }
      }
      function mailLink() {
        return "mailto:" + form.getAttribute("data-mail") + "?subject=" + encodeURIComponent("A " + K().noun + " for Pentaliminal") + "&body=" + encodeURIComponent(finalText());
      }
      function showDone(message, from, to) {
        document.getElementById("askKind").textContent = (kind() === "question" ? "Question" : "Note") + " received";
        document.getElementById("askEcho").textContent = message;
        document.getElementById("askFrom").textContent = from;
        document.getElementById("askTo").textContent = to;
        var sits = map.value(), sitsEl = document.getElementById("askSitsEcho");
        sitsEl.textContent = sits; sitsEl.hidden = !sits; done.querySelector(".t-sits-k").hidden = !sits;
        document.getElementById("askAfter").textContent = "Thank you. A person will read your " + (kind() === "question" ? "question" : "note") +
          " and think it through, then write back to " + to + ". If there\u2019s more to explore, we explore it with you.";
        form.hidden = true; done.hidden = false;
        done.classList.remove("in"); void done.offsetWidth; done.classList.add("in");
        done.focus({ preventScroll: true });
        var r = done.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) done.scrollIntoView({ block: "center", behavior: motion.reduced ? "auto" : "smooth" });
      }

      on(form, "submit", function (e) {
        e.preventDefault();
        if (!written()) { say(K().empty); q.focus(); return; }
        if (!email.value.trim() || !email.checkValidity()) { say("That email doesn’t look right yet."); email.focus(); return; }
        var message = finalText(), noun = K().noun, reply = email.value.trim();
        var role = form.querySelector('input[name="asking_as"]:checked');
        var name = form.elements.name.value.trim();
        var from = name || (role ? role.parentNode.textContent.trim() : "Someone curious");
        if (form.elements._honey.value) { showDone(message, from, reply); return; } // a bot filled the hidden field
        form.classList.add("sending"); sendLabel.textContent = "Sending…"; say("");
        var payload = { kind: noun, message: message, where_it_sits: map.value(), asking_as: role ? role.value : "", name: name, email: reply,
          _subject: "New " + noun + " from pentaliminal.ai", _template: "table", _replyto: reply };
        fetch(form.getAttribute("data-endpoint"), {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload),
          signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
        }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || String(j.success) !== "true") throw new Error(j.message || r.status); }); })
          .then(function () { if (alive()) showDone(message, from, reply); })
          .catch(function () {
            if (!alive()) return;
            if (form.getAttribute("data-mail")) say("That didn’t go through on our end.", { href: mailLink(), text: "Send it by email instead" });
            else say("That didn’t go through on our end. Your " + noun + " is still here; please try again in a moment.");
          })
          .then(function () { form.classList.remove("sending"); sendLabel.textContent = "Send the " + K().noun; });
      });

      on(document.getElementById("askAgain"), "click", function () {
        form.reset(); map.reset(); form.hidden = false; done.hidden = true; setKind(); q.focus();
      });
      form.noValidate = true; // our own messages replace the browser bubbles; without this script the browser checks still apply
      form.hidden = false; done.hidden = true;
      setKind(); idea = 0; chars = 0; deleting = false; cycle();
    });

    /* ---------- V3: the product chapters (src/products.js) ---------- */
    if (window.__plProducts) mount("products", function () {
      window.__plProducts({ on: on, observer: observer, animator: animator, watchVisible: watchVisible, motion: motion, alive: alive, mount: mount,
        svgEl: svgEl, iso: iso, isoBox: isoBox, isoGrid: isoGrid, pts: pts, seeded: seeded });
    }, "#products");

    /* ---------- section tracker and current-section nav state ---------- */
    mount("tracker", function () {
      var links = Array.prototype.slice.call(document.querySelectorAll("#gauge a, #siteNav a")), inBand = {};
      function mark(id) {
        links.forEach(function (a) {
          var here = id !== null && a.getAttribute("href") === "#" + id;
          a.classList.toggle("on", here);
          if (a.closest("#siteNav")) { if (here) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); }
        });
      }
      // a section counts as current while it crosses a thin band just above the middle of the screen;
      // in the hero (or between sections) nothing is current
      var io = observer("IntersectionObserver", function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) inBand[e.target.id] = true; else delete inBand[e.target.id]; });
        var ids = Object.keys(inBand);
        mark(ids.length ? ids[ids.length - 1] : null);
      }, { rootMargin: "-45% 0px -50% 0px" });
      if (io) document.querySelectorAll("main section[id]").forEach(function (s) { io.observe(s); });
    }, "#gauge");
  }

  // In the claude.ai preview, updates are swapped into the open page; its hot hook runs boot() again on the new DOM.
  var hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(boot);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
