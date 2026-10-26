/* Setare Talaei — night desert hero.
   Pass 1 (once, in strips): raymarched dunes under moonlight + Milky Way, baked to a texture.
   Pass 2 (every frame): twinkling stars composited over the baked scene.
   Overlay (2D): stars drift together, trace a rug in the sky, then the brand name appears. */
(function (global) {
  'use strict';

  const COMMON = `
    precision highp float;
    float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
    vec2 h22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
    float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
      return mix(mix(h12(i),h12(i+vec2(1,0)),u.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),u.x),u.y);}
  `;

  const VERT = `attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0.,1.); }`;

  const SCENE = COMMON + `
    uniform vec2 uRes;
    uniform float uPitch;
    const vec3 L = vec3(-0.55, 0.22, -0.45);
    float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
    float fbm3(vec2 p){float a=.5,s=0.;for(int i=0;i<3;i++){s+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}

    float dune(float x, float slip){
      float t = fract(x);
      float h = t < slip ? t / slip : (1. - t) / (1. - slip);
      return mix(h * h * (1.5 - 0.5 * h), h * h * (3. - 2. * h), 0.55);   // rolling, softly crested
    }
    float terrain(vec2 p){
      vec2 q = p * 0.05;
      vec2 w = vec2(fbm3(q * 0.8 + 3.1), fbm3(q * 0.8 + 7.7));
      q += (w - 0.5) * 1.7;
      float H = dune(q.x * 0.82 + q.y * 0.57, 0.8) * (0.55 + 0.9 * vnoise(q * 0.45 + 11.)) * 4.2;
      vec2 q2 = p * 0.13 + w * 0.9;
      H += dune(q2.x * 0.45 - q2.y * 0.89, 0.74) * 0.55 * (0.3 + vnoise(q2 * 0.35));
      H += vnoise(p * 0.018) * 5.0;
      return H;
    }
    vec3 normalAt(vec2 p, float t){
      float e = 0.02 + t * 0.0015;
      return normalize(vec3(terrain(p - vec2(e, 0.)) - terrain(p + vec2(e, 0.)), 2. * e, terrain(p - vec2(0., e)) - terrain(p + vec2(0., e))));
    }
    float softShadow(vec3 p, vec3 l){
      float res = 1., t = 0.25;
      for (int i = 0; i < 26; i++) {
        vec3 q = p + l * t;
        float h = q.y - terrain(q.xz);
        res = min(res, 9. * h / t);
        t += clamp(h * 0.6, 0.15, 2.5);
        if (res < 0.001 || t > 45.) break;
      }
      return clamp(res, 0., 1.);
    }
    vec3 skyColor(vec3 rd){
      vec3 l = normalize(L);
      float y = max(rd.y, 0.);
      vec3 zen = vec3(0.004, 0.005, 0.014);
      vec3 mid = vec3(0.010, 0.013, 0.032);
      vec3 hor = vec3(0.060, 0.045, 0.050);
      vec3 col = mix(hor, mid, smoothstep(0.0, 0.18, y));
      col = mix(col, zen, smoothstep(0.15, 0.8, y));
      // golden afterglow hugging the horizon (brand gold, very faint)
      col += vec3(0.42, 0.22, 0.08) * exp(-y * 26.) * (0.30 + 0.25 * exp(-abs(rd.x) * 3.));
      // moonglow from off-screen left
      col += vec3(0.05, 0.06, 0.10) * pow(max(dot(rd, -l), 0.), 5.) * 0.4;
      // Milky Way
      vec3 N = vec3(0.741, -0.670, 0.050);
      vec3 A = normalize(vec3(-0.05, 0.02, 1.0));
      vec3 B = cross(N, A);
      float d = dot(rd, N);
      vec2 bc = vec2(dot(rd, A), dot(rd, B)) * 3.0;
      float band = exp(-d * d / (0.15 * 0.15));
      float core = exp(-d * d / (0.055 * 0.055));
      float cloud = fbm(bc * 3.0 + 1.3);
      float dust = smoothstep(0.42, 0.78, fbm(bc * 6.5 + 9.2 + vec2(d * 4.)));
      float knots = smoothstep(0.55, 0.85, fbm(bc * 12. + 4.));
      float mw = band * (0.18 + 1.1 * cloud * cloud + 0.9 * knots * core) * (1. - 0.9 * dust * (0.35 + core));
      vec3 mwc = mix(vec3(0.46, 0.50, 0.66), vec3(0.92, 0.80, 0.66), smoothstep(0.4, 0.8, cloud) * core);
      col += mwc * mw * 0.30 * smoothstep(0.0, 0.2, y);
      return col;
    }

    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      float pitch = uPitch;
      vec3 f = vec3(0., sin(pitch), cos(pitch));
      vec3 r = vec3(1., 0., 0.);
      vec3 u = cross(f, r);
      vec3 rd = normalize(f * 1.6 + r * uv.x + u * uv.y);
      vec3 ro = vec3(4.0, 0., 0.);
      float g0 = 0.25 * (terrain(ro.xz + vec2(3., 0.)) + terrain(ro.xz - vec2(3., 0.)) + terrain(ro.xz + vec2(0., 3.)) + terrain(ro.xz - vec2(0., 3.)));
      ro.y = g0 + 8.5;

      vec3 col;
      float sky = 1.;
      float t = 0.4, pt = 0.4, pd = 1.;
      bool hit = false;
      for (int i = 0; i < 170; i++) {
        vec3 p = ro + rd * t;
        float d = p.y - terrain(p.xz);
        if (d < 0.0) { t = pt + (t - pt) * pd / (pd - d); hit = true; break; }
        if (rd.y > 0.0 && p.y > 12.) break;
        pt = t; pd = d;
        t += max(0.02 + t * 0.004, d * 0.5);
        if (t > 700.) break;
      }
      vec3 hz = skyColor(vec3(rd.x, 0.002, rd.z));
      if (hit) {
        vec3 p = ro + rd * t;
        vec3 n = normalAt(p.xz, t);
        // wind ripples
        float ph = dot(p.xz, vec2(0.62, 0.78)) * 7.5 + fbm3(p.xz * 0.6) * 7.;
        n = normalize(n + vec3(0.62, 0., 0.78) * cos(ph) * 0.16 * exp(-t * 0.04));
        vec3 l = normalize(L);
        float dif = max(dot(n, l), 0.);
        float sh = dif > 0. ? softShadow(p + n * 0.04, l) : 0.;
        vec3 sand = vec3(0.86, 0.60, 0.36);
        vec3 moon = vec3(0.95, 0.70, 0.45) * 0.24;
        vec3 amb = vec3(0.020, 0.018, 0.026) * (0.6 + 0.4 * n.y);
        vec3 warm = vec3(0.42, 0.22, 0.08) * 0.07 * max(dot(n, normalize(vec3(0.0, 0.25, 1.0))), 0.);
        float rim = pow(clamp(1. - max(dot(n, -rd), 0.), 0., 1.), 3.) * max(n.y, 0.);
        col = sand * (moon * dif * sh + amb + warm);
        col += vec3(0.55, 0.32, 0.14) * 0.10 * rim;
        float g = h12(floor(p.xz * 70.));
        col += vec3(1., 0.85, 0.6) * step(0.9985, g) * dif * sh * exp(-t * 0.06) * 0.8;
        float fog = 1. - exp(-t * 0.0045);
        col = mix(col, hz, fog);
        sky = 0.;
      } else {
        col = skyColor(rd);
        sky = smoothstep(0.0, 0.10, rd.y);
        col += vec3(0.8, 0.85, 1.) * pow(h12(floor(gl_FragCoord.xy)), 60.) * 0.5 * sky;
      }
      col = 1. - exp(-col * 2.1);
      col = pow(col, vec3(0.88));
      // fine film grain keeps gradients from banding
      col += (h12(gl_FragCoord.xy + 17.) - 0.5) / 255.;
      gl_FragColor = vec4(col, sky);
    }
  `;

  const STARS = COMMON + `
    uniform sampler2D uBase;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uPx;
    uniform float uFade;
    vec3 layer(vec2 px, float cell, float thresh, float seed, float bigness){
      vec2 g = px / cell; vec2 id = floor(g); vec2 f = fract(g);
      float r = h12(id + seed);
      if (r < thresh) return vec3(0.);
      vec2 pos = h22(id + seed * 1.37) * 0.8 + 0.1;
      vec2 d = (f - pos) * cell;
      float b = pow((r - thresh) / (1. - thresh), 2.6);
      float tw = 0.62 + 0.38 * sin(uTime * (0.6 + 2.6 * h12(id + 3.1)) + r * 51.);
      float sz = (0.55 + b * bigness) * uPx;
      float core = exp(-dot(d, d) / (sz * sz));
      float spike = b > 0.9 ? (exp(-abs(d.x) / (0.7 * uPx)) * exp(-d.y * d.y / (90. * uPx * uPx)) + exp(-abs(d.y) / (0.7 * uPx)) * exp(-d.x * d.x / (90. * uPx * uPx))) * 0.28 : 0.;
      vec3 c = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.88, 0.72), h12(id + 7.7));
      return c * (core + spike) * (0.32 + b * 1.9) * tw;
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec4 base = texture2D(uBase, uv);
      vec2 px = gl_FragCoord.xy;
      vec3 s = layer(px, 4.5 * uPx, 0.84, 1., 0.6)
             + layer(px, 13. * uPx, 0.80, 7., 1.3)
             + layer(px, 41. * uPx, 0.80, 19., 2.0);
      vec3 col = base.rgb + s * base.a;
      gl_FragColor = vec4(col * uFade, 1.);
    }
  `;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    const v = compile(gl, gl.VERTEX_SHADER, VERT), f = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(p)); return null; }
    return p;
  }

  /* ---------------- WebGL sky ---------------- */
  function DesertSky(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.ok = !!gl;
    if (!gl) return;
    this.gl = gl; this.canvas = canvas;
    this.scene = program(gl, SCENE); this.stars = program(gl, STARS);
    if (!this.scene || !this.stars) { this.ok = false; return; }
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.fade = 0; this.baked = false; this.bakeRow = 0;
  }
  DesertSky.prototype.resize = function (w, h, scale) {
    const gl = this.gl; if (!gl) return;
    this.scale = scale;
    const W = Math.round(w * scale), H = Math.round(h * scale);
    if (W === this.W && H === this.H) return;
    this.W = W; this.H = H; this.canvas.width = W; this.canvas.height = H;
    if (this.tex) { gl.deleteTexture(this.tex); gl.deleteFramebuffer(this.fb); }
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.baked = false; this.bakeRow = 0;
  };
  // Bake the expensive dunes a slice at a time so no single frame stalls the GPU.
  DesertSky.prototype.bakeStep = function () {
    const gl = this.gl;
    if (this.baked) return true;
    const strip = Math.max(24, Math.ceil(this.H / 10));
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.viewport(0, 0, this.W, this.H);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(0, this.bakeRow, this.W, strip);
    gl.useProgram(this.scene);
    gl.uniform2f(gl.getUniformLocation(this.scene, 'uRes'), this.W, this.H);
    gl.uniform1f(gl.getUniformLocation(this.scene, 'uPitch'), 0.07);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.bakeRow += strip;
    if (this.bakeRow >= this.H) this.baked = true;
    return this.baked;
  };
  DesertSky.prototype.draw = function (time) {
    const gl = this.gl;
    gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(this.stars);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(this.stars, 'uBase'), 0);
    gl.uniform2f(gl.getUniformLocation(this.stars, 'uRes'), this.W, this.H);
    gl.uniform1f(gl.getUniformLocation(this.stars, 'uTime'), time);
    gl.uniform1f(gl.getUniformLocation(this.stars, 'uPx'), this.scale);
    gl.uniform1f(gl.getUniformLocation(this.stars, 'uFade'), this.fade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  /* ---------------- rug constellation (a flying carpet drawn in stars) ---------------- */
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }

  // Rug pattern as polylines in the carpet's own plane (u along length, v across).
  function rugPattern(a, b) {
    const L = [];
    const loop = function (pts, order, kind) { L.push({ pts: pts, closed: true, order: order, kind: kind || 'line' }); };
    const line = function (pts, order, kind) { L.push({ pts: pts, closed: false, order: order, kind: kind || 'line' }); };
    const rect = function (iu, iv) { return [[-a + iu, -b + iv], [a - iu, -b + iv], [a - iu, b - iv], [-a + iu, b - iv]]; };
    const circle = function (cu, cv, r, n, wob, wn) { const p = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const rr = r * (1 + (wob || 0) * Math.cos(t * (wn || 8))); p.push([cu + Math.cos(t) * rr, cv + Math.sin(t) * rr]); } return p; };
    const petals = function (cu, cv, r0, R, n, w, order, kind) {
      for (let k = 0; k < n; k++) {
        const th = k / n * Math.PI * 2 + Math.PI / n;
        const p = [];
        for (let j = 0; j <= 8; j++) { const t = j / 8; const r = r0 + (R - r0) * t, o = w * Math.sin(Math.PI * t); p.push([cu + Math.cos(th + o) * r, cv + Math.sin(th + o) * r]); }
        for (let j = 7; j >= 1; j--) { const t = j / 8; const r = r0 + (R - r0) * t, o = -w * Math.sin(Math.PI * t); p.push([cu + Math.cos(th + o) * r, cv + Math.sin(th + o) * r]); }
        loop(p, order + k * 0.012, kind || 'petal');
      }
    };
    // medallion: an eight-petal rosette inside an eight-pointed star
    const R = b * 0.46;
    loop(circle(0, 0, R * 0.16, 12), 0.0, 'core');
    petals(0, 0, R * 0.16, R, 8, 0.34, 0.03);
    const star = []; for (let k = 0; k < 8; k++) { const th = (k * 3) % 8 / 8 * Math.PI * 2 + Math.PI / 8; star.push([Math.cos(th) * R * 1.1, Math.sin(th) * R * 1.1]); }
    loop(star, 0.16, 'star');
    loop(circle(0, 0, R * 1.32, 32, 0.05, 16), 0.24);
    loop([[-a * 0.6, 0], [0, -b * 0.8], [a * 0.6, 0], [0, b * 0.8]], 0.34);
    // pendants and side rosettes
    [-1, 1].forEach(function (d) {
      line([[d * R * 1.32, 0], [d * a * 0.6, 0]], 0.36);
      petals(d * a * 0.76, 0, b * 0.05, b * 0.24, 6, 0.42, 0.44);
      loop(circle(d * a * 0.76, 0, b * 0.29, 18), 0.5);
      [-1, 1].forEach(function (e) {
        petals(d * a * 0.36, e * b * 0.56, b * 0.03, b * 0.13, 6, 0.45, 0.52, 'tiny');
      });
    });
    // borders, from the inside out
    loop(rect(b * 0.24, b * 0.24), 0.62);
    loop(rect(b * 0.19, b * 0.19), 0.66);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
      const cu = c[0] * (a - b * 0.24), cv = c[1] * (b - b * 0.24), r = b * 0.36, p = [];
      for (let j = 0; j <= 10; j++) { const t = j / 10 * Math.PI / 2; p.push([cu - c[0] * Math.cos(t) * r, cv - c[1] * Math.sin(t) * r]); }
      line(p, 0.7, 'corner');
    });
    loop(rect(b * 0.06, b * 0.06), 0.82);
    loop(rect(0, 0), 0.88, 'outer');
    // fringes hang off both short ends
    const fr = [];
    [-1, 1].forEach(function (d) {
      for (let k = 0; k < 18; k++) {
        const v = -b + (k + 0.5) * (2 * b / 18);
        fr.push({ u: d * a, v: v, d: d, k: k });
      }
    });
    return { lines: L, fringes: fr, R: R };
  }

  function glowSprite(size, rgb) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.1, 'rgba(' + rgb + ',0.9)'); g.addColorStop(0.3, 'rgba(' + rgb + ',0.25)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size); return c;
  }
  function easeSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function easeSineInv(y) { return Math.acos(1 - 2 * y) / Math.PI; }
  function smooth01(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  // frame-rate independent approach factor
  function damp(rate, dt) { return 1 - Math.exp(-rate * dt); }

  function Constellation(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.sprite = glowSprite(64, '255,240,214');
    this.goldSprite = glowSprite(64, '236,186,96');
    this.mouse = { x: -1e4, y: -1e4, in: false };
    this.hover = 0; this.ripples = []; this.cur = null; this.lastRip = null;
    this.phase = 0; this.fphase = 0; this.time = 0;
    this.shooting = null; this.nextShoot = 3.4;
  }
  Constellation.prototype.resize = function (W, H, dpr) {
    this.W = W; this.H = H; this.dpr = dpr;
    this.c.width = Math.round(W * dpr); this.c.height = Math.round(H * dpr);
    this.c.style.width = W + 'px'; this.c.style.height = H + 'px';
    const portrait = W / H < 0.82;
    const a = portrait ? Math.min(W * 0.4, H * 0.3) : Math.min(W * 0.37, H * 0.62, 620);
    const b = a * 0.52;
    this.cam = {
      a: a, b: b, cx: W * (portrait ? 0.5 : 0.47), cy: H * (portrait ? 0.3 : 0.32),
      tilt: portrait ? 0.8 : 0.94, roll: portrait ? 0.12 : 0.16, yaw: portrait ? -0.05 : -0.18, F: a * 4.4,
    };
    const pat = rugPattern(a, b);
    let seed = 2024;
    const rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const nodes = [], lines = [];
    // bead stars along every line, evenly spaced, with brighter stars at the corners
    pat.lines.forEach(function (pl) {
      const sp = pl.kind === 'tiny' ? a * 0.05 : pl.kind === 'petal' || pl.kind === 'core' ? a * 0.034 : a * 0.028;
      const pts = pl.pts, n = pts.length, seg = pl.closed ? n : n - 1;
      const ids = [];
      for (let i = 0; i < seg; i++) {
        const p0 = pts[i], p1 = pts[(i + 1) % n];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        const steps = Math.max(1, Math.round(len / sp));
        for (let s = 0; s < steps; s++) {
          const t = s / steps, vertex = s === 0;
          let br = vertex ? (pl.kind === 'petal' ? 0.35 : pl.kind === 'tiny' ? 0.2 : pl.kind === 'star' || pl.kind === 'outer' ? 0.95 : 0.55) : pl.kind === 'tiny' ? 0.06 : 0.12 + rnd() * 0.2;
          if (pl.kind === 'petal' && vertex && i === 8) br = 0.9; // petal tips
          ids.push(nodes.length);
          nodes.push({ u: p0[0] + (p1[0] - p0[0]) * t, v: p0[1] + (p1[1] - p0[1]) * t, br: br, order: pl.order, litAt: 1e9, small: pl.kind === 'tiny' });
        }
      }
      if (!pl.closed) { const p = pts[n - 1]; ids.push(nodes.length); nodes.push({ u: p[0], v: p[1], br: 0.6, order: pl.order, litAt: 1e9 }); }
      const ln = { ids: ids, closed: pl.closed, order: pl.order, start: pl.order * 2.2, dur: 0.7 + ids.length * 0.012 };
      // each star ignites the moment the thread reaches it
      const segs = pl.closed ? ids.length : ids.length - 1;
      ids.forEach(function (id, i) { const at = ln.start + ln.dur * easeSineInv(Math.min(1, i / segs)); if (at < nodes[id].litAt) nodes[id].litAt = at; });
      lines.push(ln);
    });
    nodes.push({ u: 0, v: 0, br: 1.6, order: 0, litAt: 0 }); // the heart of the medallion
    const fringes = pat.fringes.map(function (f) {
      const base = nodes.length; nodes.push({ u: f.u, v: f.v, br: 0.4, order: 0.93, litAt: 0.93 * 2.2 + 0.3 });
      return { base: base, d: f.d, k: f.k };
    });
    // every rug star starts as an ordinary star a little way off, then settles into the pattern
    nodes.forEach(function (n) {
      const ang = rnd() * Math.PI * 2, r = a * (0.025 + rnd() * 0.07);
      n.ox = Math.cos(ang) * r; n.oy = Math.sin(ang) * r;
      n.delay = n.order * 1.0 + rnd() * 0.5;
      n.tw = rnd() * 10; n.twf = 0.9 + rnd() * 1.8;
      n.faint = 0.18 + rnd() * 0.22;
    });
    this.rug = { nodes: nodes, lines: lines, fringes: fringes, portrait: portrait };
    this.project();
    let maxY = 0; nodes.forEach(function (n) { if (n.by > maxY) maxY = n.by; });
    this.rug.bottom = Math.min(H * 0.8, maxY + b * 0.3);
  };
  // project the carpet plane (with its wave) into screen space
  Constellation.prototype.proj = function (u, v, h) {
    const c = this.cam;
    const cp = Math.cos(c.tilt), sp = Math.sin(c.tilt), cr = Math.cos(c.roll), sr = Math.sin(c.roll), cq = Math.cos(c.yaw), sq = Math.sin(c.yaw);
    const x = u, y = -v * cp - h * sp, z = v * sp - h * cp;
    const x1 = x * cr - y * sr, y1 = x * sr + y * cr;
    const x2 = x1 * cq + z * sq, z2 = -x1 * sq + z * cq;
    const k = c.F / (c.F + z2);
    return [c.cx + x2 * k, c.cy + y1 * k, k];
  };
  // exact inverse of proj() on the flat carpet plane: screen point → (u, v)
  Constellation.prototype.unproj = function (X, Y) {
    const c = this.cam, F = c.F;
    const cp = Math.cos(c.tilt), sp = Math.sin(c.tilt), cr = Math.cos(c.roll), sr = Math.sin(c.roll), cq = Math.cos(c.yaw), sq = Math.sin(c.yaw);
    const dx = X - c.cx, dy = Y - c.cy;
    // x2 = Ax·u + Bx·v,  y1 = Ay·u + By·v,  z2 = Az·u + Bz·v
    const Ax = cr * cq, Bx = cp * sr * cq + sp * sq;
    const Ay = sr, By = -cp * cr;
    const Az = -cr * sq, Bz = -cp * sr * sq + sp * cq;
    const a11 = dx * Az - F * Ax, a12 = dx * Bz - F * Bx, a21 = dy * Az - F * Ay, a22 = dy * Bz - F * By;
    const det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-6) return null;
    const r1 = -dx * F, r2 = -dy * F;
    return { u: (r1 * a22 - a12 * r2) / det, v: (a11 * r2 - r1 * a21) / det };
  };
  Constellation.prototype.waveAt = function (u, v) {
    const c = this.cam, a = c.a, b = c.b, H = this.hover;
    // a slow flying-carpet swell, a little livelier at the two ends
    const ends = 0.45 + 0.55 * Math.pow(Math.abs(u / a), 1.5);
    let h = a * (0.011 + 0.02 * H) * ends * Math.sin(u / a * 2.3 - this.phase + v / b * 0.5);
    h += a * 0.004 * Math.sin(v / b * 2.4 + this.phase * 0.7);
    // the cloth lifts softly under the pointer
    if (this.cur && H > 0.001) {
      const du = u - this.cur.u, dv = v - this.cur.v;
      h += a * 0.045 * H * Math.exp(-(du * du + dv * dv) / (a * a * 0.1));
    }
    // ripples spread out like a shaken sheet: one soft crest, eased in and damped out
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i], age = this.time - r.t;
      const d = Math.hypot(u - r.u, v - r.v), w = a * 0.17;
      const x = (d - age * a * 0.5) / w;
      h += r.amp * Math.exp(-x * x) * Math.cos(x * 1.6) * Math.exp(-age / 1.6) * smooth01(age / 0.4);
    }
    return h;
  };
  Constellation.prototype.project = function () {
    const self = this;
    this.rug.nodes.forEach(function (n) {
      const p0 = self.proj(n.u, n.v, 0);
      n.bx = p0[0]; n.by = p0[1];
      const p = self.proj(n.u, n.v, self.waveAt(n.u, n.v));
      n.px = p[0]; n.py = p[1]; n.k = p[2];
    });
  };
  Constellation.prototype.onCarpet = function (X, Y) {
    const q = this.unproj(X, Y);
    return q && Math.abs(q.u) < this.cam.a * 1.08 && Math.abs(q.v) < this.cam.b * 1.15 ? q : null;
  };
  Constellation.prototype.poke = function (X, Y, t, strong) {
    const q = this.onCarpet(X, Y);
    if (!q) return;
    this.ripples.push({ u: q.u, v: q.v, t: this.time, amp: this.cam.a * (strong ? 0.055 : 0.02) });
    if (this.ripples.length > 6) this.ripples.shift();
  };
  Constellation.prototype.draw = function (t, T, dt) {
    const ctx = this.ctx, rug = this.rug, dpr = this.dpr, self = this, a = this.cam.a;
    this.time = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    ctx.globalCompositeOperation = 'lighter';
    const appear = smooth01((t - T.appear) / 2.2);
    const gatherT = t - T.gather, traceT = t - T.trace, shineT = t - T.shine;

    // pointer: eased hover, smoothed position on the cloth, gentle wake ripples
    const ready = traceT > 1.5;
    const q = ready && this.mouse.in ? this.onCarpet(this.mouse.x, this.mouse.y) : null;
    this.hover += ((q ? 1 : 0) - this.hover) * damp(2.2, dt);
    if (q) {
      if (!this.cur) this.cur = { u: q.u, v: q.v };
      this.cur.u += (q.u - this.cur.u) * damp(5, dt); this.cur.v += (q.v - this.cur.v) * damp(5, dt);
      if (!this.lastRip || Math.hypot(this.cur.u - this.lastRip.u, this.cur.v - this.lastRip.v) > a * 0.14) {
        this.ripples.push({ u: this.cur.u, v: this.cur.v, t: t, amp: a * 0.018 });
        if (this.ripples.length > 6) this.ripples.shift();
        this.lastRip = { u: this.cur.u, v: this.cur.v };
      }
    } else this.lastRip = null;
    this.ripples = this.ripples.filter(function (r) { return t - r.t < 5; });
    this.c.style.cursor = q ? 'pointer' : '';
    // phases are integrated, so changing speed never makes the cloth jump
    this.phase += dt * (1.0 + 0.45 * this.hover);
    this.fphase += dt * (1.4 + 0.8 * this.hover);

    this.project();
    rug.nodes.forEach(function (n) {
      const k = easeSine(clamp01((gatherT - n.delay) / 2.4));
      n.settle = k;
      n.x = n.px + n.ox * (1 - k); n.y = n.py + n.oy * (1 - k);
    });

    // light rolls out from the medallion once the carpet is complete
    const shineAt = function (order) { if (shineT < 0) return 0; return Math.exp(-Math.pow((order - shineT * 0.55) / 0.13, 2)); };
    const breathe = shineT > 0 ? 0.92 + 0.08 * Math.sin(t * 1.1) : 1;
    const glowBase = (0.72 + this.hover * 0.25) * breathe;

    // threads
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const full = new Path2D(), part = new Path2D();
    const heads = [];
    rug.lines.forEach(function (ln) {
      const raw = clamp01((traceT - ln.start) / ln.dur);
      if (raw <= 0) return;
      const p = easeSine(raw);
      const ids = ln.ids, n = ln.closed ? ids.length : ids.length - 1;
      const upto = p * n;
      const path = raw >= 1 ? full : part;
      for (let i = 0; i < Math.ceil(upto); i++) {
        const A = rug.nodes[ids[i]], B = rug.nodes[ids[(i + 1) % ids.length]];
        const f = Math.min(1, upto - i);
        path.moveTo(A.x, A.y); path.lineTo(A.x + (B.x - A.x) * f, A.y + (B.y - A.y) * f);
        if (f < 1) heads.push([A.x + (B.x - A.x) * f, A.y + (B.y - A.y) * f]);
      }
    });
    // fringes: strands that sway with the cloth
    const fr = new Path2D();
    const frP = smooth01((traceT - 0.93 * 2.2) / 1.2);
    if (frP > 0) {
      rug.fringes.forEach(function (f) {
        const B = rug.nodes[f.base];
        const len = self.cam.b * 0.36 * B.k * frP;
        const sway = Math.sin(self.fphase + f.k * 0.6) * len * (0.14 + self.hover * 0.12);
        const out = f.d * len * 0.3;
        fr.moveTo(B.x, B.y); fr.quadraticCurveTo(B.x + out, B.y + len * 0.5, B.x + out * 1.2 + sway, B.y + len);
        f.tx = B.x + out * 1.2 + sway; f.ty = B.y + len;
      });
    }
    ctx.strokeStyle = 'rgba(214,170,92,' + (0.07 * glowBase) + ')'; ctx.lineWidth = 4;
    ctx.stroke(full); ctx.stroke(part);
    ctx.strokeStyle = 'rgba(244,222,184,' + (0.36 * glowBase) + ')'; ctx.lineWidth = 0.8;
    ctx.stroke(full); ctx.stroke(part);
    ctx.strokeStyle = 'rgba(244,222,184,' + (0.45 * glowBase * frP) + ')'; ctx.lineWidth = 0.8; ctx.stroke(fr);
    ctx.globalAlpha = 0.55;
    heads.forEach(function (h) { ctx.drawImage(self.goldSprite, h[0] - 8, h[1] - 8, 16, 16); });
    ctx.globalAlpha = 1;

    // stars: faint like the rest of the sky, then they ignite as the thread reaches them
    const mx = this.mouse.x, my = this.mouse.y;
    rug.nodes.forEach(function (n) {
      const tw = 0.65 + 0.35 * Math.sin(t * n.twf + n.tw);
      const since = traceT - n.litAt;
      const lit = smooth01(since / 0.6);
      const flare = since > 0 ? Math.exp(-Math.pow((since - 0.3) / 0.28, 2)) * (n.small ? 0.25 : 0.7) : 0;
      const near = self.hover > 0.01 ? Math.max(0, 1 - Math.hypot(n.x - mx, n.y - my) / (a * 0.3)) * self.hover : 0;
      const sh = shineAt(n.order);
      const br = n.faint + (0.2 + n.br) * lit + flare + sh * 0.9 + near * 0.6;
      const s = (2 + br * 5.5) * (0.85 + 0.25 * tw) * (n.k || 1) * (n.small ? 0.6 : 1);
      ctx.globalAlpha = Math.min(1, appear * (0.5 + 0.5 * tw) * (0.55 + br * 0.55));
      ctx.drawImage(self.sprite, n.x - s / 2, n.y - s / 2, s, s);
      if (n.br > 0.85 && lit > 0.9) {
        const L = (4 + n.br * 7) * (0.75 + 0.25 * tw) * (1 + sh * 0.8 + near * 0.6);
        ctx.globalAlpha = Math.min(1, 0.4 * (0.7 + sh + near));
        ctx.strokeStyle = 'rgba(255,238,208,1)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(n.x - L, n.y); ctx.lineTo(n.x + L, n.y); ctx.moveTo(n.x, n.y - L); ctx.lineTo(n.x, n.y + L); ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    if (frP > 0.3) { ctx.globalAlpha = frP; rug.fringes.forEach(function (f) { ctx.drawImage(self.sprite, f.tx - 3, f.ty - 3, 6, 6); }); ctx.globalAlpha = 1; }

    // shooting star now and then
    if (t > this.nextShoot && !this.shooting) {
      const sx = this.W * (0.15 + Math.random() * 0.7), sy = this.H * (0.04 + Math.random() * 0.18);
      this.shooting = { x: sx, y: sy, t0: t, ang: Math.PI * (0.8 + Math.random() * 0.12), len: 150 + Math.random() * 120 };
      this.nextShoot = t + 8 + Math.random() * 9;
    }
    if (this.shooting) {
      const s = this.shooting, k = (t - s.t0) / 0.9;
      if (k > 1) this.shooting = null;
      else {
        const hx = s.x + Math.cos(s.ang) * s.len * 1.6 * k, hy = s.y + Math.sin(s.ang) * s.len * 1.6 * k;
        const tx = hx - Math.cos(s.ang) * s.len * Math.min(1, k * 2), ty = hy - Math.sin(s.ang) * s.len * Math.min(1, k * 2);
        const g = ctx.createLinearGradient(tx, ty, hx, hy);
        const al = Math.sin(k * Math.PI);
        g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(1, 'rgba(255,248,230,' + 0.8 * al + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------------- orchestration ---------------- */
  function Hero(opts) {
    this.root = opts.root;
    this.glCanvas = opts.glCanvas; this.overlay = opts.overlay; this.stage = opts.stage;
    this.onTitle = opts.onTitle || function () {};
    this.sky = new DesertSky(this.glCanvas);
    this.con = new Constellation(this.overlay);
    this.T = { appear: 1.0, gather: 3.8, trace: 6.0, shine: 9.7, title: 10.2 };
    this.start = null; this.offset = 0; this.titled = false; this.visible = true;
    if (!this.sky.ok) this.root.classList.add('no-webgl');
    const self = this;
    this.resize();
    addEventListener('resize', function () { clearTimeout(self._rz); self._rz = setTimeout(function () { self.resize(); }, 150); });
    this.root.addEventListener('pointermove', function (e) { const r = self.overlay.getBoundingClientRect(); self.con.mouse.x = e.clientX - r.left; self.con.mouse.y = e.clientY - r.top; self.con.mouse.in = true; });
    this.root.addEventListener('pointerleave', function () { self.con.mouse.in = false; self.con.mouse.x = -1e4; });
    this.overlay.addEventListener('pointerdown', function (e) { const r = self.overlay.getBoundingClientRect(); self.con.poke(e.clientX - r.left, e.clientY - r.top, self.elapsed(), true); });
    new IntersectionObserver(function (en) { self.visible = en[0].isIntersecting; if (self.visible) self.loop(); }).observe(this.root);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) this.skip();
    this.loop();
  }
  Hero.prototype.resize = function () {
    const W = this.root.clientWidth, H = this.root.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.H = H;
    this.glCanvas.style.height = (H * 1.25) + 'px';
    if (this.sky.ok) this.sky.resize(W, H * 1.25, Math.min(dpr, W < 700 ? 1.5 : 1.25));
    this.con.resize(W, H, dpr);
    this.root.style.setProperty('--title-top', Math.round(this.con.rug.bottom) + 'px');
  };
  Hero.prototype.skip = function () {
    this.offset = this.T.title + 0.5 - this.elapsed();
    this.root.classList.add('is-skipped');
  };
  Hero.prototype.replay = function () {
    this.start = performance.now(); this.offset = this.T.gather - 0.2; this.titled = false;
    this.root.classList.remove('is-titled');
  };
  Hero.prototype.elapsed = function () { return this.start == null ? 0 : (performance.now() - this.start) / 1000 + this.offset; };
  Hero.prototype.loop = function () {
    if (this._raf) return;
    const self = this;
    const frame = function () {
      self._raf = null;
      if (!self.visible) return;
      if (self.sky.ok && !self.sky.baked) {
        self.sky.bakeStep();
        if (!self.sky.baked) { self._raf = requestAnimationFrame(frame); return; }
      }
      if (self.start == null) self.start = performance.now();
      const t = self.elapsed();
      const dt = Math.min(0.1, Math.max(0, t - (self._lt || t))); self._lt = t;
      // camera tilts up from the dunes to the sky during the first five seconds
      const tilt = easeInOut(clamp01((t - 0.2) / 4.6));
      const shift = 'translate3d(0,' + (-(1 - tilt) * self.H * 0.25) + 'px,0)';
      self.glCanvas.style.transform = shift;
      // the rug's stars ride with the sky while the camera tilts up, so they read as part of it
      self.overlay.style.transform = shift;
      if (self.sky.ok) { self.sky.fade = easeOut(clamp01(t / 1.6)); self.sky.draw(t); }
      self.root.style.setProperty('--intro', String(clamp01(t / 1.6)));
      self.con.draw(t, self.T, dt);
      if (!self.titled && t >= self.T.title) { self.titled = true; self.root.classList.add('is-titled'); self.onTitle(); }
      self._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  };

  global.SetareHero = Hero;
})(window);
