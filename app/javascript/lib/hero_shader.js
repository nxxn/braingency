import { reducedMotion, smallScreen } from "./env";

// A domain-warped FBM field rendered into the hero. Raw WebGL — no three.js —
// on a single fullscreen triangle, drawn at a fraction of device resolution
// because the result is a soft nebula and upscaling costs nothing visually.
//
// If anything here is unavailable or unwelcome (reduced motion, small screen,
// no WebGL, tab hidden, hero scrolled away) the canvas simply never runs and
// the CSS fallback underneath it stands in.

const VERT = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_pointer;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i),                hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amp * noise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float t = u_time * 0.028;

  // Domain warping gives the field its slow, folded drift.
  vec2 p = uv * 2.4;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  float f = fbm(p + 1.7 * q + vec2(1.7, 9.2));

  // The pointer lifts the field locally, so the surface answers the cursor.
  float pull = exp(-length(uv - u_pointer) * 3.0);
  f += 0.05 * pull;

  vec3 base = vec3(0.031, 0.035, 0.039);
  vec3 lime = vec3(0.796, 1.000, 0.302);

  // Contour lines through the field — a topographic read, not a fog.
  float contour = smoothstep(0.055, 0.0, abs(fract(f * 5.0) - 0.5));
  float bloom = pow(smoothstep(0.45, 0.95, f), 3.0);

  // Confine the whole thing to the upper right so headline and buttons keep
  // their contrast against flat page black.
  float region = smoothstep(1.15, 0.05, length((uv - vec2(0.46, 0.18)) * vec2(0.82, 1.0)));

  vec3 col = base;
  col += lime * contour * 0.155 * region;
  col += lime * bloom * 0.022 * region;
  col += lime * pull * 0.020;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[hero] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function heroShader() {
  const canvas = document.querySelector("[data-hero-canvas]");
  if (!canvas) return;

  if (reducedMotion() || smallScreen()) return;

  const gl =
    canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" }) ||
    canvas.getContext("experimental-webgl", { alpha: false, antialias: false });
  if (!gl) return;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[hero] program link failed:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // Single triangle that covers the clip volume — cheaper than two.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uPointer = gl.getUniformLocation(program, "u_pointer");

  // 0.55 of CSS pixels: the field is soft, so the upscale is invisible and the
  // fragment count drops by ~3x.
  const SCALE = 0.55;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    const width = Math.max(1, Math.floor(w * SCALE));
    const height = Math.max(1, Math.floor(h * SCALE));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uResolution, width, height);
  };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const onPointerMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.tx = (event.clientX - rect.left - rect.width / 2) / rect.height;
    pointer.ty = -(event.clientY - rect.top - rect.height / 2) / rect.height;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  let raf = null;
  let visible = true;
  let start = performance.now();
  let elapsed = 0;
  let last = start;

  const frame = (now) => {
    // Accumulate our own clock so pausing never jumps the animation.
    elapsed += Math.min(now - last, 50) / 1000;
    last = now;

    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    resize();
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(frame);
  };

  const play = () => {
    if (raf !== null || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const pause = () => {
    if (raf === null) return;
    cancelAnimationFrame(raf);
    raf = null;
  };

  // Stop when the hero leaves the viewport or the tab goes to the background.
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? play() : pause();
  }, { threshold: 0 });
  io.observe(canvas);

  document.addEventListener("visibilitychange", () => {
    document.hidden ? pause() : play();
  });

  window.addEventListener("resize", resize, { passive: true });

  canvas.dataset.heroActive = "true";
  play();
}
