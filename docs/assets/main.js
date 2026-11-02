function pentaliminalBoot() {
  "use strict";
  // Each boot gets a generation number. Loops and window listeners from an older boot stop themselves,
  // so the viewer can swap in a new version of the page without leaving stale animations running.
  var GEN = window.__plGen = (window.__plGen || 0) + 1;
  function alive() { return GEN === window.__plGen; }
  // clear anything a previous boot drew into the page, so drawing starts from a clean slate
  ["#construct svg", "#meetFig", "#lensFig", "#lensList", "#artOrientation", "#artCognitive", "#artAgency"].forEach(function (q) { var n = document.querySelector(q); if (n) n.innerHTML = ""; });
  document.querySelectorAll(".glyph, .tw-cv, .tw-base").forEach(function (n) { if (n.classList.contains("glyph")) n.innerHTML = ""; else n.remove(); });
  document.querySelectorAll(".rv").forEach(function (n) { n.classList.remove("rv", "pre"); n.style.removeProperty("--d"); });
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var C = {};
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ["paper", "ink", "ink-2", "ink-3", "rule", "grid"].forEach(function (k) { C[k] = cs.getPropertyValue("--" + k).trim(); });
    C.sans = cs.getPropertyValue("--sans");
  }
  readColors();
  var onTheme = [];
  function themeChanged() { if (!alive()) return; readColors(); onTheme.forEach(function (f) { f(); }); }
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", themeChanged);
  new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function el(parent, tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    parent.appendChild(e); return e;
  }
  function pts(a) { return a.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); }

  // An isometric triangle grid: vertical lines plus lines at +30° and -30°.
  function isoGrid(g, x0, y0, w, h, s, dash) {
    var dx = s * Math.cos(Math.PI / 6), t = Math.tan(Math.PI / 6), a = { "class": "gl" };
    if (dash) a["stroke-dasharray"] = dash;
    for (var x = x0 - ((x0 % dx) + dx) % dx; x <= x0 + w; x += dx) el(g, "line", Object.assign({ x1: x, y1: y0, x2: x, y2: y0 + h }, a));
    var cMin = y0 - (x0 + w) * t - s, cMax = y0 + h + (x0 + w) * t + s;
    for (var c = Math.floor(cMin / s) * s; c <= cMax; c += s) {
      el(g, "line", Object.assign({ x1: x0, y1: c + x0 * t, x2: x0 + w, y2: c + (x0 + w) * t }, a));
      el(g, "line", Object.assign({ x1: x0, y1: c - x0 * t, x2: x0 + w, y2: c - (x0 + w) * t }, a));
    }
  }

  // ---------- a regular tetrahedron with a vertical axis ----------
  // vertex 0 is the apex (Pentaliminal); 1, 2, 3 are the base corners (the three fields)
  var TV = (function () {
    var Rb = 0.5774, yb = -0.2041, v = [[0, 0.6124, 0]];
    for (var k = 0; k < 3; k++) { var a = Math.PI / 2 + k * 2 * Math.PI / 3; v.push([Rb * Math.cos(a), yb, Rb * Math.sin(a)]); }
    return v;
  })();
  var TF = [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]];
  var TE = [[0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1]];
  var TN = TF.map(function (f) {
    var a = TV[f[0]], b = TV[f[1]], c = TV[f[2]];
    var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    var n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    var m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) n = [-n[0], -n[1], -n[2]];
    var l = Math.hypot(n[0], n[1], n[2]); return [n[0] / l, n[1] / l, n[2] / l];
  });
  var LIGHT = (function () { var l = [-0.45, 0.7, 0.55], m = Math.hypot(l[0], l[1], l[2]); return [l[0] / m, l[1] / m, l[2] / m]; })();
  // turn about the vertical axis by th, then tip the top toward the viewer by ph
  function tform(p, th, ph) {
    var x = p[0] * Math.cos(th) + p[2] * Math.sin(th), z = -p[0] * Math.sin(th) + p[2] * Math.cos(th), y = p[1];
    return [x, y * Math.cos(ph) - z * Math.sin(ph), y * Math.sin(ph) + z * Math.cos(ph)];
  }
  // project and sort out what is visible
  function tetraState(th, ph, S, cx, cy) {
    var pv = TV.map(function (p) { var q = tform(p, th, ph); return [cx + q[0] * S, cy - q[1] * S, q[2]]; });
    var front = TN.map(function (n) { return tform(n, th, ph)[2] > 0; });
    var shade = TN.map(function (n) { var q = tform(n, th, ph); return Math.max(0, q[0] * LIGHT[0] + q[1] * LIGHT[1] + q[2] * LIGHT[2]); });
    var edgeVis = TE.map(function (e) {
      return TF.some(function (f, i) { return front[i] && f.indexOf(e[0]) >= 0 && f.indexOf(e[1]) >= 0; });
    });
    var vertVis = TV.map(function (v, i) { return TF.some(function (f, k) { return front[k] && f.indexOf(i) >= 0; }); });
    return { pv: pv, front: front, shade: shade, edgeVis: edgeVis, vertVis: vertVis };
  }

  // ---------- hero: the dodecahedron (twelve pentagons) turning inside the construction drawing ----------
  (function heroDodeca() {
    var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI;
    var V = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { [-1, 1].forEach(function (c) { V.push([a, b, c]); }); }); });
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { V.push([0, a * IP, b * PHI]); V.push([a * IP, b * PHI, 0]); V.push([a * PHI, 0, b * IP]); }); });
    function norm(v) { var l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    // twelve faces: each normal points at a vertex of the dual icosahedron
    var F = [];
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) {
      [[a, 0, b * PHI], [0, a * PHI, b], [a * PHI, b, 0]].forEach(function (n0) {
        var n = norm(n0);
        var idx = V.map(function (v, i) { return [dot(v, n), i]; }).sort(function (p, q) { return q[0] - p[0]; }).slice(0, 5).map(function (p) { return p[1]; });
        var c = [0, 0, 0]; idx.forEach(function (i) { c[0] += V[i][0] / 5; c[1] += V[i][1] / 5; c[2] += V[i][2] / 5; });
        var u = norm(sub(V[idx[0]], c)), w2 = cross(n, u);
        idx.sort(function (p, q) { var dp = sub(V[p], c), dq = sub(V[q], c); return Math.atan2(dot(dp, w2), dot(dp, u)) - Math.atan2(dot(dq, w2), dot(dq, u)); });
        F.push({ n: n, v: idx });
      });
    }); });
    var E = [];
    for (var i = 0; i < V.length; i++) for (var j = i + 1; j < V.length; j++) {
      if (Math.abs(Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]) - 2 * IP) < 0.01) {
        E.push({ a: i, b: j, f: F.map(function (f, k) { return f.v.indexOf(i) >= 0 && f.v.indexOf(j) >= 0 ? k : -1; }).filter(function (k) { return k >= 0; }) });
      }
    }

    var svg = document.querySelector("#construct svg");
    var CX = 400, CY = 440, S = 168, PH = 0.42, RC = Math.sqrt(3) * S;
    var defs = el(svg, "defs", {});
    var hx = [];
    for (var h = 0; h < 6; h++) { var a = -Math.PI / 2 + h * Math.PI / 3; hx.push([CX + 395 * Math.cos(a), CY - 15 + 395 * Math.sin(a)]); }
    el(el(defs, "clipPath", { id: "hexclip" }), "polygon", { points: pts(hx) });
    var rg = el(defs, "radialGradient", { id: "fade" });
    el(rg, "stop", { offset: "0.55", "stop-color": "#fff" });
    el(rg, "stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "0" });
    el(el(defs, "mask", { id: "gridmask" }), "rect", { x: 0, y: 0, width: 800, height: 840, fill: "url(#fade)" });
    var gridg = el(svg, "g", { "class": "gridg", "clip-path": "url(#hexclip)", mask: "url(#gridmask)" });
    isoGrid(gridg, 0, 0, 800, 840, 34, "2 3");

    // orbiting construction rings
    var o1 = el(svg, "g", { "class": "orbits" });
    el(o1, "circle", { "class": "orb dash", cx: CX, cy: CY, r: 370 });
    for (var q = 0; q < 24; q++) {
      var qa = q * Math.PI / 12, r1 = q % 6 === 0 ? 352 : 362;
      el(o1, "line", { "class": "orb", x1: CX + r1 * Math.cos(qa), y1: CY + r1 * Math.sin(qa), x2: CX + 370 * Math.cos(qa), y2: CY + 370 * Math.sin(qa) });
    }
    var o2 = el(svg, "g", { "class": "orbits2" });
    el(o2, "polygon", { "class": "orb dash", points: pts([[CX, CY - 340], [CX + 340, CY], [CX, CY + 340], [CX - 340, CY]]) });

    // what stays true while it turns: the vertical axis, the sphere it fits in, and that sphere's radius
    var dims = el(svg, "g", { "class": "dims" });
    el(dims, "circle", { "class": "dim", cx: CX, cy: CY, r: RC, "stroke-dasharray": "4 6" });
    el(dims, "line", { "class": "dim", x1: CX, y1: CY - RC - 30, x2: CX, y2: CY + RC + 30, "stroke-dasharray": "6 5" });
    var ra = -Math.PI / 5, rx = CX + RC * Math.cos(ra), ry = CY + RC * Math.sin(ra);
    el(dims, "line", { "class": "dim", x1: CX, y1: CY, x2: rx, y2: ry });
    el(dims, "circle", { "class": "dim", cx: rx, cy: ry, r: 4 });
    el(dims, "text", { "class": "dim-t", x: CX + RC * 0.55 * Math.cos(ra) + 10, y: CY + RC * 0.55 * Math.sin(ra) - 10, "font-size": 20, "font-style": "italic" }, "R");
    [[CX, CY - RC - 52], [CX, CY + RC + 52]].forEach(function (p) {
      el(dims, "line", { "class": "xh", x1: p[0] - 22, y1: p[1], x2: p[0] + 22, y2: p[1] });
      el(dims, "line", { "class": "xh", x1: p[0], y1: p[1] - 22, x2: p[0], y2: p[1] + 22 });
    });

    // the solid: hidden edges dashed, faces turned from the light in halftone, visible edges and corners in ink
    var body = el(svg, "g", { "class": "markg" });
    var hidden = E.map(function () { return el(body, "line", { "class": "tt-h" }); });
    var faces = F.map(function () { return el(body, "polygon", { "class": "tt-face" }); });
    var edges = E.map(function () { return el(body, "line", { "class": "tt-e" }); });
    var nodes = V.map(function () { return el(body, "circle", { "class": "tt-n", r: 4.5 }); });

    function tf(p, th) {
      var x = p[0] * Math.cos(th) + p[2] * Math.sin(th), z = -p[0] * Math.sin(th) + p[2] * Math.cos(th), y = p[1];
      return [x, y * Math.cos(PH) - z * Math.sin(PH), y * Math.sin(PH) + z * Math.cos(PH)];
    }
    var th = 0.6, nudge = 0, nudgeT = 0, last = 0, visible = true;
    function draw() {
      var t = th + nudge;
      var pv = V.map(function (p) { var r = tf(p, t); return [CX + r[0] * S, CY - r[1] * S]; });
      var front = F.map(function (f) { return tf(f.n, t)[2] > 0; });
      var vis = V.map(function () { return false; });
      F.forEach(function (f, k) {
        if (!front[k]) { faces[k].style.display = "none"; return; }
        f.v.forEach(function (i) { vis[i] = true; });
        var n = tf(f.n, t), lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
        faces[k].style.display = "";
        faces[k].setAttribute("points", pts(f.v.map(function (i) { return pv[i]; })));
        faces[k].style.opacity = Math.max(0, (0.85 - lam) * 0.85).toFixed(2);
      });
      E.forEach(function (e, k) {
        var on = e.f.some(function (fi) { return front[fi]; }), ln = on ? edges[k] : hidden[k], off = on ? hidden[k] : edges[k];
        var a = pv[e.a], b = pv[e.b];
        ln.setAttribute("x1", a[0].toFixed(1)); ln.setAttribute("y1", a[1].toFixed(1)); ln.setAttribute("x2", b[0].toFixed(1)); ln.setAttribute("y2", b[1].toFixed(1));
        ln.style.display = ""; off.style.display = "none";
      });
      nodes.forEach(function (n, i) {
        n.setAttribute("cx", pv[i][0].toFixed(1)); n.setAttribute("cy", pv[i][1].toFixed(1));
        n.style.display = vis[i] ? "" : "none";
      });
    }
    var running = false;
    function loop(ts) {
      if (!visible || !alive()) { running = false; last = 0; return; }
      var dt = last ? Math.min(ts - last, 50) : 16; last = ts;
      if (!reduce) th += dt * 0.00012;
      nudge += (nudgeT - nudge) * 0.06;
      draw();
      requestAnimationFrame(loop);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
    var fig = document.getElementById("construct");
    // a drafting crosshair that follows the pointer across the figure
    var cur = el(svg, "g", { "class": "cursor", "aria-hidden": "true" });
    var curH = el(cur, "line", { x1: 0, y1: 0, x2: 800, y2: 0 }), curV = el(cur, "line", { x1: 0, y1: 0, x2: 0, y2: 840 }), curC = el(cur, "circle", { cx: 0, cy: 0, r: 9 });
    var pend = null;
    fig.addEventListener("pointermove", function (e) {
      var r = fig.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      nudgeT = x * 1.4;
      if (e.pointerType !== "mouse") return;
      if (!reduce) gridg.style.transform = "translate(" + (-x * 10).toFixed(1) + "px," + (-y * 10).toFixed(1) + "px)";
      var sx = (x + 0.5) * 800, sy = (y + 0.5) * 840;
      if (!pend) pend = requestAnimationFrame(function () {
        pend = null;
        curH.setAttribute("transform", "translate(0," + sy.toFixed(1) + ")");
        curV.setAttribute("transform", "translate(" + sx.toFixed(1) + ",0)");
        curC.setAttribute("transform", "translate(" + sx.toFixed(1) + "," + sy.toFixed(1) + ")");
      });
    });
    fig.addEventListener("pointerleave", function () { nudgeT = 0; gridg.style.transform = ""; });
    gridg.style.transition = "transform .6s cubic-bezier(.2,.7,.2,1)";
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(fig);
    draw();
    start();
  })();

  // ---------- 01 intersection: a tetrahedron, still and labeled ----------
  (function meetFig() {
    var svg = document.getElementById("meetFig");
    var st = tetraState(-0.52, 0.42, 250, 220, 238);
    var ax = el(svg, "line", { "class": "mt-ax", x1: 220, y1: st.pv[0][1] - 40, x2: 220, y2: 238 + 0.2041 * Math.cos(0.42) * 250 });
    TE.forEach(function (e, i) { if (!st.edgeVis[i]) el(svg, "line", { "class": "mt-h", x1: st.pv[e[0]][0], y1: st.pv[e[0]][1], x2: st.pv[e[1]][0], y2: st.pv[e[1]][1] }); });
    TF.forEach(function (f, i) { if (st.front[i] && st.shade[i] < 0.6) el(svg, "polygon", { "class": "mt-f", points: pts(f.map(function (k) { return st.pv[k]; })) }); });
    var edges = {};
    TE.forEach(function (e, i) {
      if (!st.edgeVis[i]) return;
      edges[e.join("-")] = el(svg, "line", { "class": "mt-e", x1: st.pv[e[0]][0], y1: st.pv[e[0]][1], x2: st.pv[e[1]][0], y2: st.pv[e[1]][1] });
    });
    var nodes = st.pv.map(function (p, i) { return el(svg, "circle", { "class": "mt-n" + (i === 0 ? " apex" : ""), cx: p[0], cy: p[1], r: i === 0 ? 7 : 5.5 }); });
    // labels: circled numbers at the base corners, the name at the apex
    var marks = [null];
    for (var v = 1; v <= 3; v++) {
      var p = st.pv[v], dx = p[0] - 220, dy = p[1] - 238, l = Math.hypot(dx, dy) || 1;
      var lx = p[0] + dx / l * 34, ly = p[1] + dy / l * 26 + 6;
      var c = el(svg, "circle", { "class": "mt-c", cx: lx, cy: ly, r: 14 });
      var tx = el(svg, "text", { "class": "mt-t", x: lx, y: ly + 0.5, "text-anchor": "middle", "dominant-baseline": "middle" }, "0" + v);
      marks.push([c, tx]);
    }
    el(svg, "text", { "class": "mt-t", x: st.pv[0][0], y: st.pv[0][1] - 22, "text-anchor": "middle" }, "PENTALIMINAL");

    function set(v) {
      Object.keys(edges).forEach(function (k) { edges[k].classList.remove("on"); });
      nodes.forEach(function (n, i) { if (i) n.classList.toggle("on", i === v); });
      marks.forEach(function (m, i) { if (!m) return; m[0].classList.toggle("on", i === v || v === 0); m[1].classList.toggle("inv", i === v || v === 0); });
      if (v === null) return;
      [1, 2, 3].forEach(function (b) {
        if (v !== 0 && b !== v) return;
        var k = edges["0-" + b]; if (k) k.classList.add("on");
      });
    }
    document.querySelectorAll("#meetList li[data-v]").forEach(function (li) {
      var v = +li.getAttribute("data-v");
      function on() { document.querySelectorAll("#meetList li[data-v]").forEach(function (o) { o.classList.toggle("on", o === li); }); set(v); }
      function off() { li.classList.remove("on"); set(null); }
      li.addEventListener("mouseenter", on); li.addEventListener("focus", on);
      li.addEventListener("mouseleave", off); li.addEventListener("blur", off);
    });
  })();

  // ---------- the page mesh: a loose triangular lattice that drifts behind everything ----------
  (function bgMesh() {
    var cv = document.getElementById("bgmesh"), ctx = cv.getContext("2d");
    var w = 0, h = 0, s = 112, rowH = s * 0.866, cols = 0, rows = 0, P = [], scroll = 0, mx = 0.5, my = 0.5, visible = true;
    function rgb(hex) { hex = hex.replace("#", ""); if (hex.length === 3) hex = hex.replace(/./g, "$&$&"); var n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    function resize() {
      var d = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      cols = Math.ceil(w / s) + 3; rows = Math.ceil(h / rowH) + 6; P = [];
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) P.push({ x: (i - 1) * s + (j % 2 ? s / 2 : 0), y: (j - 3) * rowH, ph: Math.sin(i * 7.13 + j * 2.97) * 6.28, node: (i * 3 + j * 7) % 11 === 0 });
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      var c = rgb(C.ink || "#141414"), dark = (c[0] + c[1] + c[2]) > 380;
      var base = dark ? 0.028 : 0.024, boost = dark ? 0.04 : 0.035;
      var shift = (scroll * 0.05) % (2 * rowH), dx = (mx - 0.5) * 14, dy = (my - 0.5) * 14, fx = w * 0.7, fy = h * 0.36, R = Math.max(w, h);
      var Q = P.map(function (p) {
        var wave = reduce ? 0 : Math.sin(t * 0.00026 + p.ph) * 7;
        var bend = Math.sin(p.x / w * 3.2 + p.y / h * 2.7 + scroll * 0.0004) * 16;
        var x = p.x + wave + bend + dx * (p.y / h), y = p.y + wave * 0.4 + shift + dy * (p.x / w);
        return { x: x, y: y, n: Math.max(0, 1 - Math.hypot(x - fx, y - fy) / R), node: p.node };
      });
      var buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      function seg(a, b) { var k = Math.min(3, Math.floor(((a.n + b.n) / 2) * 4)); buckets[k].moveTo(a.x, a.y); buckets[k].lineTo(b.x, b.y); }
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var a = Q[j * cols + i];
        if (i + 1 < cols) seg(a, Q[j * cols + i + 1]);
        if (j + 1 < rows) {
          if (j % 2 === 0) { if (i > 0) seg(a, Q[(j + 1) * cols + i - 1]); seg(a, Q[(j + 1) * cols + i]); }
          else { seg(a, Q[(j + 1) * cols + i]); if (i + 1 < cols) seg(a, Q[(j + 1) * cols + i + 1]); }
        }
      }
      ctx.lineWidth = 0.7;
      buckets.forEach(function (p, k) { ctx.strokeStyle = "rgba(" + c.join(",") + "," + (base + boost * k / 3).toFixed(3) + ")"; ctx.stroke(p); });
      Q.forEach(function (q) {
        if (!q.node) return;
        ctx.fillStyle = "rgba(" + c.join(",") + "," + (0.06 + q.n * 0.14).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(q.x, q.y, 1.7, 0, 6.2832); ctx.fill();
      });
    }
    var lastDraw = 0, running = false;
    function loop(t) {
      if (!visible || !alive()) { running = false; return; }
      if (t - lastDraw > 32) { lastDraw = t; draw(t); }
      requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce) { running = true; requestAnimationFrame(loop); } }
    window.addEventListener("resize", function () { if (!alive()) return; resize(); if (reduce) draw(0); }, { passive: true });
    window.addEventListener("scroll", function () { if (!alive()) return; scroll = window.scrollY; if (reduce) draw(0); }, { passive: true });
    window.addEventListener("pointermove", function (e) { mx = e.clientX / w; my = e.clientY / h; }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (!alive()) return; visible = !document.hidden; if (visible) start(); });
    onTheme.push(function () { draw(performance.now()); });
    resize(); scroll = window.scrollY; draw(0);
    start();
  })();

  // ---------- 02 lenses: a plan drawing; the chosen lens hatches the area it covers ----------
  var lenses = [
    { name: "Cognitive science & neuroscience", q: "How does intelligence work?", d: "Perception, attention, memory, learning, reasoning, metacognition, consciousness, and decision-making." },
    { name: "Psychology & behavioral science", q: "What moves human beings?", d: "Motivation, emotion, development, behavior, social cognition, relationships, and well-being." },
    { name: "Anthropology & sociology", q: "How do humans live together?", d: "Culture, institutions, social structures, power, ritual, collective behavior, and diverse ways of life." },
    { name: "Philosophy & ethics", q: "What is true, valuable, and worth doing?", d: "Epistemology, practical wisdom, virtue, ethics, meaning, and competing accounts of the good." },
    { name: "History & systems thinking", q: "How do societies and systems evolve?", d: "Historical patterns, complexity, feedback, political economy, technological change, and long-term consequences." }
  ];
  (function lensFig() {
    var svg = document.getElementById("lensFig");
    var cx = 200, cy = 222, R = 150, V = [];
    for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 5; V.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    var defs = el(svg, "defs", {});
    el(el(defs, "clipPath", { id: "lfPent" }), "polygon", { points: pts(V) });
    // the covered wedge, drawn for the top corner and rotated to the chosen one
    var half = 24 * Math.PI / 180, L = R * 2.2, top = V[0];
    var wedge = [top, [top[0] - Math.sin(half) * L, top[1] + Math.cos(half) * L], [top[0] + Math.sin(half) * L, top[1] + Math.cos(half) * L]];
    el(el(defs, "clipPath", { id: "lfWedge" }), "polygon", { points: pts(wedge) });

    el(svg, "circle", { "class": "lf-circ", cx: cx, cy: cy, r: R });
    var clipped = el(svg, "g", { "clip-path": "url(#lfPent)" });
    var rot = el(clipped, "g", { "class": "lf-rot" });
    var hatch = el(rot, "g", { "class": "lf-hatch", "clip-path": "url(#lfWedge)" });
    for (var k = -460; k < 460; k += 8) el(hatch, "line", { x1: k, y1: 0, x2: k + 440, y2: 440 });
    el(rot, "line", { "class": "lf-ray", x1: top[0], y1: top[1], x2: wedge[1][0], y2: wedge[1][1] });
    el(rot, "line", { "class": "lf-ray", x1: top[0], y1: top[1], x2: wedge[2][0], y2: wedge[2][1] });
    el(svg, "polygon", { "class": "lf-out", points: pts(V) });
    el(svg, "line", { "class": "lf-ctr", x1: cx - 7, y1: cy, x2: cx + 7, y2: cy });
    el(svg, "line", { "class": "lf-ctr", x1: cx, y1: cy - 7, x2: cx, y2: cy + 7 });
    var arc = el(svg, "path", { "class": "lf-arc" });
    var ang = el(svg, "text", { "class": "lf-ang", "text-anchor": "middle", "dominant-baseline": "middle" }, "108°");
    var nodes = [], nums = [];
    V.forEach(function (p, i) {
      var ox = p[0] - cx, oy = p[1] - cy, l = Math.hypot(ox, oy);
      nums.push(el(svg, "text", { "class": "lf-num", x: (p[0] + ox / l * 24).toFixed(1), y: (p[1] + oy / l * 24).toFixed(1), "text-anchor": "middle", "dominant-baseline": "middle" }, "0" + (i + 1)));
      nodes.push(el(svg, "circle", { "class": "lf-node", cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 5.5 }));
    });

    var turn = 0;
    function point(i) {
      var target = i * 72, d = ((target - turn) % 360 + 540) % 360 - 180;
      turn += d;
      rot.style.transform = "rotate(" + turn + "deg)";
      nodes.forEach(function (n, j) { n.classList.toggle("on", j === i); });
      nums.forEach(function (n, j) { n.classList.toggle("on", j === i); });
      // interior angle at the chosen corner
      var p = V[i], a = V[(i + 4) % 5], b = V[(i + 1) % 5], r = 30;
      function towards(q) { var dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [p[0] + dx / l * r, p[1] + dy / l * r]; }
      var s = towards(a), e = towards(b);
      arc.setAttribute("d", "M" + s[0].toFixed(1) + "," + s[1].toFixed(1) + " A" + r + "," + r + " 0 0 0 " + e[0].toFixed(1) + "," + e[1].toFixed(1));
      var mx = cx - p[0], my = cy - p[1], ml = Math.hypot(mx, my);
      ang.setAttribute("x", (p[0] + mx / ml * 50).toFixed(1)); ang.setAttribute("y", (p[1] + my / ml * 50).toFixed(1));
    }

    var list = document.getElementById("lensList"), rows = [];
    function set(i) {
      rows.forEach(function (r, j) { r.classList.toggle("on", j === i); r.setAttribute("aria-pressed", String(j === i)); });
      point(i);
    }
    lenses.forEach(function (l, i) {
      var li = document.createElement("li");
      li.tabIndex = 0; li.setAttribute("role", "button");
      li.innerHTML = '<span class="n cap">0' + (i + 1) + '</span><div><h3></h3><p class="q"></p><p class="d"></p></div>';
      li.querySelector("h3").textContent = l.name;
      li.querySelector(".q").textContent = l.q;
      li.querySelector(".d").textContent = l.d;
      list.appendChild(li); rows.push(li);
      function on() { set(i); }
      li.addEventListener("mouseenter", on); li.addEventListener("focus", on); li.addEventListener("click", on);
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); on(); } });
    });
    set(0);
  })();

  // ---------- isometric projection ----------
  function P(x, y, z, S, ox, oy) { return [ox + (x - y) * 0.866 * S, oy + (x + y) * 0.5 * S - z * S]; }

  // ---------- 03 framework: a different drawing for each step ----------
  (function glyphs() {
    function face(g, poly, shade) {
      el(g, "polygon", { "class": "ln-f", points: pts(poly) });
      if (shade) el(g, "polygon", { "class": "hs-s", points: pts(poly) });
    }
    // a box from (x0,y0,z0) to (x1,y1,z1), drawn as its three visible faces
    function box(g, b, S, ox, oy, opts) {
      opts = opts || {};
      var x0 = b[0], y0 = b[1], z0 = b[2], x1 = b[3], y1 = b[4], z1 = b[5];
      var top = [P(x0, y0, z1, S, ox, oy), P(x1, y0, z1, S, ox, oy), P(x1, y1, z1, S, ox, oy), P(x0, y1, z1, S, ox, oy)];
      var right = [P(x1, y0, z0, S, ox, oy), P(x1, y1, z0, S, ox, oy), P(x1, y1, z1, S, ox, oy), P(x1, y0, z1, S, ox, oy)];
      var front = [P(x0, y1, z0, S, ox, oy), P(x1, y1, z0, S, ox, oy), P(x1, y1, z1, S, ox, oy), P(x0, y1, z1, S, ox, oy)];
      if (opts.dashed) { [top, right, front].forEach(function (f) { el(g, "polygon", { "class": "hid", points: pts(f) }); }); return; }
      face(g, front, false); face(g, right, true); face(g, top, opts.shadeTop);
    }
    var B = {
      // Knowing: what is known (solid) and what is only assumed (dashed). Hover pulls the assumption apart from the evidence.
      1: function (svg) {
        var S = 26, ox = 60, oy = 104;
        box(svg, [0, 0, 0, 1, 1, 1], S, ox, oy);
        var g = el(svg, "g", { "class": "mv g1-assume" });
        box(g, [0, 0, 1, 1, 1, 2], S, ox, oy, { dashed: true });
        var q = P(0.5, 0.5, 2, S, ox, oy);
        el(g, "text", { "class": "gtxt", x: q[0] + 26, y: q[1] - 2 }, "?");
      },
      // Seeing: one object, three points of view. Hover makes the sight lines solid.
      2: function (svg) {
        var S = 24, ox = 72, oy = 84;
        var eyes = [[18, 24], [132, 34], [16, 112]], targets = [P(0, 0, 1, S, ox, oy), P(1, 0.5, 0.5, S, ox, oy), P(0.5, 1, 0.5, S, ox, oy)];
        targets = [P(0.5, 0.5, 1, S, ox, oy), P(1, 0.5, 0.5, S, ox, oy), P(0.5, 1, 0.5, S, ox, oy)];
        eyes.forEach(function (e, i) { el(svg, "line", { "class": "g2-sight", x1: e[0], y1: e[1], x2: targets[i][0], y2: targets[i][1] }); });
        box(svg, [0, 0, 0, 1, 1, 1], S, ox, oy);
        eyes.forEach(function (e) { el(svg, "circle", { "class": "g2-eye", cx: e[0], cy: e[1], r: 4 }); });
      },
      // Situating: the object on its ground, among its neighbors. Hover reveals the ground grid.
      3: function (svg) {
        var S = 19, ox = 72, oy = 70, G = 1.9;
        var ground = [P(-G, -G, 0, S, ox, oy), P(G, -G, 0, S, ox, oy), P(G, G, 0, S, ox, oy), P(-G, G, 0, S, ox, oy)];
        el(svg, "polygon", { "class": "ln-f", points: pts(ground) });
        var grid = el(svg, "g", { "class": "show" });
        for (var k = -G + 0.95; k < G - 0.1; k += 0.95) {
          var a = P(k, -G, 0, S, ox, oy), b = P(k, G, 0, S, ox, oy), c = P(-G, k, 0, S, ox, oy), d = P(G, k, 0, S, ox, oy);
          el(grid, "line", { "class": "hid", x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
          el(grid, "line", { "class": "hid", x1: c[0], y1: c[1], x2: d[0], y2: d[1] });
        }
        box(svg, [-1.6, -1.6, 0, -0.9, -0.9, 0.5], S, ox, oy);
        box(svg, [0.9, -1.5, 0, 1.6, -0.8, 0.35], S, ox, oy);
        box(svg, [-0.45, -0.45, 0, 0.45, 0.45, 1.5], S, ox, oy);
        box(svg, [-1.5, 0.9, 0, -0.8, 1.6, 0.3], S, ox, oy);
      },
      // Valuing: two unequal weights on one beam. Hover tips the balance.
      4: function (svg) {
        var S = 20, ox = 74, oy = 92;
        var apex = P(0, 0, 1.1, S, ox, oy);
        var fl = P(-0.45, 0.35, 0, S, ox, oy), fr = P(0.45, 0.35, 0, S, ox, oy), bl = P(0.45, -0.35, 0, S, ox, oy);
        el(svg, "polygon", { "class": "ln-f", points: pts([fl, fr, apex]) });
        el(svg, "polygon", { "class": "ln-f", points: pts([fr, bl, apex]) });
        el(svg, "polygon", { "class": "hs-s", points: pts([fr, bl, apex]) });
        var g = el(svg, "g", { "class": "mv g4-beam" });
        g.setAttribute("data-ox", apex[0].toFixed(1)); g.setAttribute("data-oy", apex[1].toFixed(1));
        box(g, [-2.1, -0.25, 1.1, 2.1, 0.25, 1.28], S, ox, oy);
        box(g, [-1.95, -0.45, 1.28, -1.05, 0.45, 2.18], S, ox, oy);
        box(g, [1.35, -0.25, 1.28, 1.85, 0.25, 1.78], S, ox, oy);
      },
      // Acting: a measured move from where things were to where they go. Hover carries it through.
      5: function (svg) {
        var S = 22, ox = 40, oy = 82;
        box(svg, [0, 0, 0, 1, 1, 1], S, ox, oy, { dashed: true });
        var a = P(1.15, 0.5, 0.02, S, ox, oy), b = P(2.9, 0.5, 0.02, S, ox, oy);
        el(svg, "line", { "class": "ln", x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
        var dx = 0.866, dy = 0.5, nx = -dy, ny = dx;
        el(svg, "polygon", { "class": "ln-f", points: pts([[b[0] + dx * 7, b[1] + dy * 7], [b[0] + nx * 4, b[1] + ny * 4], [b[0] - nx * 4, b[1] - ny * 4]]) });
        var g = el(svg, "g", { "class": "mv g5-cube" });
        box(g, [1.3, 0, 0, 2.3, 1, 1], S, ox, oy, { shadeTop: false });
      }
    };
    document.querySelectorAll("#path .glyph").forEach(function (box) {
      var svg = el(box, "svg", { viewBox: "0 0 150 132", preserveAspectRatio: "xMinYMax meet", "aria-hidden": "true" });
      B[box.getAttribute("data-g")](svg);
      // fit each drawing to its frame so all five read at the same size
      try {
        var bb = svg.getBBox(), vx = bb.x - 8, vy = bb.y - 14;
        svg.setAttribute("viewBox", [vx, vy, bb.width + 16, bb.height + 18].map(function (n) { return n.toFixed(1); }).join(" "));
        // pivots are given in drawing units; the view box now starts at (vx, vy)
        svg.querySelectorAll("[data-ox]").forEach(function (n) { n.style.transformOrigin = (n.getAttribute("data-ox") - vx).toFixed(1) + "px " + (n.getAttribute("data-oy") - vy).toFixed(1) + "px"; });
      } catch (e) {}
    });

  })();

  // ---------- 05 infrastructure: isometric figures on an iso grid ----------
  (function planes() {
    function face(g, poly, shade) {
      el(g, "polygon", { "class": "ln-f", points: pts(poly) });
      if (shade) el(g, "polygon", { "class": "hs", points: pts(poly) });
    }
    function base(svg) { var g = el(svg, "g", {}); isoGrid(g, 0, 0, 300, 240, 26, "2 3"); return el(svg, "g", { "class": "fig" }); }

    // Orientation: a pentagonal pyramid pointing up. Hover raises it and shows the axis it aims along.
    (function () {
      var svg = document.getElementById("artOrientation"), g = base(svg), S = 42, ox = 150, oy = 178, H = 1.75;
      var b = [];
      for (var k = 0; k < 5; k++) { var a = Math.PI / 4 + k * 2 * Math.PI / 5; b.push([Math.cos(a) * 1.05, Math.sin(a) * 1.05]); }
      var apex = P(0, 0, H, S, ox, oy), foot = P(0, 0, 0, S, ox, oy);
      var aim = el(g, "g", { "class": "aim" });
      el(aim, "line", { "class": "dashed", x1: foot[0], y1: foot[1], x2: apex[0], y2: apex[1] - 34 });
      el(aim, "circle", { cx: apex[0], cy: apex[1] - 42, r: 7 });
      el(aim, "line", { x1: apex[0] - 13, y1: apex[1] - 42, x2: apex[0] + 13, y2: apex[1] - 42 });
      el(aim, "line", { x1: apex[0], y1: apex[1] - 55, x2: apex[0], y2: apex[1] - 29 });
      var pyr = el(g, "g", { "class": "pyr" });
      var faces = [];
      for (var i = 0; i < 5; i++) {
        var p = b[i], q = b[(i + 1) % 5];
        faces.push({ depth: (p[0] + p[1] + q[0] + q[1]) / 2, shade: (p[0] - p[1] + q[0] - q[1]) / 2 > 0, poly: [P(p[0], p[1], 0, S, ox, oy), P(q[0], q[1], 0, S, ox, oy), apex] });
      }
      faces.sort(function (x, y) { return x.depth - y.depth; }).forEach(function (f) { face(pyr, f.poly, f.shade); });
    })();

    // Cognitive: a wireframe cube holding a solid smaller cube
    (function () {
      var svg = document.getElementById("artCognitive"), g = base(svg), S = 36, ox = 150, oy = 168;
      function box(gr, c, h, solid) {
        var z0 = c - h, z1 = c + h;
        var top = [P(-h, -h, z1, S, ox, oy), P(h, -h, z1, S, ox, oy), P(h, h, z1, S, ox, oy), P(-h, h, z1, S, ox, oy)];
        var right = [P(h, -h, z0, S, ox, oy), P(h, h, z0, S, ox, oy), P(h, h, z1, S, ox, oy), P(h, -h, z1, S, ox, oy)];
        var left = [P(-h, h, z0, S, ox, oy), P(h, h, z0, S, ox, oy), P(h, h, z1, S, ox, oy), P(-h, h, z1, S, ox, oy)];
        if (solid) { face(gr, left, false); face(gr, right, true); face(gr, top, false); return; }
        // hidden edges dashed, visible edges solid
        var bb = P(-h, -h, z0, S, ox, oy);
        [P(h, -h, z0, S, ox, oy), P(-h, h, z0, S, ox, oy), P(-h, -h, z1, S, ox, oy)].forEach(function (q) { el(gr, "line", { "class": "hid", x1: bb[0], y1: bb[1], x2: q[0], y2: q[1] }); });
        [top, right, left].forEach(function (poly) { el(gr, "polygon", { "class": "ln", points: pts(poly) }); });
      }
      box(g, 1, 1, false);
      box(el(g, "g", { "class": "inner" }), 1, 0.42, true);
    })();

    // Agency: three stacked plates
    (function () {
      var svg = document.getElementById("artAgency"), g = base(svg), S = 36, ox = 150, oy = 160, a = 1.2, t = 0.26;
      [0, 0.72, 1.44].forEach(function (z, idx) {
        var pg = el(g, "g", { "class": "pl pl" + idx });
        face(pg, [P(-a, a, z, S, ox, oy), P(a, a, z, S, ox, oy), P(a, a, z + t, S, ox, oy), P(-a, a, z + t, S, ox, oy)], false);
        face(pg, [P(a, -a, z, S, ox, oy), P(a, a, z, S, ox, oy), P(a, a, z + t, S, ox, oy), P(a, -a, z + t, S, ox, oy)], true);
        face(pg, [[-a, -a], [a, -a], [a, a], [-a, a]].map(function (q) { return P(q[0], q[1], z + t, S, ox, oy); }), false);
      });
    })();
  })();

  // ---------- close: the monogram crossing a threshold (from V1) ----------
  // Above the bar the mark is drawn crisp. Below it, the ink is sampled into dots that drop out, drift and fade.
  (function dissolve() {
    var cv = document.getElementById("dissolve"); if (!cv) return;
    var ctx = cv.getContext("2d");
    var src = document.getElementById("mono");
    var pBody = new Path2D(src.querySelector(".m-body").getAttribute("d"));
    var pShade = new Path2D(src.querySelector(".m-shade").getAttribute("d"));
    var pInk = new Path2D(src.querySelector(".m-ink").getAttribute("d"));
    var VB = { x: 40, y: 36, w: 676, h: 968 };
    var DEF = 0.6, thr = DEF, target = DEF, w = 0, h = 0, sc = 1, ox = 0, oy = 0, top = 0, markH = 0, g = 2, parts = [], last = 0, visible = true, dragging = false;
    var rnd = (function () { var s = 11; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();

    function layout() {
      var d = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight; if (!w || !h) return;
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      sc = (w * 0.9) / VB.w; markH = VB.h * sc;
      ox = (w - VB.w * sc) / 2 - VB.x * sc; oy = h * 0.03 - VB.y * sc; top = oy + VB.y * sc;
      // sample the ink and the shaded faces into dots
      var off = document.createElement("canvas"); off.width = Math.ceil(w); off.height = Math.ceil(h);
      var o = off.getContext("2d", { willReadFrequently: true });
      function sample(path, rule, step, kind) {
        o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, off.width, off.height);
        o.setTransform(sc, 0, 0, sc, ox, oy); o.fillStyle = "#000"; o.fill(path, rule);
        var data = o.getImageData(0, 0, off.width, off.height).data;
        for (var y = step / 2; y < off.height; y += step) for (var x = step / 2; x < off.width; x += step) {
          if (data[(Math.floor(y) * off.width + Math.floor(x)) * 4 + 3] > 110) parts.push({ x: x, y: y, kind: kind, r1: rnd(), r2: rnd(), r3: rnd(), ph: rnd() * 6.28 });
        }
      }
      parts = []; rnd = (function () { var s = 11; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
      g = Math.max(1.6, w / 190);
      sample(pInk, "evenodd", g, 0);
      sample(pShade, "nonzero", g * 3, 1);
      draw(0);
    }
    function draw(t) {
      if (!w) return;
      var d = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
      var Y = top + thr * markH, span = Math.max(1, h - Y);
      var shadeOp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shade-op")) || 0.5;

      // crisp mark above the bar
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, Y); ctx.clip();
      ctx.translate(ox, oy); ctx.scale(sc, sc);
      ctx.fillStyle = C.paper; ctx.fill(pBody);
      var pc = document.createElement("canvas"); pc.width = pc.height = 7;
      var pcx = pc.getContext("2d"); pcx.fillStyle = C.ink; pcx.globalAlpha = shadeOp; pcx.beginPath(); pcx.arc(3.5, 3.5, 1.55, 0, 6.2832); pcx.fill();
      ctx.fillStyle = ctx.createPattern(pc, "repeat"); ctx.fill(pShade);
      ctx.fillStyle = C.ink; ctx.fill(pInk, "evenodd");
      ctx.restore();

      // dust below the bar
      var buckets = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], alphas = [1, 0.66, 0.4, 0.18];
      parts.forEach(function (p) {
        if (p.y < Y) return;
        var k = Math.min(1, (p.y - Y) / (span * 0.8));
        if (p.r1 < k * 0.8) return;
        var spread = k * k, jit = reduce ? 0 : Math.sin(t * 0.0011 + p.ph) * 1.6 * k;
        var x = p.x + (p.r2 - 0.5) * spread * w * 0.55 + jit, y = p.y + p.r3 * spread * h * 0.22;
        var s = (p.kind ? g * 0.9 : g * 0.92) * (1 - k * 0.45);
        var b = p.kind ? Math.min(3, 1 + Math.floor(k * 3)) : Math.min(3, Math.floor(k * 4));
        buckets[b].rect(x - s / 2, y - s / 2, s, s);
      });
      ctx.fillStyle = C.ink;
      buckets.forEach(function (pth, i) { ctx.globalAlpha = alphas[i]; ctx.fill(pth); });
      ctx.globalAlpha = 1;

      // the bar
      ctx.fillStyle = C.ink;
      ctx.fillRect(w * 0.04, Y - 0.5, w * 0.92, 1);
      ctx.fillRect(w * 0.04 - 3.5, Y - 3.5, 7, 7); ctx.fillRect(w * 0.96 - 3.5, Y - 3.5, 7, 7);
    }
    var running = false;
    function loop(t) {
      if (!visible || !alive()) { running = false; last = 0; return; }
      var dt = last ? t - last : 16; last = t;
      thr += (target - thr) * Math.min(1, dt * 0.012);
      draw(t);
      requestAnimationFrame(loop);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function setFromEvent(e) {
      var r = cv.getBoundingClientRect(), y = e.clientY - r.top;
      target = Math.max(0.08, Math.min(1, (y - top) / markH));
      cv.setAttribute("aria-valuenow", Math.round(target * 100));
    }
    cv.addEventListener("pointermove", function (e) { if (e.pointerType === "mouse" || dragging) setFromEvent(e); });
    cv.addEventListener("pointerdown", function (e) { dragging = true; cv.setPointerCapture(e.pointerId); setFromEvent(e); });
    cv.addEventListener("pointerup", function () { dragging = false; });
    cv.addEventListener("pointercancel", function () { dragging = false; });
    cv.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && !dragging) { target = DEF; cv.setAttribute("aria-valuenow", Math.round(DEF * 100)); } });
    cv.addEventListener("keydown", function (e) {
      var step = e.key === "ArrowUp" ? -0.05 : e.key === "ArrowDown" ? 0.05 : 0;
      if (!step) return; e.preventDefault();
      target = Math.max(0.08, Math.min(1, target + step)); cv.setAttribute("aria-valuenow", Math.round(target * 100));
      if (reduce) { thr = target; draw(0); }
    });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) start(); }).observe(cv);
    if ("ResizeObserver" in window) new ResizeObserver(layout).observe(cv);
    onTheme.push(function () { draw(performance.now()); });
    layout();
    start();
  })();

  // ---------- light and dark (paper and blueprint) ----------
  (function theme() {
    var btn = document.getElementById("themeBtn"), root = document.documentElement, KEY = "pentaliminal-theme";
    function current() {
      var t = root.getAttribute("data-theme");
      if (t) return t;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    function label() {
      var dark = current() === "dark";
      btn.querySelector("span").textContent = dark ? "Light" : "Dark";
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }
    try { var saved = localStorage.getItem(KEY); if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved); } catch (e) {}
    label();
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      function apply() { root.setAttribute("data-theme", next); try { localStorage.setItem(KEY, next); } catch (e) {} label(); }
      if (document.startViewTransition && !reduce) {
        var r = btn.getBoundingClientRect();
        root.style.setProperty("--vt-x", (r.left + r.width / 2).toFixed(0) + "px");
        root.style.setProperty("--vt-y", (r.top + r.height / 2).toFixed(0) + "px");
        try { var vt = document.startViewTransition(apply); if (vt && vt.ready) vt.ready.catch(function () {}); }
        catch (e) { apply(); }
      } else apply();
      // if anything prevented the change, apply it directly
      setTimeout(function () { if (root.getAttribute("data-theme") !== next) apply(); }, 700);
    });
    var mq2 = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq2.addEventListener) mq2.addEventListener("change", label);
  })();

  // ---------- menu for narrow windows ----------
  (function menu() {
    var btn = document.getElementById("menuBtn"), nav = document.getElementById("siteNav"); if (!btn || !nav) return;
    function set(open) { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); btn.querySelector("span").textContent = open ? "Close" : "Menu"; }
    btn.addEventListener("click", function () { set(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { set(false); btn.focus(); } });
  })();

  // ---------- header compacts once the page moves ----------
  (function header() {
    var top = document.querySelector(".top"), s = document.getElementById("topSentinel");
    if (!s || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (en) { top.classList.toggle("stuck", !en[0].isIntersecting); }).observe(s);
  })();

  // ---------- arrivals: content rises into place as it scrolls in, once ----------
  (function arrivals() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var sel = ".label, .head, .split, .define, .quote, .meet-fig, .meet-list, .charter > div, .lens-fig, .lenses li, .engineering, .path li, .shift, .sub, .criteria li, .atlas, .planes > li, .aside, .principles > div, .labs .body, .close-fig, .close h2, .close p, .tblock";
    var vh = window.innerHeight, items = Array.prototype.slice.call(document.querySelectorAll(sel));
    // read every position first, then write
    var tops = items.map(function (n) { return n.getBoundingClientRect().top; });
    var todo = [];
    items.forEach(function (n, i) {
      if (tops[i] < vh * 0.92) return;
      var idx = Array.prototype.indexOf.call(n.parentElement.children, n), d = 0;
      if (n.matches(".path li, .planes > li")) d = idx * 0.11;
      else if (n.matches(".principles > div")) d = (idx % 3) * 0.1;
      else if (n.matches(".head, .close h2")) d = 0.1;
      else if (n.matches(".close p")) d = 0.25;
      todo.push([n, d]);
    });
    todo.forEach(function (x) { x[0].classList.add("rv", "pre"); if (x[1]) x[0].style.setProperty("--d", x[1].toFixed(2) + "s"); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0 });
    todo.forEach(function (x) { io.observe(x[0]); });
  })();

  // ---------- "Toward wisdom.": crisp type with isometric depth, shaded in halftone ----------
  // The words themselves stay real, solid text. Behind them, a 30° extrusion (like the monogram's shaded faces)
  // is drawn as a dot screen: dots are largest where the side meets the letter and smaller as it recedes.
  (function towardWisdom() {
    var host = document.querySelector(".tagline .tl-b"); if (!host) return;
    var text = host.textContent.trim().toUpperCase();
    var cv = document.createElement("canvas"); cv.className = "tw-cv"; cv.setAttribute("aria-hidden", "true");
    var base = document.createElement("span"); base.className = "tw-base"; base.setAttribute("aria-hidden", "true");
    host.classList.add("tw"); host.appendChild(base); host.appendChild(cv);
    var ctx = cv.getContext("2d"), dots = [], W = 0, H = 0, P = 0, raf = 0, cur = 0, goal = 0, last = 0;
    var DX = Math.cos(Math.PI / 6), DY = Math.sin(Math.PI / 6), REST = 0.72;

    function build() {
      var cs = getComputedStyle(host), fs = parseFloat(cs.fontSize);
      var r = host.getBoundingClientRect(), b = base.getBoundingClientRect();
      if (!r.width) return false;
      var tw = b.left - r.left, baseY = b.top - r.top, depth = fs * 0.36;
      P = Math.ceil(depth + 4); W = Math.ceil(tw) + P * 2; H = Math.ceil(r.height) + P * 2;
      var d = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      cv.style.width = W + "px"; cv.style.height = H + "px"; cv.style.left = -P + "px"; cv.style.top = -P + "px";
      ctx.setTransform(d, 0, 0, d, 0, 0);
      // the letters, fitted to the real text's width
      var K = 3, off = document.createElement("canvas"); off.width = W * K; off.height = H * K;
      var o = off.getContext("2d", { willReadFrequently: true });
      o.font = cs.fontStyle + " " + cs.fontWeight + " " + (fs * K) + "px " + cs.fontFamily;
      if ("fontStretch" in o) o.fontStretch = "condensed";
      if ("letterSpacing" in o) o.letterSpacing = (0.02 * fs * K) + "px";
      var mw = o.measureText(text).width || 1, sx = (tw * K) / mw;
      // a stack of copies pushed back along the 30° axis; record how deep each cell first gets covered
      var pitch = Math.max(1.6, fs / 13), cols = Math.floor(W / pitch), rows = Math.floor(H / pitch);
      var depthAt = new Float32Array(cols * rows).fill(-1);
      function sampleInto(level) {
        var data = o.getImageData(0, 0, off.width, off.height).data;
        for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
          var k = j * cols + i; if (depthAt[k] >= 0) continue;
          var px = Math.floor((i + 0.5) * pitch * K), py = Math.floor((j + 0.5) * pitch * K);
          if (data[(py * off.width + px) * 4 + 3] > 100) depthAt[k] = level;
        }
      }
      function drawAt(dd) {
        o.setTransform(sx, 0, 0, 1, (P + dd * DX) * K, dd * DY * K);
        o.fillText(text, 0, (baseY + P) * K);
      }
      o.fillStyle = "#000"; o.textBaseline = "alphabetic";
      // cells covered by the letter face itself are skipped (the real text sits there)
      drawAt(0); sampleInto(0);
      var steps = Math.ceil(depth / (pitch * 0.5));
      for (var s = 1; s <= steps; s++) { drawAt(depth * s / steps); sampleInto(s / steps); }
      dots = [];
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var v = depthAt[j * cols + i]; if (v <= 0) continue;
        dots.push({ x: (i + 0.5) * pitch, y: (j + 0.5) * pitch, z: v, r: pitch * 0.36 * (1 - v * 0.6) });
      }
      return true;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = C.ink; ctx.globalAlpha = 0.72; ctx.beginPath();
      dots.forEach(function (p) {
        if (p.z > cur) return;
        // the extrusion grows from the letters outward; dots slide out along the depth axis as it does
        var r = p.r * Math.min(1, (cur - p.z) * 6 + 0.35);
        ctx.moveTo(p.x + r, p.y); ctx.arc(p.x, p.y, r, 0, 6.2832);
      });
      ctx.fill();
    }
    function tick(t) {
      var dt = last ? Math.min(t - last, 50) : 16; last = t;
      cur += (goal - cur) * Math.min(1, dt * 0.0042);
      draw();
      if (alive() && Math.abs(goal - cur) > 0.002) raf = requestAnimationFrame(tick); else { cur = goal; draw(); raf = 0; last = 0; }
    }
    function to(v) { goal = v; if (reduce) { cur = v; draw(); return; } if (!raf) raf = requestAnimationFrame(tick); }
    function init() {
      if (!build()) return;
      if (reduce) { cur = goal = REST; draw(); }
      else { cur = 0; draw(); setTimeout(function () { to(REST); }, 650); }
    }
    var tagline = host.parentNode;
    tagline.addEventListener("pointerenter", function () { to(1); });
    tagline.addEventListener("pointerleave", function () { to(REST); });
    var rt = 0;
    if ("ResizeObserver" in window) new ResizeObserver(function () { clearTimeout(rt); rt = setTimeout(function () { if (build()) draw(); }, 80); }).observe(tagline);
    onTheme.push(draw);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init);
  })();

  // ---------- section tracker ----------
  (function gauge() {
    var links = Array.prototype.slice.call(document.querySelectorAll("#gauge a")), navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.concat(navLinks).forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var t = document.querySelector(a.getAttribute("href")); if (t) io.observe(t); });
  })();
}
// The artifact viewer may swap in a new version of the page while it is open; its hot hook re-runs setup on the new DOM.
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(pentaliminalBoot);
else pentaliminalBoot();
