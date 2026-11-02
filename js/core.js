/* =========================================================
   Core: motion setup, navigation, transitions, reveals
   Everything degrades to visible, static content without JS.
   ========================================================= */

(function () {
  "use strict";

  var App = (window.App = window.App || {});
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var gsap = window.gsap;

  App.reduce = reduce;
  App.motion = hasGSAP && !reduce;

  if (hasGSAP) {
    gsap.registerPlugin(window.ScrollTrigger);
  }

  App.qs = function (sel, ctx) {
    return (ctx || doc).querySelector(sel);
  };

  App.qsa = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  };

  /* ---------- smooth scroll ---------- */

  var lenis = null;

  if (App.motion && window.Lenis) {
    var isReasonsPage = doc.body.getAttribute("data-page") === "reasons";
    lenis = new window.Lenis({
      duration: isReasonsPage ? 1.35 : 1.1,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.6,
      autoRaf: false
    });

    lenis.on("scroll", window.ScrollTrigger.update);
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  App.lenis = lenis;

  App.scrollTo = function (target, offset) {
    var el = typeof target === "string" ? App.qs(target) : target;
    if (!el) return;

    if (lenis) {
      lenis.scrollTo(el, { offset: offset || 0, duration: 1.2 });
      return;
    }

    var top = el.getBoundingClientRect().top + window.scrollY + (offset || 0);
    window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
  };

  /* ---------- in-page anchors ---------- */

  doc.addEventListener("click", function (event) {
    var link = event.target.closest ? event.target.closest("a") : null;
    if (!link) return;

    var href = link.getAttribute("href") || "";
    if (href.length < 2 || href.charAt(0) !== "#") return;

    var target = doc.getElementById(href.slice(1));
    if (!target) return;

    event.preventDefault();
    App.scrollTo(target, -10);
  });

  /* ---------- veil / page transitions ---------- */

  var veil = App.qs(".veil");

  window.setTimeout(function () {
    root.classList.add("is-ready");
  }, 260);

  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    if (veil) veil.classList.remove("is-leaving");
    root.classList.add("is-ready");
    if (lenis) lenis.start();
    if (window.ScrollTrigger) {
      window.requestAnimationFrame(function () {
        window.ScrollTrigger.refresh();
      });
    }
  });

  doc.addEventListener("click", function (event) {
    var link = event.target.closest ? event.target.closest("a") : null;
    if (!link) return;

    var href = link.getAttribute("href") || "";
    if (!/\.html(\?|#|$)/.test(href)) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;

    event.preventDefault();
    closeMenu(true);
    if (lenis) lenis.stop();

    if (!veil) {
      window.location.href = href;
      return;
    }

    veil.classList.add("is-leaving");
    window.setTimeout(function () {
      window.location.href = href;
    }, 620);
  });

  /* ---------- menu ---------- */

  var menu = doc.getElementById("menu");
  var menuOpenBtn = App.qs("[data-menu-open]");
  var menuCloseBtn = App.qs("[data-menu-close]");
  var lastFocus = null;

  function openMenu() {
    if (!menu || !menu.hidden) return;

    lastFocus = doc.activeElement;
    menu.hidden = false;
    menu.scrollTop = 0;
    root.classList.add("menu-open");
    if (lenis) lenis.stop();

    window.requestAnimationFrame(function () {
      menu.classList.add("is-open");
      if (menuOpenBtn) menuOpenBtn.setAttribute("aria-expanded", "true");

      if (App.motion) {
        gsap.fromTo(
          App.qsa(".menu-list a", menu),
          { yPercent: 55, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.85, ease: "power3.out", stagger: 0.045, delay: 0.06 }
        );
      }

      if (menuCloseBtn) menuCloseBtn.focus({ preventScroll: true });
    });
  }

  function closeMenu(instant) {
    if (!menu || menu.hidden) return;

    menu.classList.remove("is-open");
    root.classList.remove("menu-open");
    if (lenis) lenis.start();
    if (menuOpenBtn) menuOpenBtn.setAttribute("aria-expanded", "false");

    var finish = function () {
      menu.hidden = true;
    };

    if (instant || !App.motion) finish();
    else window.setTimeout(finish, 460);

    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  App.closeMenu = closeMenu;

  if (menuOpenBtn) menuOpenBtn.addEventListener("click", openMenu);
  if (menuCloseBtn) menuCloseBtn.addEventListener("click", function () { closeMenu(); });

  doc.addEventListener("keydown", function (event) {
    if (!menu || menu.hidden) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === "Tab") {
      var focusables = App.qsa("a[href], button:not([disabled])", menu);
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------- nav state + reading progress ---------- */

  var nav = App.qs("[data-nav]");
  var progress = App.qs("[data-progress]");

  function onScroll() {
    var y = window.scrollY || window.pageYOffset || 0;

    if (nav) nav.classList.toggle("is-stuck", y > 40);

    if (progress) {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var value = max > 0 ? Math.min(y / max, 1) : 0;
      progress.style.transform = "scaleX(" + value + ")";
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- stardust ---------- */

  function buildDust() {
    var host = App.qs("[data-stardust]");
    if (!host) return;

    var count = window.innerWidth < 720 ? 36 : 64;
    var frag = doc.createDocumentFragment();

    for (var i = 0; i < count; i++) {
      var star = doc.createElement("span");
      var gold = Math.random() > 0.74;
      star.className = "dust" + (gold ? " dust--gold" : "");
      star.style.left = (Math.random() * 100).toFixed(2) + "%";
      star.style.top = (Math.random() * 100).toFixed(2) + "%";
      star.style.setProperty("--twinkle-dur", (Math.random() * 5 + 3.5).toFixed(1) + "s");
      star.style.setProperty("--twinkle-delay", (Math.random() * 6).toFixed(1) + "s");
      if (gold) {
        star.style.opacity = (Math.random() * 0.4 + 0.25).toFixed(2);
      }
      frag.appendChild(star);
    }

    host.appendChild(frag);
  }

  buildDust();

  /* ---------- reveals ---------- */

  App.reveal = function (ctx) {
    if (!App.motion) return;

    App.qsa("[data-reveal]:not([data-revealed])", ctx).forEach(function (el) {
      el.setAttribute("data-revealed", "1");
      var delay = parseFloat(el.getAttribute("data-reveal-delay") || "0");

      gsap.fromTo(
        el,
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.95,
          ease: "power3.out",
          delay: delay,
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });
  };

  /* ---------- hero entrance ---------- */

  function heroIntro() {
    if (!App.motion) return;

    var lines = App.qsa("[data-hero-line]");
    var items = App.qsa("[data-hero-item]");
    if (!lines.length && !items.length) return;

    if (lines.length) gsap.set(lines, { yPercent: 118 });
    if (items.length) gsap.set(items, { y: 20, opacity: 0 });

    var tl = gsap.timeline({ delay: 0.42, defaults: { ease: "power3.out" } });

    if (lines.length) {
      tl.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.075 });
    }
    if (items.length) {
      tl.to(items, { y: 0, opacity: 1, duration: 0.9, stagger: 0.075 }, "-=0.75");
    }
  }

  heroIntro();

  /* ---------- countdown ---------- */

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function initCountdown() {
    var box = App.qs("[data-countdown]");
    if (!box) return;

    var kicker = box.querySelector("[data-countdown-kicker]");
    var sr = box.querySelector("[data-countdown-sr]");
    var fields = {
      days: box.querySelector('[data-cd="days"]'),
      hours: box.querySelector('[data-cd="hours"]'),
      minutes: box.querySelector('[data-cd="minutes"]'),
      seconds: box.querySelector('[data-cd="seconds"]')
    };

    var birthday = (window.SITE && window.SITE.birthday) || { month: 11, day: 4 };
    var monthIndex = birthday.month - 1;
    var now = new Date();
    var isToday = now.getMonth() === monthIndex && now.getDate() === birthday.day;

    if (isToday) {
      box.classList.add("is-today");
      if (kicker) kicker.textContent = "today is the day \u00B7 happy birthday";
      if (sr) sr.textContent = "It is your birthday today.";
      return;
    }

    var target = new Date(now.getFullYear(), monthIndex, birthday.day, 0, 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target = new Date(now.getFullYear() + 1, monthIndex, birthday.day, 0, 0, 0, 0);
      if (kicker) kicker.textContent = "until your day comes around again";
    }

    var srTick = 0;

    function tick() {
      var diff = target.getTime() - Date.now();

      if (diff <= 0) {
        box.classList.add("is-today");
        if (kicker) kicker.textContent = "today is the day \u00B7 happy birthday";
        if (sr) sr.textContent = "It is your birthday today.";
        return;
      }

      var totalSeconds = Math.floor(diff / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      if (fields.days) fields.days.textContent = String(days);
      if (fields.hours) fields.hours.textContent = pad(hours);
      if (fields.minutes) fields.minutes.textContent = pad(minutes);
      if (fields.seconds) fields.seconds.textContent = pad(seconds);

      if (sr && srTick % 30 === 0) {
        sr.textContent = days + " days, " + hours + " hours and " + minutes + " minutes until your birthday.";
      }
      srTick++;

      window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }

    tick();
  }

  initCountdown();

  /* ---------- parallax quotes ---------- */

  App.parallax = function () {
    if (!App.motion) return;

    App.qsa("[data-parallax-quote]").forEach(function (el) {
      var band = el.closest(".quote-band") || el;
      gsap.fromTo(
        el,
        { yPercent: 9 },
        {
          yPercent: -9,
          ease: "none",
          scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: 0.7 }
        }
      );
    });
  };

  /* ---------- pointer lamp ---------- */

  function initLamp() {
    var lamp = App.qs("[data-lamp]");
    if (!lamp || !App.motion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    root.classList.add("has-lamp");
    gsap.set(lamp, { xPercent: -50, yPercent: -50 });

    var toX = gsap.quickTo(lamp, "x", { duration: 0.9, ease: "power3" });
    var toY = gsap.quickTo(lamp, "y", { duration: 0.9, ease: "power3" });

    window.addEventListener(
      "pointermove",
      function (event) {
        toX(event.clientX);
        toY(event.clientY);
      },
      { passive: true }
    );
  }

  initLamp();

  /* ---------- her name ---------- */

  function paintName() {
    var name = ((window.SITE && window.SITE.herName) || "").trim();
    if (!name) return;

    App.qsa("[data-her-name]").forEach(function (el) {
      el.textContent = name;
    });
    doc.title = doc.title.replace("My Love", name);
  }

  paintName();
})();
