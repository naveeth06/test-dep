/* =========================================================
   Scene: a quiet starfield and a heart made of light (Three.js)
   Runs only on the welcome page, only when motion is welcome.
   ========================================================= */

(function () {
  "use strict";

  var THREE = window.THREE;
  var App = window.App;
  var canvas = document.getElementById("scene");
  if (!THREE || !App || !canvas) return;

  var renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance"
    });
  } catch (error) {
    return;
  }

  var mobile = window.matchMedia("(max-width: 820px)").matches;
  var root = document.documentElement;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  camera.position.set(0, 0, 6.4);

  /* a soft round sprite so points glow instead of sitting as hard squares */
  function makeSpark() {
    var size = 64;
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var ctx = c.getContext("2d");
    var gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.22, "rgba(255,240,214,0.92)");
    gradient.addColorStop(0.55, "rgba(255,206,160,0.32)");
    gradient.addColorStop(1, "rgba(255,190,150,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    var texture = new THREE.CanvasTexture(c);
    texture.needsUpdate = true;
    return texture;
  }

  var spark = makeSpark();

  /* ---------- stars ---------- */

  var starCount = mobile ? 650 : 1500;
  var starGeo = new THREE.BufferGeometry();
  var starPos = new Float32Array(starCount * 3);
  var starCol = new Float32Array(starCount * 3);
  var goldColor = new THREE.Color("#e6c79f");
  var ivoryColor = new THREE.Color("#f5eee5");

  for (var s = 0; s < starCount; s++) {
    starPos[s * 3] = (Math.random() - 0.5) * 28;
    starPos[s * 3 + 1] = (Math.random() - 0.5) * 17;
    starPos[s * 3 + 2] = -12 + Math.random() * 11;

    var mix = Math.random();
    var color = mix > 0.82 ? goldColor : ivoryColor;
    starCol[s * 3] = color.r;
    starCol[s * 3 + 1] = color.g;
    starCol[s * 3 + 2] = color.b;
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));

  var starMat = new THREE.PointsMaterial({
    size: mobile ? 0.05 : 0.042,
    map: spark,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  var stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- the heart ---------- */

  var heartCount = mobile ? 1300 : 2400;
  var heartGeo = new THREE.BufferGeometry();
  var heartPos = new Float32Array(heartCount * 3);
  var heartCol = new Float32Array(heartCount * 3);
  var roseColor = new THREE.Color("#e3a6a9");
  var paleGold = new THREE.Color("#f7e4c6");

  for (var h = 0; h < heartCount; h++) {
    var t = Math.random() * Math.PI * 2;
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

    /* bias points toward the surface so the silhouette reads */
    var radius = 0.55 + Math.pow(Math.random(), 0.4) * 0.45;
    var depth = (Math.random() - 0.5) * 0.5 * (1 - radius * 0.55);

    heartPos[h * 3] = x * 0.062 * radius;
    heartPos[h * 3 + 1] = y * 0.062 * radius;
    heartPos[h * 3 + 2] = depth;

    var pick = Math.random();
    var tint = pick > 0.86 ? roseColor : pick > 0.35 ? goldColor : paleGold;
    heartCol[h * 3] = tint.r;
    heartCol[h * 3 + 1] = tint.g;
    heartCol[h * 3 + 2] = tint.b;
  }

  heartGeo.setAttribute("position", new THREE.BufferAttribute(heartPos, 3));
  heartGeo.setAttribute("color", new THREE.BufferAttribute(heartCol, 3));

  var heartMat = new THREE.PointsMaterial({
    size: mobile ? 0.036 : 0.032,
    map: spark,
    vertexColors: true,
    transparent: true,
    opacity: mobile ? 0.6 : 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  var heartGroup = new THREE.Group();
  var heartPoints = new THREE.Points(heartGeo, heartMat);
  heartGroup.add(heartPoints);

  /* a wide halo behind the heart */
  var haloMat = new THREE.SpriteMaterial({
    map: makeSpark(),
    color: new THREE.Color("#e3a6a9"),
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var halo = new THREE.Sprite(haloMat);
  halo.scale.set(4.4, 4.4, 1);
  halo.position.z = -0.6;
  heartGroup.add(halo);

  scene.add(heartGroup);

  var heartBase = 1;
  var baseY = 0.1;

  /* ---------- sizing ---------- */

  function resize() {
    var width = canvas.clientWidth || window.innerWidth;
    var height = canvas.clientHeight || window.innerHeight;
    var aspect = width / height;

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);

    if (aspect > 1.5) {
      /* desktop: the heart sits beside the headline */
      heartGroup.position.set(2.2, 0.05, 0);
      baseY = 0.05;
      heartBase = 1;
      heartMat.opacity = 0.92;
      halo.scale.set(4.4, 4.4, 1);
    } else if (aspect > 1.05) {
      /* tablet: pull it in */
      heartGroup.position.set(1.5, 0.3, 0);
      baseY = 0.3;
      heartBase = 0.78;
      heartMat.opacity = 0.72;
      halo.scale.set(3.8, 3.8, 1);
    } else {
      /* phone: a quiet halo behind the headline */
      heartGroup.position.set(0, 0.62, 0);
      baseY = 0.62;
      heartBase = 0.82;
      heartMat.opacity = 0.55;
      halo.scale.set(3.6, 3.6, 1);
    }

    heartGroup.scale.setScalar(heartBase);
  }

  window.addEventListener("resize", resize);
  resize();

  /* ---------- pointer + scroll ---------- */

  var pointer = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };

  window.addEventListener(
    "pointermove",
    function (event) {
      target.x = (event.clientX / window.innerWidth) * 2 - 1;
      target.y = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  /* ---------- render ---------- */

  var startTime = performance.now();
  var rendered = false;

  function render() {
    if (document.hidden) return;

    /* own clock: gsap.ticker passes seconds, rAF passes milliseconds */
    var clockTime = (performance.now() - startTime) * 0.001;

    pointer.x += (target.x - pointer.x) * 0.045;
    pointer.y += (target.y - pointer.y) * 0.045;

    var scrollShift = Math.min(window.scrollY || 0, 900) * 0.00055;

    heartGroup.rotation.y = Math.sin(clockTime * 0.24) * 0.3 + pointer.x * 0.34;
    heartGroup.rotation.x = Math.sin(clockTime * 0.18) * 0.09 - pointer.y * 0.2;
    heartGroup.position.y = baseY + scrollShift + Math.sin(clockTime * 0.7) * 0.03;

    stars.rotation.y = clockTime * 0.011 + pointer.x * 0.04;
    stars.rotation.x = pointer.y * 0.03;

    var breathe = heartBase * (1 + Math.sin(clockTime * 0.72) * 0.014);
    heartGroup.scale.setScalar(breathe);
    haloMat.opacity = 0.18 + Math.sin(clockTime * 0.9) * 0.04;

    renderer.render(scene, camera);

    if (!rendered) {
      rendered = true;
      root.classList.add("scene-ready");
    }
  }

  if (App.reduce) {
    /* one calm frame, no loop */
    render();
    return;
  }

  if (window.gsap && window.gsap.ticker) {
    window.gsap.ticker.add(render);
  } else {
    var loop = function () {
      render();
      window.requestAnimationFrame(loop);
    };
    window.requestAnimationFrame(loop);
  }

  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
  });
})();
