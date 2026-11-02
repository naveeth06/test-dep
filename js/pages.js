/* =========================================================
   Page interactions: story, reasons, letter, surprise, wish
   ========================================================= */

(function () {
  "use strict";

  var App = window.App;
  var gsap = window.gsap;

  if (!App) return;

  /* ---------- our story ---------- */

  function initStory() {
    if (!App.motion) return;

    var fill = App.qs("[data-timeline-fill]");
    if (fill) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: ".timeline", start: "top 72%", end: "bottom 64%", scrub: 0.6 }
        }
      );
    }

    App.qsa("[data-tl-item]").forEach(function (item) {
      gsap.fromTo(
        item,
        { y: 34, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: item, start: "top 84%", once: true }
        }
      );

      var dot = item.querySelector(".tl-dot");
      if (dot) {
        gsap.fromTo(
          dot,
          { scale: 0 },
          {
            scale: 1,
            duration: 0.6,
            ease: "back.out(2.4)",
            scrollTrigger: { trigger: item, start: "top 84%", once: true }
          }
        );
      }
    });

    App.parallax();
  }

  /* ---------- reasons deck ---------- */

  function initReasons() {
    if (window.App && App.deck && App.deck.init) App.deck.init();
  }

  /* ---------- the letter ---------- */

  function initLetter() {
    var letter = App.qs("[data-letter]");
    if (!letter) return;

    var paras = App.qsa("[data-type]", letter);
    if (!paras.length) return;

    var caret = letter.querySelector("[data-caret]");
    var sign = letter.querySelector("[data-letter-sign]");
    var chars = [];

    paras.forEach(function (p) {
      var text = (p.textContent || "").trim().replace(/\s+/g, " ");
      p.textContent = "";
      if (!text) return;

      var words = text.split(" ");
      words.forEach(function (word, wi) {
        var wordEl = document.createElement("span");
        wordEl.className = "type-word";

        for (var i = 0; i < word.length; i++) {
          var ch = document.createElement("span");
          ch.className = "type-ch";
          ch.textContent = word.charAt(i);
          wordEl.appendChild(ch);
          chars.push(ch);
        }

        p.appendChild(wordEl);
        if (wi < words.length - 1) p.appendChild(document.createTextNode(" "));
      });
    });

    if (!App.motion) {
      if (caret) caret.style.display = "none";
      return;
    }

    if (sign) gsap.set(sign, { opacity: 0, y: 14 });

    var started = false;

    function measure() {
      var box = letter.getBoundingClientRect();
      var list = [];

      for (var i = 0; i < chars.length; i++) {
        var rect = chars[i].getBoundingClientRect();
        list.push({ x: rect.left - box.left, y: rect.top - box.top, h: rect.height || 20 });
      }

      return list;
    }

    function start() {
      if (started) return;
      started = true;

      var pos = measure();
      var total = chars.length;
      if (!total || !pos.length) return;

      gsap.set(chars, { opacity: 0 });

      if (caret) {
        gsap.set(caret, { x: pos[0].x, y: pos[0].y, height: pos[0].h, opacity: 1 });
      }

      var each = 0.0055;
      var proxy = { i: 0 };

      var tl = gsap.timeline({
        onComplete: function () {
          if (caret) gsap.to(caret, { opacity: 0, duration: 0.4 });
          if (sign) gsap.to(sign, { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" });
        }
      });

      tl.to(chars, { opacity: 1, duration: 0.01, ease: "none", stagger: { each: each } }, 0);

      tl.to(
        proxy,
        {
          i: total - 1,
          duration: each * total,
          ease: "none",
          onUpdate: function () {
            if (!caret) return;
            var idx = Math.min(total - 1, Math.round(proxy.i));
            var point = pos[idx];
            if (!point) return;
            gsap.set(caret, { x: point.x, y: point.y, height: point.h });
          }
        },
        0
      );
    }

    if (window.ScrollTrigger) {
      window.ScrollTrigger.create({
        trigger: letter,
        start: "top 80%",
        once: true,
        onEnter: start
      });
    } else {
      start();
    }
  }

  /* ---------- the surprise ---------- */

  function initSurprise() {
    var envelope = App.qs("[data-envelope]");
    var content = document.getElementById("surprise-content");
    var hint = App.qs("[data-env-hint]");

    if (envelope) {
      envelope.addEventListener("click", function () {
        if (envelope.classList.contains("is-open")) return;

        envelope.classList.add("is-open");
        envelope.setAttribute("aria-expanded", "true");
        envelope.setAttribute("aria-label", "Envelope opened");
        if (hint) hint.textContent = "For you. Always.";

        var rect = envelope.getBoundingClientRect();
        if (App.burst) {
          App.burst(rect.left + rect.width / 2, rect.top + rect.height * 0.42, {
            count: App.reduce ? 0 : 70,
            power: 2.6,
            spread: 1.1,
            hearts: true
          });
        }

        if (!content) return;

        content.hidden = false;

        if (App.motion) {
          gsap.fromTo(content, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.45 });
          gsap.fromTo(
            content.querySelectorAll(".surprise-reveal > *"),
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.55 }
          );
          gsap.fromTo(
            content.querySelectorAll(".coupon"),
            { y: 26, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.75 }
          );
        }

        window.setTimeout(
          function () {
            App.scrollTo(content, -70);
          },
          App.motion ? 950 : 0
        );
      });
    }

    App.qsa("[data-coupon]").forEach(function (coupon) {
      coupon.addEventListener("click", function () {
        var on = coupon.getAttribute("aria-pressed") === "true";
        coupon.setAttribute("aria-pressed", on ? "false" : "true");

        if (on) return;

        var rect = coupon.getBoundingClientRect();
        if (App.burst) {
          App.burst(rect.left + rect.width - 34, rect.top + rect.height - 28, {
            count: App.reduce ? 0 : 20,
            power: 1.8,
            spread: 0.8,
            hearts: true
          });
        }
      });
    });
  }

  /* ---------- the last page ---------- */

  function spawnHeart(host, x, y, delay) {
    var heart = document.createElement("span");
    heart.className = "heart-float";
    heart.textContent = "\u2665";
    heart.style.left = x + (Math.random() * 30 - 15) + "px";
    heart.style.bottom = window.innerHeight - y + "px";
    heart.style.fontSize = (0.7 + Math.random() * 0.9).toFixed(2) + "rem";
    heart.style.setProperty("--drift", (Math.random() * 90 - 45).toFixed(0) + "px");
    heart.style.setProperty("--spin", (Math.random() * 60 - 30).toFixed(0) + "deg");
    heart.style.setProperty("--dur", (4.2 + Math.random() * 2.6).toFixed(1) + "s");
    heart.style.animationDelay = delay + "ms";

    host.appendChild(heart);
    heart.addEventListener("animationend", function () {
      heart.remove();
    });
  }

  function initWish() {
    if (App.motion) {
      App.qsa("[data-through-line]").forEach(function (line) {
        gsap.fromTo(
          line,
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: line, start: "top 86%", once: true }
          }
        );
      });
    }

    var star = App.qs("[data-wish-star]");
    var label = App.qs("[data-wish-star-label]");
    var host = App.qs("[data-hearts]");
    var wishes = 0;

    if (!star) return;

    star.addEventListener("click", function () {
      wishes++;

      if (label) {
        label.textContent =
          wishes === 1 ? "Wish sent. Make another." : "Wish " + wishes + ". I am counting.";
      }

      var rect = star.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;

      if (App.burst) {
        App.burst(cx, cy, {
          count: App.reduce ? 0 : 26,
          power: 2,
          spread: 1,
          hearts: true
        });
      }

      if (host && !App.reduce) {
        for (var i = 0; i < 7; i++) {
          spawnHeart(host, cx, cy, i * 110);
        }
      }
    });
  }

  App.pages = {
    story: initStory,
    reasons: initReasons,
    letter: initLetter,
    surprise: initSurprise,
    wish: initWish
  };
})();
