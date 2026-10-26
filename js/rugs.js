/* Setare Talaei — procedural rug loom.
   Every rug image on the site is woven here on a <canvas>: borders, medallions,
   herati lattices, kilim lozenges, knot texture, abrash and fringes. */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PALETTES = {
    laki:    { name: 'لاکی',    field: '#8e2b25', ground2: '#7a231f', border: '#1e2550', guard: '#e8d5ab', a: '#d9b25f', b: '#2f5b5e', c: '#efe3c6', d: '#141833' },
    sormei:  { name: 'سرمه‌ای', field: '#1c2350', ground2: '#161c42', border: '#8e2b25', guard: '#e7d3a6', a: '#d4a94e', b: '#b8463a', c: '#eee1c3', d: '#0e1230' },
    kerem:   { name: 'کرم',     field: '#e6d6b5', ground2: '#dccba7', border: '#1f2752', guard: '#9a2f28', a: '#b8873a', b: '#3d5f6b', c: '#8f2f28', d: '#2a2440' },
    fili:    { name: 'فیلی',    field: '#686d77', ground2: '#5d626b', border: '#e4dccb', guard: '#2d3140', a: '#c9b48b', b: '#a14a3f', c: '#efe8da', d: '#2a2e38' },
    yashmi:  { name: 'یشمی',    field: '#2f5e57', ground2: '#28514b', border: '#e6d6b2', guard: '#7d2a24', a: '#d1a956', b: '#9c3a2f', c: '#f0e5c9', d: '#173330' },
    gerdooi: { name: 'گردویی',  field: '#7b5236', ground2: '#6c472e', border: '#efe0c0', guard: '#2b2f4f', a: '#d8b46a', b: '#33545a', c: '#f2e7cd', d: '#3a2618' },
    abi:     { name: 'آبی',     field: '#2e5f8a', ground2: '#285479', border: '#efe3c4', guard: '#8e2b25', a: '#d6b05a', b: '#c4553f', c: '#f3e9d0', d: '#142c45' },
    toosi:   { name: 'طوسی',    field: '#bdb8ae', ground2: '#b0aba0', border: '#3b3f4c', guard: '#efe9dc', a: '#7d6a4d', b: '#5b6d78', c: '#f4efe5', d: '#2c2f38' },
  };

  /* ---------- colour helpers ---------- */
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(h1, h2, t) {
    const a = hex(h1), b = hex(h2);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  function shade(h, t) { return t > 0 ? mix(h, '#ffffff', t) : mix(h, '#000000', -t); }

  /* ---------- motifs ---------- */
  function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  function rosette(ctx, x, y, s, c1, c2, c3, petals) {
    petals = petals || 8;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = c1;
    for (let i = 0; i < petals; i++) {
      ctx.rotate(TAU / petals);
      ctx.beginPath(); ctx.ellipse(0, -s * 0.52, s * 0.21, s * 0.44, 0, 0, TAU); ctx.fill();
    }
    circle(ctx, 0, 0, s * 0.4, c2);
    ctx.fillStyle = c1;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TAU;
      ctx.beginPath(); ctx.arc(Math.cos(a) * s * 0.27, Math.sin(a) * s * 0.27, s * 0.06, 0, TAU); ctx.fill();
    }
    circle(ctx, 0, 0, s * 0.15, c3);
    ctx.restore();
  }

  function palmette(ctx, x, y, s, c1, c2, c3, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    ctx.fillStyle = c1;
    for (let j = -2; j <= 2; j++) {
      const a = j * 0.42;
      ctx.beginPath();
      ctx.ellipse(Math.sin(a) * s * 0.42, -Math.cos(a) * s * 0.42, s * 0.17, s * 0.46, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.arc(0, -s * 0.12, s * 0.4, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c3;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.quadraticCurveTo(s * 0.18, -s * 0.2, 0, -s * 0.05); ctx.quadraticCurveTo(-s * 0.18, -s * 0.2, 0, -s * 0.55); ctx.fill();
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.08); ctx.lineTo(s * 0.22, -s * 0.08); ctx.lineTo(0, s * 0.3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function leaf(ctx, x, y, s, c, rib, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.6);
    ctx.bezierCurveTo(s * 0.32, -s * 0.3, s * 0.3, s * 0.3, 0, s * 0.6);
    ctx.bezierCurveTo(-s * 0.3, s * 0.3, -s * 0.32, -s * 0.3, 0, -s * 0.6);
    ctx.fill();
    if (rib) { ctx.strokeStyle = rib; ctx.lineWidth = Math.max(1, s * 0.06); ctx.beginPath(); ctx.moveTo(0, -s * 0.45); ctx.lineTo(0, s * 0.45); ctx.stroke(); }
    ctx.restore();
  }

  function boteh(ctx, x, y, s, c1, c2, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    function shape(k) {
      ctx.beginPath(); ctx.moveTo(0, s * 0.5 * k);
      ctx.bezierCurveTo(-s * 0.52 * k, s * 0.42 * k, -s * 0.46 * k, -s * 0.32 * k, 0, -s * 0.44 * k);
      ctx.bezierCurveTo(s * 0.26 * k, -s * 0.54 * k, s * 0.34 * k, -s * 0.76 * k, s * 0.14 * k, -s * 0.86 * k);
      ctx.bezierCurveTo(s * 0.52 * k, -s * 0.42 * k, s * 0.46 * k, s * 0.42 * k, 0, s * 0.5 * k);
      ctx.fill();
    }
    ctx.fillStyle = c1; shape(1);
    ctx.fillStyle = c2; ctx.translate(0, s * 0.06); shape(0.55);
    ctx.restore();
  }

  function star8(ctx, x, y, r, c, c2) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = c;
    ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    ctx.rotate(Math.PI / 4); ctx.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
    ctx.restore();
    if (c2) circle(ctx, x, y, r * 0.42, c2);
  }

  function lozenge(ctx, x, y, w, h, c) {
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y); ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y); ctx.closePath(); ctx.fill();
  }

  function cypress(ctx, x, y, w, h, c, c2) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w * 0.7, -h * 0.1, w * 0.55, h * 0.4, 0, h * 0.42);
    ctx.bezierCurveTo(-w * 0.55, h * 0.4, -w * 0.7, -h * 0.1, 0, -h / 2);
    ctx.fill();
    ctx.fillStyle = c2; ctx.fillRect(-w * 0.06, h * 0.38, w * 0.12, h * 0.12);
    ctx.restore();
  }

  function motif(ctx, R, x, y, s, cols, ang) {
    const k = R();
    const c = cols;
    if (k < 0.3) rosette(ctx, x, y, s, c[0], c[1], c[2], R() < 0.5 ? 8 : 6);
    else if (k < 0.55) palmette(ctx, x, y, s * 1.1, c[0], c[1], c[2], ang);
    else if (k < 0.75) leaf(ctx, x, y, s, c[1], c[2], ang);
    else if (k < 0.88) boteh(ctx, x, y, s, c[0], c[2], ang);
    else star8(ctx, x, y, s * 0.38, c[0], c[2]);
  }

  function vine(ctx, R, w, h, col, width, n) {
    ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = R() * w, y = R() * h;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        const cx = x + (R() - 0.5) * w * 0.5, cy = y + (R() - 0.5) * h * 0.5;
        x = x + (R() - 0.5) * w * 0.6; y = y + (R() - 0.5) * h * 0.6;
        ctx.quadraticCurveTo(cx, cy, x, y);
      }
      ctx.stroke();
    }
  }

  /* ---------- borders ---------- */
  function perimeter(x0, y0, x1, y1) {
    const w = x1 - x0, h = y1 - y0, L = 2 * (w + h);
    return {
      L: L,
      at: function (s) {
        s = ((s % L) + L) % L;
        if (s < w) return { x: x0 + s, y: y0, a: 0 };
        s -= w; if (s < h) return { x: x1, y: y0 + s, a: Math.PI / 2 };
        s -= h; if (s < w) return { x: x1 - s, y: y1, a: Math.PI };
        s -= w; return { x: x0, y: y1 - s, a: -Math.PI / 2 };
      },
    };
  }

  function band(ctx, x, y, w, h, t, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, t); ctx.fillRect(x, y + h - t, w, t);
    ctx.fillRect(x, y, t, h); ctx.fillRect(x + w - t, y, t, h);
  }

  function guard(ctx, x, y, w, h, t, col, dot) {
    band(ctx, x, y, w, h, t, col);
    const p = perimeter(x + t / 2, y + t / 2, x + w - t / 2, y + h - t / 2);
    const step = Math.max(4, t * 1.3);
    ctx.fillStyle = dot;
    for (let s = 0; s < p.L; s += step) {
      const q = p.at(s);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a + Math.PI / 4);
      const r = t * 0.26; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
  }

  function mainBorder(ctx, R, x, y, w, h, t, P, kind) {
    band(ctx, x, y, w, h, t, P.border);
    const p = perimeter(x + t / 2, y + t / 2, x + w - t / 2, y + h - t / 2);
    if (kind === 'kilim') {
      // stepped triangles
      const step = t * 0.9;
      for (let s = 0; s < p.L; s += step) {
        const q = p.at(s);
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
        ctx.fillStyle = ((s / step) | 0) % 2 ? P.a : P.c;
        ctx.beginPath(); ctx.moveTo(-step / 2, t * 0.32); ctx.lineTo(0, -t * 0.32); ctx.lineTo(step / 2, t * 0.32); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      return;
    }
    // meandering vine
    ctx.strokeStyle = shade(P.border, P.border === '#efe3c4' || P.border === '#e6d6b2' || P.border === '#efe0c0' || P.border === '#e4dccb' ? -0.35 : 0.35);
    ctx.lineWidth = Math.max(1, t * 0.06);
    ctx.beginPath();
    for (let s = 0; s <= p.L; s += 2) {
      const q = p.at(s);
      const off = Math.sin((s / (t * 1.2)) * Math.PI) * t * 0.24;
      const nx = -Math.sin(q.a), ny = Math.cos(q.a);
      const X = q.x + nx * off, Y = q.y + ny * off;
      s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.stroke();
    const step = t * 1.2;
    let i = 0;
    for (let s = step / 2; s < p.L; s += step, i++) {
      const q = p.at(s);
      if (i % 2 === 0) rosette(ctx, q.x, q.y, t * 0.36, P.a, P.c, P.b, 8);
      else palmette(ctx, q.x, q.y, t * 0.42, P.b, P.a, P.c, q.a + Math.PI);
    }
    // corner rosettes
    [[x + t / 2, y + t / 2], [x + w - t / 2, y + t / 2], [x + t / 2, y + h - t / 2], [x + w - t / 2, y + h - t / 2]].forEach(function (c) {
      ctx.fillStyle = P.border; ctx.fillRect(c[0] - t / 2, c[1] - t / 2, t, t);
      rosette(ctx, c[0], c[1], t * 0.4, P.c, P.b, P.a, 8);
    });
  }

  /* ---------- field designs ---------- */
  function medallionPath(ctx, cx, cy, rx, ry, k, lobes, pend) {
    ctx.beginPath();
    const N = 220;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * TAU;
      let r = 1 + 0.045 * Math.cos(lobes * t);
      r *= 1 + pend * Math.pow(Math.abs(Math.cos(t)), 12);
      const X = cx + Math.sin(t) * rx * k * r, Y = cy - Math.cos(t) * ry * k * r;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }

  function medallion(ctx, R, cx, cy, rx, ry, P) {
    const layers = [[1, P.border], [0.94, P.guard], [0.9, P.border]];
    layers.forEach(function (l) { ctx.fillStyle = l[1]; medallionPath(ctx, cx, cy, rx, ry, l[0], 16, 0.32); ctx.fill(); });
    // ring of palmettes
    const n = 12;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      palmette(ctx, cx + Math.sin(t) * rx * 0.78, cy - Math.cos(t) * ry * 0.78, Math.min(rx, ry) * 0.17, P.a, P.c, P.b, t);
    }
    ctx.fillStyle = P.c; medallionPath(ctx, cx, cy, rx, ry, 0.64, 12, 0.18); ctx.fill();
    ctx.fillStyle = P.field; medallionPath(ctx, cx, cy, rx, ry, 0.59, 12, 0.18); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const t = (i / 8) * TAU + 0.2;
      leaf(ctx, cx + Math.sin(t) * rx * 0.44, cy - Math.cos(t) * ry * 0.44, Math.min(rx, ry) * 0.14, P.a, P.d, t);
    }
    ctx.fillStyle = P.border; medallionPath(ctx, cx, cy, rx * 0.62, ry * 0.5, 0.56, 8, 0.1); ctx.fill();
    star8(ctx, cx, cy, Math.min(rx, ry) * 0.2, P.a, null);
    rosette(ctx, cx, cy, Math.min(rx, ry) * 0.16, P.c, P.b, P.a, 8);
    // pendants (sar-toranj)
    [-1, 1].forEach(function (d) {
      const py = cy + d * ry * 1.42;
      lozenge(ctx, cx, py, rx * 0.34, ry * 0.26, P.border);
      lozenge(ctx, cx, py, rx * 0.22, ry * 0.16, P.guard);
      circle(ctx, cx, py, Math.min(rx, ry) * 0.05, P.a);
    });
  }

  function cornerPiece(ctx, R, cw, ch, P) {
    const layers = [[1, P.border], [0.9, P.guard], [0.84, P.ground2]];
    layers.forEach(function (l) {
      ctx.fillStyle = l[1]; ctx.beginPath(); ctx.moveTo(0, 0);
      const N = 90;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * (Math.PI / 2);
        const r = l[0] * (1 + 0.05 * Math.sin(t * 22));
        ctx.lineTo(Math.cos(t) * cw * r, Math.sin(t) * ch * r);
      }
      ctx.closePath(); ctx.fill();
    });
    palmette(ctx, cw * 0.3, ch * 0.3, Math.min(cw, ch) * 0.3, P.a, P.c, P.b, Math.PI * 0.75);
    leaf(ctx, cw * 0.55, ch * 0.13, Math.min(cw, ch) * 0.22, P.c, P.d, Math.PI / 2);
    leaf(ctx, cw * 0.13, ch * 0.55, Math.min(cw, ch) * 0.22, P.c, P.d, 0);
  }

  function scatter(ctx, R, w, h, P, density, avoid) {
    const pts = [];
    const base = Math.min(w, h) * 0.13;
    const tries = 500;
    const target = Math.round(density * (w * h) / (base * base));
    for (let i = 0; i < tries && pts.length < target; i++) {
      const x = R() * w, y = R() * h;
      const s = base * (0.55 + R() * 0.55);
      if (avoid && avoid(x, y, s)) continue;
      let ok = true;
      for (let j = 0; j < pts.length; j++) {
        const p = pts[j];
        if ((p.x - x) ** 2 + (p.y - y) ** 2 < ((p.s + s) * 0.62) ** 2) { ok = false; break; }
      }
      if (ok) pts.push({ x: x, y: y, s: s });
    }
    const palettes = [[P.a, P.c, P.b], [P.b, P.a, P.c], [P.c, P.border, P.a], [P.border, P.a, P.c]];
    pts.forEach(function (p) { motif(ctx, R, p.x, p.y, p.s, palettes[(R() * palettes.length) | 0], R() * TAU); });
  }

  function quartered(ctx, fx, fy, fw, fh, draw) {
    const qw = Math.ceil(fw / 2), qh = Math.ceil(fh / 2);
    const q = document.createElement('canvas'); q.width = qw; q.height = qh;
    const qc = q.getContext('2d');
    draw(qc, qw, qh);
    ctx.save(); ctx.translate(fx, fy); ctx.drawImage(q, 0, 0);
    ctx.translate(fw, 0); ctx.scale(-1, 1); ctx.drawImage(q, 0, 0);
    ctx.translate(0, fh); ctx.scale(1, -1); ctx.drawImage(q, 0, 0);
    ctx.translate(fw, 0); ctx.scale(-1, 1); ctx.drawImage(q, 0, 0);
    ctx.restore();
  }

  function fieldToranj(ctx, R, fx, fy, fw, fh, P, opts) {
    const runner = fh / fw > 2.2;
    const count = runner ? Math.max(2, Math.round(fh / fw / 1.2)) : 1;
    const rx = fw * (runner ? 0.34 : 0.27), ry = runner ? Math.min(fw * 0.5, fh / count * 0.3) : fh * 0.17;
    quartered(ctx, fx, fy, fw, fh, function (q, qw, qh) {
      q.fillStyle = P.field; q.fillRect(0, 0, qw, qh);
      vine(q, R, qw, qh, shade(P.field, P.field === '#e6d6b5' || P.field === '#bdb8ae' ? -0.18 : 0.16), Math.max(1, qw * 0.008), 7);
      const cw = qw * 0.62, ch = Math.min(qh * 0.34, qw * 0.5);
      scatter(q, R, qw, qh, P, 0.55, function (x, y, s) {
        if ((x / cw) ** 2 + (y / ch) ** 2 < 1.15) return true;
        if (!runner && ((x - qw) / (rx * 1.15)) ** 2 + ((y - qh) / (ry * 1.7)) ** 2 < 1) return true;
        return false;
      });
      cornerPiece(q, R, cw, ch, P);
    });
    for (let i = 0; i < count; i++) {
      const cy = count === 1 ? fy + fh / 2 : fy + (fh / count) * (i + 0.5);
      medallion(ctx, R, fx + fw / 2, cy, rx, ry, P);
    }
  }

  function fieldAfshan(ctx, R, fx, fy, fw, fh, P) {
    quartered(ctx, fx, fy, fw, fh, function (q, qw, qh) {
      q.fillStyle = P.field; q.fillRect(0, 0, qw, qh);
      vine(q, R, qw, qh, shade(P.field, P.field === '#e6d6b5' || P.field === '#bdb8ae' ? -0.2 : 0.2), Math.max(1, qw * 0.01), 12);
      scatter(q, R, qw, qh, P, 1.05, null);
    });
    rosette(ctx, fx + fw / 2, fy + fh / 2, Math.min(fw, fh) * 0.12, P.a, P.border, P.c, 8);
  }

  function fieldHerati(ctx, R, fx, fy, fw, fh, P) {
    ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
    ctx.fillStyle = P.field; ctx.fillRect(fx, fy, fw, fh);
    const cols = fw / fh > 0.5 ? 4 : 2;
    const cw = fw / cols, chh = cw * 0.9;
    const rows = Math.ceil(fh / chh) + 1;
    const oy = fy + (fh - (rows - 1) * chh) / 2;
    for (let r = -1; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const x = fx + c * cw, y = oy + r * chh;
        // diamond lattice
        ctx.strokeStyle = P.a; ctx.lineWidth = Math.max(1, cw * 0.03);
        ctx.beginPath(); ctx.moveTo(x, y - chh / 2); ctx.lineTo(x + cw / 2, y); ctx.lineTo(x, y + chh / 2); ctx.lineTo(x - cw / 2, y); ctx.closePath(); ctx.stroke();
        rosette(ctx, x, y, cw * 0.17, P.c, P.b, P.a, 6);
        // the four "fish" leaves
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2 + Math.PI / 4;
          leaf(ctx, x + Math.cos(a) * cw * 0.28, y + Math.sin(a) * chh * 0.28, cw * 0.24, P.border, P.c, a + Math.PI / 2);
        }
        rosette(ctx, x + cw / 2, y + chh / 2, cw * 0.1, P.a, P.c, P.b, 6);
      }
    }
    ctx.restore();
  }

  function fieldKhesti(ctx, R, fx, fy, fw, fh, P) {
    const cols = fw / fh > 0.5 ? 3 : 2;
    const cw = fw / cols; const rows = Math.max(2, Math.round(fh / cw)); const ch = fh / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = fx + c * cw, y = fy + r * ch, alt = (r + c) % 2;
      ctx.fillStyle = alt ? P.field : P.ground2; ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = P.a; ctx.lineWidth = Math.max(1.5, cw * 0.035); ctx.strokeRect(x + cw * 0.05, y + ch * 0.05, cw * 0.9, ch * 0.9);
      if (alt) cypress(ctx, x + cw / 2, y + ch / 2, cw * 0.36, ch * 0.7, P.b, P.a);
      else { rosette(ctx, x + cw / 2, y + ch / 2, Math.min(cw, ch) * 0.24, P.c, P.border, P.a, 8); }
      leaf(ctx, x + cw * 0.18, y + ch * 0.18, cw * 0.12, P.c, null, -Math.PI / 4);
      leaf(ctx, x + cw * 0.82, y + ch * 0.82, cw * 0.12, P.c, null, -Math.PI / 4);
    }
  }

  function fieldMoharramat(ctx, R, fx, fy, fw, fh, P) {
    const n = fw / fh > 0.5 ? 9 : 5; const sw = fw / n;
    const seq = [P.field, P.c, P.b, P.ground2, P.a];
    for (let i = 0; i < n; i++) {
      const col = seq[i % seq.length];
      ctx.fillStyle = col; ctx.fillRect(fx + i * sw, fy, sw + 0.5, fh);
      const mcol = col === P.c ? P.border : P.c;
      for (let y = fy + sw * 0.6; y < fy + fh; y += sw * 1.1) {
        if (i % 2) lozenge(ctx, fx + i * sw + sw / 2, y, sw * 0.55, sw * 0.75, mcol);
        else boteh(ctx, fx + i * sw + sw / 2, y, sw * 0.62, mcol, col, 0);
      }
    }
  }

  function fieldKilim(ctx, R, fx, fy, fw, fh, P) {
    ctx.fillStyle = P.field; ctx.fillRect(fx, fy, fw, fh);
    const n = Math.max(2, Math.round(fh / fw * 1.4));
    const seg = fh / n;
    for (let i = 0; i < n; i++) {
      const cx = fx + fw / 2, cy = fy + seg * (i + 0.5);
      const w = fw * 0.78, h = seg * 0.86;
      const steps = 6;
      const cols = [P.border, P.c, P.b, P.a, P.d];
      for (let k = 0; k < steps; k++) {
        const s = 1 - k / steps;
        // stepped lozenge
        ctx.fillStyle = cols[k % cols.length];
        ctx.beginPath();
        const st = 7;
        for (let j = 0; j <= st; j++) { const t = j / st; ctx.lineTo(cx + w / 2 * s * t, cy - h / 2 * s * (1 - t)); ctx.lineTo(cx + w / 2 * s * (t + 1 / st), cy - h / 2 * s * (1 - t)); }
        for (let j = 0; j <= st; j++) { const t = 1 - j / st; ctx.lineTo(cx + w / 2 * s * t, cy + h / 2 * s * (1 - t)); ctx.lineTo(cx + w / 2 * s * (t - 1 / st), cy + h / 2 * s * (1 - t)); }
        for (let j = 0; j <= st; j++) { const t = j / st; ctx.lineTo(cx - w / 2 * s * t, cy + h / 2 * s * (1 - t)); ctx.lineTo(cx - w / 2 * s * (t + 1 / st), cy + h / 2 * s * (1 - t)); }
        for (let j = 0; j <= st; j++) { const t = 1 - j / st; ctx.lineTo(cx - w / 2 * s * t, cy - h / 2 * s * (1 - t)); ctx.lineTo(cx - w / 2 * s * (t - 1 / st), cy - h / 2 * s * (1 - t)); }
        ctx.closePath(); ctx.fill();
      }
      // hooks on the sides
      [[-1], [1]].forEach(function (d) {
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = P.a;
          const hx = cx + d[0] * w * 0.5, hy = cy - seg * 0.25 + k * seg * 0.25;
          ctx.fillRect(hx - fw * 0.03, hy - fw * 0.015, fw * 0.06, fw * 0.03);
        }
      });
    }
  }

  /* ---------- texture: knots, abrash, wear, light ---------- */
  function valueNoise(R, gw, gh) {
    const g = new Float32Array((gw + 1) * (gh + 1));
    for (let i = 0; i < g.length; i++) g[i] = R();
    return function (u, v) {
      const x = u * gw, y = v * gh, ix = Math.min(gw - 1, x | 0), iy = Math.min(gh - 1, y | 0), fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = g[iy * (gw + 1) + ix], b = g[iy * (gw + 1) + ix + 1], c = g[(iy + 1) * (gw + 1) + ix], d = g[(iy + 1) * (gw + 1) + ix + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  function weave(ctx, x0, y0, w, h, R, opts) {
    const img = ctx.getImageData(x0, y0, w, h), d = img.data;
    const knot = opts.knot || 2;
    const vintage = opts.vintage || 0;
    const flat = opts.kind === 'kilim', cover = opts.kind === 'cover';
    const wear = valueNoise(R, 7, 10), abr = valueNoise(R, 1, 18), lightN = valueNoise(R, 3, 4);
    const warp = [222, 208, 180];
    for (let y = 0; y < h; y++) {
      const v = y / h;
      const abrash = (abr(0.5, v) - 0.5) * (6 + vintage * 26);
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        const u = x / w;
        let n;
        if (flat) n = ((y % 4) < 1 ? -10 : 2) + (Math.random() - 0.5) * 10;
        else if (cover) n = (((x + y) % 3) === 0 ? -5 : 1) + (Math.random() - 0.5) * 6;
        else {
          const kx = (x / knot) | 0, ky = (y / knot) | 0;
          const hsh = ((Math.imul(kx, 73856093) ^ Math.imul(ky, 19349663)) >>> 0) % 1000 / 1000;
          n = (hsh - 0.5) * 16 + (Math.random() - 0.5) * 9;
          if (y % knot === knot - 1) n -= 7;
          if (x % knot === 0) n -= 3;
        }
        const light = (lightN(u, v) - 0.5) * 14 + (0.5 - v) * 8 + (0.5 - u) * 6;
        let r = d[i] + n + abrash + light, g = d[i + 1] + n + abrash + light, b = d[i + 2] + n * 0.9 + abrash * 0.8 + light;
        if (vintage > 0) {
          const wv = wear(u, v);
          const t = Math.max(0, (wv - (0.84 - vintage * 0.24)) * 3.6) * vintage;
          const grey = (r + g + b) / 3;
          const desat = 0.18 + vintage * 0.4;
          r = r + (grey - r) * desat; g = g + (grey - g) * desat; b = b + (grey - b) * desat;
          if (t > 0) { const tt = Math.min(0.85, t); r += (warp[0] - r) * tt; g += (warp[1] - g) * tt; b += (warp[2] - b) * tt; }
        }
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
      }
    }
    ctx.putImageData(img, x0, y0);
  }

  function fringe(ctx, R, x, y, w, len, dir, col) {
    const step = Math.max(2.2, w / 90);
    ctx.lineCap = 'round';
    for (let s = step / 2; s < w; s += step) {
      const l = len * (0.78 + R() * 0.22);
      const sway = (R() - 0.5) * len * 0.25;
      ctx.strokeStyle = mix(col, '#8a7b62', R() * 0.35);
      ctx.lineWidth = step * 0.62;
      ctx.beginPath(); ctx.moveTo(x + s, y);
      ctx.quadraticCurveTo(x + s + sway * 0.3, y + dir * l * 0.6, x + s + sway, y + dir * l); ctx.stroke();
    }
    ctx.fillStyle = mix(col, '#6f6352', 0.35);
    ctx.fillRect(x, dir > 0 ? y : y - len * 0.12, w, len * 0.12);
  }

  /* ---------- the loom ---------- */
  function weaveRug(o) {
    const P = typeof o.palette === 'string' ? PALETTES[o.palette] : o.palette;
    const R = rng(o.seed || 7);
    const W = Math.round(o.width), H = Math.round(o.height);
    const kind = o.kind || 'rug';
    const hasFringe = o.fringe !== false && kind !== 'cover';
    const F = hasFringe ? Math.round(Math.min(W, H) * 0.06) : 0;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const bx = 0, by = F, bw = W, bh = H - F * 2;

    ctx.save();
    if (kind === 'cover') {
      const r = Math.min(bw, bh) * 0.06;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, r) : ctx.rect(bx, by, bw, bh); ctx.clip();
    }
    ctx.fillStyle = P.border; ctx.fillRect(bx, by, bw, bh);

    const m = Math.min(bw, bh);
    const g1 = Math.max(2, m * 0.018), bt = m * (kind === 'mat' ? 0.1 : 0.085), g2 = Math.max(2, m * 0.016);
    let x = bx + m * 0.012, y = by + m * 0.012, w = bw - m * 0.024, h = bh - m * 0.024;
    band(ctx, bx, by, bw, bh, m * 0.012, shade(P.border, -0.25));
    guard(ctx, x, y, w, h, g1, P.guard, P.border); x += g1; y += g1; w -= g1 * 2; h -= g1 * 2;
    mainBorder(ctx, R, x, y, w, h, bt, P, o.design === 'kilim' ? 'kilim' : 'rug'); x += bt; y += bt; w -= bt * 2; h -= bt * 2;
    guard(ctx, x, y, w, h, g2, P.guard, P.b); x += g2; y += g2; w -= g2 * 2; h -= g2 * 2;

    const design = o.design || 'toranj';
    if (design === 'toranj') fieldToranj(ctx, R, x, y, w, h, P, o);
    else if (design === 'afshan') fieldAfshan(ctx, R, x, y, w, h, P);
    else if (design === 'mahi') fieldHerati(ctx, R, x, y, w, h, P);
    else if (design === 'khesti') fieldKhesti(ctx, R, x, y, w, h, P);
    else if (design === 'moharramat') fieldMoharramat(ctx, R, x, y, w, h, P);
    else if (design === 'kilim') fieldKilim(ctx, R, x, y, w, h, P);

    if (o.texture !== false) weave(ctx, bx, by, bw, bh, R, { knot: o.knot || Math.max(2, Math.round(m / 160)), vintage: o.vintage || 0, kind: design === 'kilim' ? 'kilim' : kind });

    if (kind === 'cover') {
      // elastic hem of a rug cover
      ctx.lineWidth = m * 0.05; ctx.strokeStyle = shade(P.border, -0.35);
      const r = Math.min(bw, bh) * 0.06;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, r) : ctx.rect(bx, by, bw, bh); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
      for (let s = 0; s < bw; s += 5) { ctx.beginPath(); ctx.moveTo(bx + s, by); ctx.lineTo(bx + s + 2, by + m * 0.025); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx + s, by + bh); ctx.lineTo(bx + s + 2, by + bh - m * 0.025); ctx.stroke(); }
    }
    ctx.restore();

    // overcast side cords
    if (kind !== 'cover') {
      ctx.fillStyle = shade(P.border, -0.35);
      ctx.fillRect(bx, by, Math.max(1.5, m * 0.008), bh); ctx.fillRect(bx + bw - Math.max(1.5, m * 0.008), by, Math.max(1.5, m * 0.008), bh);
    }
    if (hasFringe) {
      fringe(ctx, R, bx, by, bw, F, -1, '#e9dfc9');
      fringe(ctx, R, bx, by + bh, bw, F, 1, '#e9dfc9');
    }
    return cv;
  }

  /* ---------- cache + lazy images ---------- */
  const cache = new Map();
  function keyOf(o) { return [o.design, typeof o.palette === 'string' ? o.palette : 'x', o.seed, o.width | 0, o.height | 0, o.kind, o.vintage || 0, o.fringe === false ? 0 : 1].join('|'); }

  function rugURL(o) {
    const k = keyOf(o);
    if (cache.has(k)) return cache.get(k);
    const cv = weaveRug(o);
    let url;
    try { url = cv.toDataURL('image/webp', 0.9); if (url.indexOf('image/webp') < 0) url = cv.toDataURL('image/png'); }
    catch (e) { url = cv.toDataURL('image/png'); }
    cache.set(k, url);
    return url;
  }

  // Queue renders so the main thread stays responsive while dozens of rugs are woven.
  const queue = [];
  let busy = false;
  function pump() {
    if (!queue.length) { busy = false; return; }
    busy = true;
    const start = performance.now();
    while (queue.length && performance.now() - start < 14) {
      const job = queue.shift();
      job.img.src = rugURL(job.opts);
      job.img.classList.add('is-woven');
    }
    if (global.requestIdleCallback) global.requestIdleCallback(pump, { timeout: 80 }); else setTimeout(pump, 16);
  }
  function weaveInto(img, opts) {
    queue.push({ img: img, opts: opts });
    if (!busy) pump();
  }

  /* Minimal GLB writer: a rug-sized slab (metres) textured with the woven rug,
     so <model-viewer> can show it in 3D and place it at real scale in AR. */
  function rugGLB(canvas, widthM, lengthM) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        blob.arrayBuffer().then(function (png) {
          const t = 0.012, hw = widthM / 2, hl = lengthM / 2;
          const P = [], N = [], U = [], I = [];
          function quad(a, b, c, d, n, uv) {
            const base = P.length / 3;
            [a, b, c, d].forEach(function (p, k) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); U.push(uv[k][0], uv[k][1]); });
            I.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
          const e = [[0.01, 0.01], [0.012, 0.01], [0.012, 0.012], [0.01, 0.012]];
          quad([-hw, t, -hl], [-hw, t, hl], [hw, t, hl], [hw, t, -hl], [0, 1, 0], [[0, 0], [0, 1], [1, 1], [1, 0]]);
          quad([-hw, 0, -hl], [hw, 0, -hl], [hw, 0, hl], [-hw, 0, hl], [0, -1, 0], e);
          quad([-hw, 0, hl], [hw, 0, hl], [hw, t, hl], [-hw, t, hl], [0, 0, 1], e);
          quad([hw, 0, -hl], [-hw, 0, -hl], [-hw, t, -hl], [hw, t, -hl], [0, 0, -1], e);
          quad([hw, 0, hl], [hw, 0, -hl], [hw, t, -hl], [hw, t, hl], [1, 0, 0], e);
          quad([-hw, 0, -hl], [-hw, 0, hl], [-hw, t, hl], [-hw, t, -hl], [-1, 0, 0], e);
          const pos = new Float32Array(P), nor = new Float32Array(N), uv = new Float32Array(U), idx = new Uint16Array(I);
          const pad = function (n) { return (n + 3) & ~3; };
          const views = [];
          let off = 0;
          [pos.byteLength, nor.byteLength, uv.byteLength, idx.byteLength, png.byteLength].forEach(function (len) { views.push({ buffer: 0, byteOffset: off, byteLength: len }); off += pad(len); });
          views[0].target = 34962; views[1].target = 34962; views[2].target = 34962; views[3].target = 34963;
          const json = {
            asset: { version: '2.0', generator: 'setare-talaei-loom' },
            scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
            meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
            materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.92 } }],
            textures: [{ source: 0, sampler: 0 }], samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
            images: [{ bufferView: 4, mimeType: 'image/png' }],
            accessors: [
              { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: [-hw, 0, -hl], max: [hw, t, hl] },
              { bufferView: 1, componentType: 5126, count: nor.length / 3, type: 'VEC3' },
              { bufferView: 2, componentType: 5126, count: uv.length / 2, type: 'VEC2' },
              { bufferView: 3, componentType: 5123, count: idx.length, type: 'SCALAR' },
            ],
            bufferViews: views, buffers: [{ byteLength: off }],
          };
          let js = new TextEncoder().encode(JSON.stringify(json));
          const jsLen = pad(js.length);
          const total = 12 + 8 + jsLen + 8 + off;
          const out = new ArrayBuffer(total), dv = new DataView(out), u8 = new Uint8Array(out);
          dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
          dv.setUint32(12, jsLen, true); dv.setUint32(16, 0x4E4F534A, true);
          u8.fill(0x20, 20, 20 + jsLen); u8.set(js, 20);
          let o2 = 20 + jsLen;
          dv.setUint32(o2, off, true); dv.setUint32(o2 + 4, 0x004E4942, true); o2 += 8;
          [pos, nor, uv, idx, new Uint8Array(png)].forEach(function (arr, k) { u8.set(new Uint8Array(arr.buffer || arr, arr.byteOffset || 0, arr.byteLength), o2 + views[k].byteOffset); });
          resolve(URL.createObjectURL(new Blob([out], { type: 'model/gltf-binary' })));
        });
      }, 'image/png');
    });
  }

  global.Loom = { PALETTES: PALETTES, weaveRug: weaveRug, rugURL: rugURL, weaveInto: weaveInto, rugGLB: rugGLB, rosette: rosette, star8: star8 };
})(window);
