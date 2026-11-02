/* =========================================================
   Celebration: confetti bursts and the candle ritual
   ========================================================= */

(function () {
  "use strict";

  var App = window.App;
  if (!App) return;

  var colors = ["#e6c79f", "#f7e4c6", "#e3a6a9", "#b3747f", "#f5eee5"];

  var canvas = null;
  var ctx = null;
  var particles = [];
  var running = false;
  var dpr = 1;

  function ensureCanvas() {
    if (canvas && ctx) return;

    canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame() {
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];

      p.vy += p.gravity;
      p.vx *= 0.992;
      p.vy *= 0.994;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life -= 1;

      var alpha = Math.max(0, Math.min(1, p.life / 40));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.heart) {
        ctx.font = p.size * 4 + "px serif";
        ctx.textAlign = "center";
        ctx.fillText("\u2665", 0, 0);
      } else if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }

      ctx.restore();

      if (p.life <= 0 || p.y > window.innerHeight + 60) {
        particles.splice(i, 1);
      }
    }

    if (particles.length) {
      window.requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  App.burst = function (x, y, options) {
    var opts = options || {};
    if (App.reduce) return;

    ensureCanvas();

    var count = opts.count || 80;
    var power = opts.power || 3;
    var spread = opts.spread || 1;

    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = (0.6 + Math.random() * 1.6) * power;
      var heart = !!opts.hearts && Math.random() > 0.45;

      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed * spread,
        vy: Math.sin(angle) * speed - Math.random() * 1.6,
        gravity: 0.055 + Math.random() * 0.05,
        size: heart ? 4 + Math.random() * 4 : 4 + Math.random() * 7,
        color: colors[(Math.random() * colors.length) | 0],
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2,
        life: 90 + Math.random() * 70,
        round: Math.random() > 0.6,
        heart: heart
      });
    }

    if (!running) {
      running = true;
      window.requestAnimationFrame(frame);
    }
  };

  /* ---------- the cake ---------- */

  function initCake() {
    var cake = App.qs("[data-cake]");
    if (!cake) return;

    var candles = App.qsa("[data-candle]", cake);
    var hint = App.qs("[data-cake-hint]");
    var allBtn = App.qs("[data-cake-all]");
    var after = document.getElementById("cake-after");
    var out = 0;

    function finish() {
      if (hint) hint.textContent = "Wish sent. I hope it is enormous.";
      if (allBtn) allBtn.hidden = true;
      cake.classList.add("is-wished");

      var rect = cake.getBoundingClientRect();
      App.burst(rect.left + rect.width / 2, rect.top + rect.height * 0.25, {
        count: App.reduce ? 0 : 120,
        power: 4,
        spread: 1.2
      });

      if (!after) return;

      after.hidden = false;

      if (App.motion) {
        window.gsap.fromTo(after, { opacity: 0 }, { opacity: 1, duration: 0.7, delay: 0.35 });
        window.setTimeout(function () {
          App.scrollTo(after, -80);
        }, 950);
      }
    }

    function blow(candle) {
      if (!candle || candle.classList.contains("is-out")) return;

      candle.classList.add("is-out");
      candle.setAttribute("aria-pressed", "true");
      candle.setAttribute("aria-label", "Candle blown out");

      out++;

      var rect = candle.getBoundingClientRect();
      App.burst(rect.left + rect.width / 2, rect.top, {
        count: App.reduce ? 0 : 16,
        power: 1.5,
        spread: 0.7
      });

      if (out === candles.length) finish();
    }

    candles.forEach(function (candle) {
      candle.addEventListener("click", function () {
        blow(candle);
      });
    });

    if (allBtn) {
      allBtn.addEventListener("click", function () {
        candles.forEach(function (candle, i) {
          window.setTimeout(function () {
            blow(candle);
          }, i * 130);
        });
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key !== "b" && event.key !== "B") return;
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      var next = candles.find(function (candle) {
        return !candle.classList.contains("is-out");
      });
      if (next) blow(next);
    });
  }

  App.initCake = initCake;
})();
