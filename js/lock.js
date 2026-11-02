/* =========================================================
   Lock screen: countdown, cute decorations, promise button,
   and the in-place unlock at local midnight on November 4.
   ========================================================= */

(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lock = window.BDAY_LOCK || {};
  var birthday = lock.birthday || { month: 11, day: 4 };

  var els = {
    days: document.querySelector('[data-lc="days"]'),
    hours: document.querySelector('[data-lc="hours"]'),
    minutes: document.querySelector('[data-lc="minutes"]'),
    seconds: document.querySelector('[data-lc="seconds"]'),
    sr: document.querySelector("[data-lock-sr]"),
    card: document.querySelector("[data-lock-card]"),
    lockStage: document.querySelector("[data-lock-stage]"),
    revealStage: document.querySelector("[data-reveal-stage]"),
    welcomeTitle: document.querySelector("[data-welcome-title]"),
    enter: document.querySelector("[data-enter]"),
    promise: document.querySelector("[data-promise]"),
    promiseLabel: document.querySelector("[data-promise-label]"),
    promiseNote: document.querySelector("[data-promise-note]"),
    gift: document.querySelector("[data-gift]"),
    bears: document.querySelector(".secret-card")
  };

  var revealed = false;
  var srTicks = 0;
  var tickTimer = null;
  var demoMode = /[?&]unlocked(?:[=&]|$)/.test(window.location.search);

  /* ---------- decorations ---------- */

  function decorate() {
    var host = document.querySelector("[data-floaters]");
    var riseHost = document.querySelector("[data-rise-hearts]");
    if (!host) return;

    var glyphs = ["\u2665", "\u2726", "\u273F", "\u2740", "\u2727"];
    var colors = ["#f19fba", "#d9b8f2", "#eec39a", "#c9b3ea", "#f6b7c9"];
    var count = window.innerWidth < 700 ? 14 : 24;
    var frag = document.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var bit = document.createElement("span");
      bit.className = "floater";
      bit.setAttribute("aria-hidden", "true");
      bit.textContent = glyphs[i % glyphs.length];
      bit.style.left = (3 + Math.random() * 94).toFixed(2) + "%";
      bit.style.top = (4 + Math.random() * 92).toFixed(2) + "%";
      bit.style.color = colors[(Math.random() * colors.length) | 0];
      bit.style.fontSize = (0.6 + Math.random() * 1.05).toFixed(2) + "rem";
      bit.style.opacity = (0.3 + Math.random() * 0.5).toFixed(2);
      bit.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px");
      bit.style.setProperty("--dy", (Math.random() * 40 - 30).toFixed(0) + "px");
      bit.style.setProperty("--dur", (6 + Math.random() * 7).toFixed(1) + "s");
      bit.style.setProperty("--delay", (Math.random() * 6).toFixed(1) + "s");
      frag.appendChild(bit);
    }

    host.appendChild(frag);

    if (!riseHost || reduce) return;

    for (var h = 0; h < 7; h++) {
      var heart = document.createElement("span");
      heart.className = "heart-rise";
      heart.setAttribute("aria-hidden", "true");
      heart.textContent = "\u2665";
      heart.style.left = (6 + Math.random() * 88).toFixed(2) + "%";
      heart.style.fontSize = (0.7 + Math.random() * 0.8).toFixed(2) + "rem";
      heart.style.setProperty("--dur", (19 + Math.random() * 12).toFixed(1) + "s");
      heart.style.setProperty("--delay", (Math.random() * 18).toFixed(1) + "s");
      heart.style.setProperty("--sway", (Math.random() * 70 - 35).toFixed(0) + "px");
      riseHost.appendChild(heart);
    }
  }

  /* ---------- canvas effects ---------- */

  var canvas = null;
  var ctx = null;
  var particles = [];
  var running = false;
  var dpr = 1;

  function ensureCanvas() {
    if (canvas && ctx) return true;

    canvas = document.querySelector("[data-lock-fx]");
    if (!canvas) return false;

    ctx = canvas.getContext("2d");
    if (!ctx) return false;

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    return true;
  }

  function sizeCanvas() {
    if (!canvas || !ctx) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addParticle(x, y, kind) {
    var pastel = ["#f39ab2", "#e5b7ef", "#ffd59a", "#c9b3f0", "#ffffff"];
    var angle = Math.random() * Math.PI * 2;
    var speed = 1.2 + Math.random() * 4.2;

    particles.push({
      kind: kind || (Math.random() > 0.55 ? "heart" : Math.random() > 0.5 ? "confetti" : "spark"),
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: kind === "rise" ? -(0.7 + Math.random() * 1.2) : Math.sin(angle) * speed - 1.4,
      gravity: kind === "rise" ? -0.002 : 0.055 + Math.random() * 0.045,
      drag: 0.991,
      size: 5 + Math.random() * 8,
      color: pastel[(Math.random() * pastel.length) | 0],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.18,
      life: 120 + Math.random() * 90,
      maxLife: 210,
      sway: Math.random() * Math.PI * 2
    });
  }

  function heartPath(context, s) {
    context.beginPath();
    context.moveTo(0, 3 * s);
    context.bezierCurveTo(0, 0, -3 * s, -2.6 * s, -5.2 * s, -0.4 * s);
    context.bezierCurveTo(-7.4 * s, 1.9 * s, -4 * s, 5.4 * s, 0, 8 * s);
    context.bezierCurveTo(4 * s, 5.4 * s, 7.4 * s, 1.9 * s, 5.2 * s, -0.4 * s);
    context.bezierCurveTo(3 * s, -2.6 * s, 0, 0, 0, 3 * s);
    context.closePath();
  }

  function drawParticle(p, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;

    if (p.kind === "heart") {
      heartPath(ctx, p.size / 8);
      ctx.fill();
    } else if (p.kind === "spark") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 5, p.size, p.size / 2.4);
    }

    ctx.restore();
  }

  function frame() {
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];

      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life -= 1;

      if (p.kind === "rise") {
        p.sway += 0.02;
        p.x += Math.sin(p.sway) * 0.5;
      }

      var alpha = Math.max(0, Math.min(1, p.life / 45));
      drawParticle(p, alpha);

      if (p.life <= 0 || p.y > window.innerHeight + 80 || p.y < -160) {
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

  function startLoop() {
    if (running) return;
    running = true;
    window.requestAnimationFrame(frame);
  }

  function burstAt(x, y, count, kind) {
    for (var i = 0; i < count; i++) {
      addParticle(x, y, kind);
    }
    startLoop();
  }

  function celebrate() {
    if (reduce || !ensureCanvas()) return;

    var w = window.innerWidth;
    var h = window.innerHeight;

    burstAt(w * 0.5, h * 0.38, 60);
    burstAt(w * 0.12, h * 0.82, 26);
    burstAt(w * 0.88, h * 0.78, 26);

    for (var i = 0; i < 16; i++) {
      (function (n) {
        window.setTimeout(function () {
          burstAt(w * (0.15 + Math.random() * 0.7), h + 30, 1, "rise");
        }, n * 140);
      })(i);
    }
  }

  function smallJoy(origin) {
    if (reduce || !ensureCanvas()) return;

    burstAt(origin.x, origin.y, 18);

    for (var i = 0; i < 6; i++) {
      (function (n) {
        window.setTimeout(function () {
          burstAt(origin.x + (Math.random() * 60 - 30), origin.y - 10, 1, "rise");
        }, n * 110);
      })(i);
    }
  }

  /* ---------- countdown ---------- */

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function nextTarget(now) {
    return new Date(now.getFullYear(), birthday.month - 1, birthday.day, 0, 0, 0, 0);
  }

  function showWelcome(withParty) {
    if (revealed) return;
    revealed = true;

    if (tickTimer) {
      window.clearTimeout(tickTimer);
      tickTimer = null;
    }

    try {
      if (demoMode) window.sessionStorage.setItem("bday-preview", "1");
      else window.localStorage.setItem("bday-unlocked", "1");
    } catch (error) {
      /* the clock has passed anyway */
    }

    document.title = "It's Your Day \u00B7 Happy Birthday";

    if (els.card) els.card.classList.add("is-leaving");

    if (els.revealStage) {
      els.revealStage.hidden = false;
      window.requestAnimationFrame(function () {
        els.revealStage.classList.add("is-on");
      });
    }

    window.setTimeout(
      function () {
        if (els.lockStage) els.lockStage.classList.add("is-gone");
      },
      reduce ? 0 : 620
    );

    /* warm the next page so stepping inside is instant */
    try {
      var pre = document.createElement("link");
      pre.rel = "prefetch";
      pre.href = "index.html";
      document.head.appendChild(pre);
    } catch (error) {
      /* ignore */
    }

    window.setTimeout(
      function () {
        if (withParty) celebrate();
        if (els.welcomeTitle) {
          try {
            els.welcomeTitle.focus({ preventScroll: true });
          } catch (error) {
            els.welcomeTitle.focus();
          }
        }
      },
      reduce ? 0 : 420
    );
  }

  function tick() {
    if (revealed) return;

    var now = new Date();
    var target = nextTarget(now);
    var diff = target.getTime() - now.getTime();

    if (diff <= 0) {
      setText(els.days, "00");
      setText(els.hours, "00");
      setText(els.minutes, "00");
      setText(els.seconds, "00");
      showWelcome(true);
      return;
    }

    var total = Math.floor(diff / 1000);
    setText(els.days, pad(Math.floor(total / 86400)));
    setText(els.hours, pad(Math.floor((total % 86400) / 3600)));
    setText(els.minutes, pad(Math.floor((total % 3600) / 60)));
    setText(els.seconds, pad(total % 60));

    if (els.sr && srTicks % 30 === 0) {
      els.sr.textContent =
        Math.floor(total / 86400) + " days, " +
        Math.floor((total % 86400) / 3600) + " hours and " +
        Math.floor((total % 3600) / 60) + " minutes until your birthday.";
    }
    srTicks++;

    tickTimer = window.setTimeout(tick, 1000 - (Date.now() % 1000));
  }

  /* ---------- the promise ---------- */

  function initPromise() {
    if (!els.promise) return;

    var original = els.promiseLabel ? els.promiseLabel.innerHTML : "";
    var busy = false;

    els.promise.addEventListener("click", function () {
      if (busy) return;
      busy = true;

      els.promise.classList.add("is-bouncing");
      if (els.gift) els.gift.classList.add("is-opened");
      if (els.card) els.card.classList.add("is-excited");

      if (els.promiseLabel) {
        els.promiseLabel.innerHTML = 'Promise kept! <span class="emoji" aria-hidden="true">\uD83D\uDC97</span>';
      }
      if (els.promiseNote) {
        els.promiseNote.textContent = "Noted. I'll be counting every single second.";
      }

      var rect = els.promise.getBoundingClientRect();
      smallJoy({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

      window.setTimeout(function () {
        els.promise.classList.remove("is-bouncing");
      }, 900);

      window.setTimeout(function () {
        if (els.gift) els.gift.classList.remove("is-opened");
      }, 3400);

      window.setTimeout(function () {
        if (els.promiseLabel) els.promiseLabel.innerHTML = original;
        if (els.card) els.card.classList.remove("is-excited");
        busy = false;
      }, 4200);
    });
  }

  /* ---------- start ---------- */

  decorate();
  initPromise();

  if (demoMode || lock.open) {
    showWelcome(true);
  } else {
    tick();

    document.addEventListener("visibilitychange", function () {
      if (document.hidden || revealed) return;
      if (tickTimer) window.clearTimeout(tickTimer);
      tick();
    });
  }
})();
