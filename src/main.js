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
    function mount(name, fn) {
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
    document.querySelectorAll(".construct .hf-layer, .tw-cv, .tw-base").forEach(function (n) { n.remove(); });
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
    });

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
    });

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
    });

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
    });

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
    });

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
    });

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
      var selector = ".label, .head, .split, .define, .quote, .meet-fig, .meet-list, .charter > div, .lens-fig, .lenses li, .engineering, .path li, .shift, .sub, .criteria li, .atlas, .planes > li, .aside, .principles > div, .labs .body, .close-fig, .close h2, .close p, .ask-intro, .ask-form, .tblock";
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

    /* ---------- "Toward wisdom.": crisp type with isometric depth, shaded in halftone ---------- */
    // The words stay real, solid text. Behind them, a 30° extrusion (like the monogram's shaded faces)
    // is drawn as a dot screen: dots are largest where the side meets the letter and shrink as it recedes.
    mount("towardWisdom", function () {
      var host = document.querySelector(".tagline .tl-b"); if (!host) return;
      var text = host.textContent.trim().toUpperCase();
      var cv = document.createElement("canvas"), base = document.createElement("span");
      cv.className = "tw-cv"; cv.setAttribute("aria-hidden", "true");
      base.className = "tw-base"; base.setAttribute("aria-hidden", "true");
      host.classList.add("tw"); host.appendChild(base); host.appendChild(cv);
      var ctx = cv.getContext("2d"), dots = [], W = 0, H = 0, depth = 0, goal = 0, built = "";
      var DX = Math.cos(Math.PI / 6), DY = Math.sin(Math.PI / 6), REST = 0.72;

      function build() {
        var cs = getComputedStyle(host), fs = parseFloat(cs.fontSize);
        var r = host.getBoundingClientRect(), b = base.getBoundingClientRect();
        if (!r.width) return false;
        var textW = b.left - r.left, baseY = b.top - r.top, key = [textW, baseY, fs].map(Math.round).join("x");
        if (key === built) return true; // nothing changed
        built = key;
        var reach = fs * 0.36, pad = Math.ceil(reach + 4), d = Math.min(window.devicePixelRatio || 1, 3);
        W = Math.ceil(textW) + pad * 2; H = Math.ceil(r.height) + pad * 2;
        cv.width = Math.round(W * d); cv.height = Math.round(H * d);
        cv.style.cssText = "width:" + W + "px;height:" + H + "px;left:" + -pad + "px;top:" + -pad + "px";
        ctx.setTransform(d, 0, 0, d, 0, 0);
        // the letters, drawn large offscreen in the page's own face and fitted to the real text's width
        var K = 3, off = document.createElement("canvas"); off.width = W * K; off.height = H * K;
        var o = off.getContext("2d", { willReadFrequently: true });
        o.font = cs.fontStyle + " " + cs.fontWeight + " " + (fs * K) + "px " + cs.fontFamily;
        if ("fontStretch" in o) o.fontStretch = "condensed";
        if ("letterSpacing" in o) o.letterSpacing = (0.02 * fs * K) + "px";
        var sx = (textW * K) / (o.measureText(text).width || 1);
        o.fillStyle = "#000"; o.textBaseline = "alphabetic";
        // stack copies pushed back along the 30° axis; record how deep each cell is first covered
        var pitch = Math.max(1.6, fs / 13), cols = Math.floor(W / pitch), rows = Math.floor(H / pitch), at = new Float32Array(cols * rows).fill(-1);
        function stamp(dd, level) {
          o.setTransform(sx, 0, 0, 1, (pad + dd * DX) * K, dd * DY * K);
          o.fillText(text, 0, (baseY + pad) * K);
          var data = o.getImageData(0, 0, off.width, off.height).data;
          for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
            var k = j * cols + i; if (at[k] >= 0) continue;
            if (data[(Math.floor((j + 0.5) * pitch * K) * off.width + Math.floor((i + 0.5) * pitch * K)) * 4 + 3] > 100) at[k] = level;
          }
        }
        stamp(0, 0); // the letter faces themselves: the real text covers these
        var steps = Math.ceil(reach / (pitch * 0.5));
        for (var s = 1; s <= steps; s++) stamp(reach * s / steps, s / steps);
        dots = [];
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var v = at[j * cols + i];
          if (v > 0) dots.push({ x: (i + 0.5) * pitch, y: (j + 0.5) * pitch, z: v, r: pitch * 0.36 * (1 - v * 0.6) });
        }
        return true;
      }
      function draw() {
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.ink; ctx.globalAlpha = 0.72; ctx.beginPath();
        dots.forEach(function (p) {
          if (p.z > depth) return;
          var r = p.r * Math.min(1, (depth - p.z) * 6 + 0.35);
          ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, 6.2832);
        });
        ctx.fill();
      }
      var start = animator(function (dt) {
        depth += (goal - depth) * Math.min(1, dt * 0.0042);
        if (Math.abs(goal - depth) < 0.002) depth = goal;
        draw();
      }, function () { return depth !== goal; });
      function to(v) { goal = v; if (motion.reduced) { depth = v; draw(); } else start(); }

      var tagline = host.parentNode;
      on(tagline, "pointerenter", function (e) { if (e.pointerType === "mouse") to(1); });
      on(tagline, "pointerleave", function () { to(REST); });
      themeHandlers.push(draw);
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        if (!alive() || !build()) return;
        if (motion.reduced) { depth = goal = REST; draw(); return; }
        depth = 0; draw();
        setTimeout(function () { if (alive()) to(REST); }, 650);
        var wait = 0;
        var ro = observer("ResizeObserver", function () { clearTimeout(wait); wait = setTimeout(function () { if (alive() && build()) draw(); }, 80); });
        if (ro) ro.observe(tagline);
      });
    });

    /* ---------- 10 your question: the contact form ---------- */
    mount("ask", function () {
      var form = document.getElementById("askForm"); if (!form) return;
      var q = document.getElementById("askQ"), box = q.parentNode, mirror = box.querySelector(".q-text");
      var more = document.getElementById("askMore"), status = document.getElementById("askStatus");
      var done = document.getElementById("askDone"), email = form.elements.email, sendLabel = form.querySelector(".ask-send-label");
      var IDEAS = [
        "How would an AI know it’s out of its depth?",
        "Can good judgment be measured?",
        "What should a system refuse to optimize?",
        "Who decides what’s worth doing?",
        "What does an AI owe the people who rely on it?"
      ];
      function asked() { return q.value.trim(); }
      function needsMark(text) { return text && !/[?？]$/.test(text); }

      // The field grows with what's typed. While it's empty it holds the height of the longest example question,
      // so the typed-out placeholder never makes the page below it jump.
      var longest = IDEAS.reduce(function (a, b) { return b.length > a.length ? b : a; });
      function fit() {
        if (q.value) { q.style.height = "auto"; q.style.height = q.scrollHeight + "px"; return; }
        q.style.height = "auto"; mirror.textContent = longest;
        q.style.height = mirror.parentNode.scrollHeight + "px"; mirror.textContent = "";
      }
      // the mirror holds the same words (invisible) so the drawn question mark lands right after the last one
      function update() {
        var text = asked();
        mirror.textContent = q.value;
        box.classList.toggle("tail", !!needsMark(text));
        fit();
        var waiting = text.length < 3;
        form.classList.toggle("waiting", waiting);
        more.inert = waiting;
      }
      on(q, "input", function () { status.textContent = ""; update(); });
      on(q, "keydown", function (e) {
        // Enter moves on to the next step; Shift+Enter still starts a new line
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); update(); if (asked().length >= 3) email.focus(); }
      });
      on(window, "resize", fit, { passive: true });
      on(form, "input", function (e) { if (e.target !== q) status.textContent = ""; });

      // the placeholder types out example questions while the field is empty and on screen
      var idea = 0, chars = IDEAS[0].length, deleting = false, timer = 0;
      var view = watchVisible(form, function (v) { if (v) cycle(); });
      function cycle() {
        clearTimeout(timer);
        if (!alive() || !view.visible || motion.still() || q.value || document.activeElement === q) return;
        var full = IDEAS[idea], wait;
        if (deleting) { chars--; wait = 22; if (chars <= 0) { deleting = false; idea = (idea + 1) % IDEAS.length; wait = 350; } }
        else { chars++; wait = 45; if (chars >= full.length) { chars = full.length; deleting = true; wait = 2800; } }
        q.setAttribute("placeholder", IDEAS[idea].slice(0, Math.max(0, chars)));
        timer = setTimeout(cycle, wait);
      }
      function settlePlaceholder() { clearTimeout(timer); q.setAttribute("placeholder", IDEAS[idea]); chars = IDEAS[idea].length; deleting = false; }
      on(q, "focus", settlePlaceholder);
      on(q, "blur", function () { timer = setTimeout(cycle, 1500); });
      motion.handlers.push(function () { if (motion.still()) settlePlaceholder(); else cycle(); });
      signal.addEventListener("abort", function () { clearTimeout(timer); });

      function say(text, link) {
        status.textContent = text;
        if (link) { status.appendChild(document.createTextNode(" ")); var a = document.createElement("a"); a.href = link.href; a.textContent = link.text; status.appendChild(a); }
      }
      function mailLink() {
        var question = asked() + (needsMark(asked()) ? "?" : "");
        return "mailto:" + form.getAttribute("data-mail") + "?subject=" + encodeURIComponent("A question for Pentaliminal") + "&body=" + encodeURIComponent(question);
      }
      function showDone(question, from, to) {
        document.getElementById("askEcho").textContent = question;
        document.getElementById("askFrom").textContent = from;
        document.getElementById("askTo").textContent = to;
        form.hidden = true; done.hidden = false;
        done.classList.remove("in"); void done.offsetWidth; done.classList.add("in");
        done.focus({ preventScroll: true });
        var r = done.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) done.scrollIntoView({ block: "center", behavior: motion.reduced ? "auto" : "smooth" });
      }

      on(form, "submit", function (e) {
        e.preventDefault();
        var text = asked();
        if (!text) { say("Start with the question."); q.focus(); return; }
        if (!email.value.trim() || !email.checkValidity()) { say("That email doesn’t look right yet."); email.focus(); return; }
        var question = text + (needsMark(text) ? "?" : "");
        var role = form.querySelector('input[name="asking_as"]:checked');
        var name = form.elements.name.value.trim();
        var from = name || (role ? role.parentNode.textContent.trim() : "Someone curious");
        if (form.elements._honey.value) { showDone(question, from, email.value.trim()); return; } // a bot filled the hidden field
        form.classList.add("sending"); sendLabel.textContent = "Sending…"; say("");
        var payload = { question: question, asking_as: role ? role.value : "", name: name, email: email.value.trim(),
          _subject: "New question from pentaliminal.ai", _template: "table", _replyto: email.value.trim() };
        fetch(form.getAttribute("data-endpoint"), {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload),
          signal: window.AbortSignal && AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined
        }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || String(j.success) !== "true") throw new Error(j.message || r.status); }); })
          .then(function () { if (alive()) showDone(question, from, email.value.trim()); })
          .catch(function () {
            if (!alive()) return;
            if (form.getAttribute("data-mail")) say("That didn’t go through on our end.", { href: mailLink(), text: "Send it by email instead" });
            else say("That didn’t go through on our end. Your question is still here; please try again in a moment.");
          })
          .then(function () { form.classList.remove("sending"); sendLabel.textContent = "Send the question"; });
      });

      on(document.getElementById("askAgain"), "click", function () {
        form.reset(); form.hidden = false; done.hidden = true; say(""); update(); q.focus();
      });
      form.noValidate = true; // our own messages replace the browser bubbles; without this script the browser checks still apply
      form.hidden = false; done.hidden = true;
      update(); cycle();
    });

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
    });
  }

  // In the claude.ai preview, updates are swapped into the open page; its hot hook runs boot() again on the new DOM.
  var hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(boot);
  else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
