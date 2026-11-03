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
