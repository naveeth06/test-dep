/* =========================================================
   Chapter four: the deck.

   The scroll timeline selects the stack position; direct gestures
   add a temporary offset. One layout function maps both to the cards.
   ========================================================= */

(function () {
  "use strict";

  var App = window.App;
  if (!App) return;

  var gsap = window.gsap;
  var doc = document;

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function init() {
    var deck = App.qs("[data-deck]");
    if (!deck) return;

    var reasons = ((window.SITE && window.SITE.reasons) || []).slice();
    if (!reasons.length) return;

    var stage = deck.parentNode;
    var section = deck.closest("[data-deck-section]") || deck;
    var n = reasons.length;
    var motion = !!App.motion;

    var liveEl = App.qs("[data-deck-live]");
    var countEl = App.qs("[data-deck-count]");
    var meter = App.qs("[data-deck-meter]");
    var prevBtn = App.qs("[data-deck-prev]");
    var nextBtn = App.qs("[data-deck-next]");

    var cards = [];
    var ticks = [];
    var frag = doc.createDocumentFragment();

    /* ---------- build the twelve cards ---------- */

    reasons.forEach(function (reason, i) {
      var card = doc.createElement("article");
      card.className = "deck-card";
      if (i > 0) card.setAttribute("aria-hidden", "true");

      var shell = doc.createElement("div");
      shell.className = "deck-card__shell";

      var cover = doc.createElement("div");
      cover.className = "deck-card__cover";
      cover.setAttribute("aria-hidden", "true");
      cover.innerHTML =
        '<span class="deck-card__num">' +
        pad(i + 1) +
        "</span>" +
        '<span class="deck-card__glyph">&#10022;</span>' +
        '<span class="deck-card__seal">a reason</span>';

      var note = doc.createElement("div");
      note.className = "deck-card__note";
      note.innerHTML =
        '<span class="deck-card__index">reason ' +
        pad(i + 1) +
        "</span>" +
        '<p class="deck-card__text"></p>' +
        '<span class="deck-card__flourish" aria-hidden="true">&#10022;</span>';
      note.querySelector(".deck-card__text").textContent = reason;

      shell.appendChild(cover);
      shell.appendChild(note);
      card.appendChild(shell);
      frag.appendChild(card);
      cards.push(card);
    });

    deck.appendChild(frag);

    if (meter) {
      for (var t = 0; t < n; t++) {
        var tick = doc.createElement("span");
        meter.appendChild(tick);
        ticks.push(tick);
      }
    }

    /* ---------- state ---------- */

    var state = { pos: 0, lean: 0 };
    var view = { progress: 0, scrollPos: 0 };
    var index = 0;
    var manualOffset = 0;
    var stageW = 380;
    var step = 236;
    var settle = null;

    function measure() {
      var width = deck.getBoundingClientRect().width || deck.offsetWidth || 380;
      stageW = width;
      step = Math.max(120, width * 0.62);
    }

    function sectionScrollStart() {
      return section.getBoundingClientRect().top + window.scrollY;
    }

    function sectionScrollEnd() {
      return sectionScrollStart() + section.offsetHeight - window.innerHeight;
    }

    function layout() {
      var progress = clamp(view.progress, 0, 1);
      var fan = 0.4 + 0.6 * progress;

      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var rel = i - state.pos;
        var x, y, z, rot, scale, opacity;
        var scrollWave = Math.sin(progress * Math.PI * 2 + i * 0.35);

        if (rel < 0) {
          /* cards you have already dealt, sliding away to the left */
          var gone = Math.min(-rel, 3);
          x = -gone * stageW * 0.95;
          y = gone * stageW * 0.014 + scrollWave * stageW * 0.006;
          z = -gone * 24;
          rot = -gone * 8 - state.lean * clamp(1 - gone * 0.3, 0, 1) + scrollWave * 1.4;
          scale = 1 - Math.min(gone, 1) * 0.05;
          opacity = clamp(1 - gone * 0.42, 0, 1);
        } else {
          /* the card in your hand, and the ones waiting behind it */
          var d = Math.min(rel, 6);
          x = d * stageW * (0.035 + 0.075 * progress) * fan;
          y =
            -d * stageW * (0.032 - 0.024 * progress) * fan +
            scrollWave * stageW * 0.012;
          z = -d * (38 - 18 * progress);
          rot =
            d * (5 - 3.8 * progress) * fan -
            state.lean * clamp(1 - d * 1.5, 0, 1) +
            scrollWave * 1.8;
          scale = 1 - d * (0.038 - 0.016 * progress);
          opacity = clamp(4.4 - rel, 0, 1);
        }

        card.style.transform =
          "translate3d(" +
          x.toFixed(2) +
          "px," +
          y.toFixed(2) +
          "px," +
          z.toFixed(2) +
          "px) rotate(" +
          rot.toFixed(2) +
          "deg) scale(" +
          scale.toFixed(3) +
          ")";
        card.style.opacity = opacity.toFixed(2);
        card.style.zIndex = String(60 - Math.round(Math.abs(rel) * 6));
      }
    }

    /* ---------- which card is in your hand ---------- */

    function setFront(i, announce) {
      index = i;

      for (var c = 0; c < cards.length; c++) {
        var on = c === i;
        cards[c].classList.toggle("is-front", on);
        if (on) cards[c].removeAttribute("aria-hidden");
        else cards[c].setAttribute("aria-hidden", "true");
      }

      for (var k = 0; k < ticks.length; k++) {
        ticks[k].classList.toggle("is-on", k <= i);
      }

      if (countEl) countEl.textContent = pad(i + 1) + " / " + pad(n);
      if (prevBtn) prevBtn.disabled = i === 0;
      if (nextBtn) nextBtn.disabled = i === n - 1;

      deck.setAttribute(
        "aria-label",
        "Reason " + (i + 1) + " of " + n + ". " + reasons[i] +
          " Drag, swipe, or use the arrow keys for the next one."
      );

      if (announce && liveEl) {
        liveEl.textContent = "Reason " + (i + 1) + " of " + n + ". " + reasons[i];
      }
    }

    function goTo(target, announce) {
      target = clamp(Math.round(target), 0, n - 1);

      var from = state.pos;
      manualOffset = target - view.scrollPos;
      setFront(target, announce !== false);

      if (!motion) {
        state.pos = target;
        state.lean = 0;
        layout();
        return;
      }

      if (settle) settle.kill();

      var distance = Math.abs(target - from);
      var settled = distance <= 1;

      settle = gsap.to(state, {
        pos: target,
        lean: 0,
        duration: settled ? 0.92 : 0.7,
        ease: settled ? "elastic.out(1, 0.72)" : "power3.out",
        onUpdate: layout,
        onComplete: function () {
          settle = null;
          state.pos = target;
          layout();
        }
      });
    }

    /* ---------- the pointer ---------- */

    var active = false;
    var dragging = false;
    var pointerId = null;
    var startX = 0;
    var startY = 0;
    var startPos = 0;
    var lastX = 0;
    var lastT = 0;
    var velocity = 0;

    function onDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest && event.target.closest("button, a")) return;

      active = true;
      dragging = false;
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startY = event.clientY;
      startPos = state.pos;
      lastT = window.performance ? performance.now() : Date.now();
      velocity = 0;

      if (settle) settle.kill();
      settle = null;
    }

    function onMove(event) {
      if (!active || event.pointerId !== pointerId) return;

      var dx = event.clientX - startX;
      var dy = event.clientY - startY;

      if (!dragging) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return;

        /* a vertical gesture belongs to the page, always */
        if (Math.abs(dy) > Math.abs(dx)) {
          active = false;
          pointerId = null;
          return;
        }

        dragging = true;
        stage.classList.add("is-dragging");
        deck.focus({ preventScroll: true });

        try {
          deck.setPointerCapture(pointerId);
        } catch (err) {
          /* older engines simply keep sending the events */
        }
      }

      if (event.cancelable) event.preventDefault();

      var now = window.performance ? performance.now() : Date.now();
      var dt = now - lastT;

      if (dt > 8) {
        velocity = (event.clientX - lastX) / dt;
        lastX = event.clientX;
        lastT = now;
      }

      var next = startPos - dx / step;

      /* rubber band at both ends instead of a hard wall */
      if (next < 0) next *= 0.28;
      else if (next > n - 1) next = n - 1 + (next - (n - 1)) * 0.28;

      state.pos = next;
      state.lean = clamp(dx * 0.03, -8, 8);
      layout();
    }

    function onUp(event) {
      if (!active || event.pointerId !== pointerId) return;
      active = false;

      if (!dragging) {
        pointerId = null;
        return;
      }

      dragging = false;
      stage.classList.remove("is-dragging");

      try {
        deck.releasePointerCapture(pointerId);
      } catch (err) {
        /* nothing to release */
      }
      pointerId = null;

      /* Add restrained momentum without letting one swipe skip the deck. */
      var momentum = clamp((velocity * 120) / step, -0.45, 0.45);
      var projected = clamp(state.pos - momentum, startPos - 1, startPos + 1);
      goTo(projected, true);
    }

    function onCancel() {
      if (!active) return;

      active = false;
      dragging = false;
      pointerId = null;
      stage.classList.remove("is-dragging");
      goTo(index, false);
    }

    stage.addEventListener("pointerdown", onDown, { passive: true });
    stage.addEventListener("pointermove", onMove, { passive: false });
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onCancel);

    /* ---------- horizontal trackpad gestures ---------- */

    var wheelDistance = 0;
    var wheelDirection = 0;
    var wheelLocked = false;
    var wheelTimer = 0;

    deck.addEventListener(
      "wheel",
      function (event) {
        var dx = event.deltaX;
        var dy = event.deltaY;

        /* Leave vertical wheel and trackpad gestures to the page. */
        if (Math.abs(dx) < 1 || Math.abs(dx) <= Math.abs(dy)) return;

        if (event.cancelable) event.preventDefault();

        var direction = dx > 0 ? 1 : -1;
        if (direction !== wheelDirection) {
          wheelDistance = 0;
          wheelDirection = direction;
          wheelLocked = false;
        }

        wheelDistance += Math.abs(dx);
        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(function () {
          wheelDistance = 0;
          wheelDirection = 0;
          wheelLocked = false;
        }, 650);

        if (wheelDistance >= 48 && !wheelLocked) {
          wheelLocked = true;
          goTo(index + direction);
        }
      },
      { passive: false }
    );

    /* ---------- keyboard and buttons ---------- */

    deck.addEventListener("keydown", function (event) {
      var key = event.key;

      if (key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      } else if (key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      } else if (key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (key === "End") {
        event.preventDefault();
        goTo(n - 1);
      }
    });

    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1); });
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1); });

    /* ---------- tilt, for pointers that can hover ---------- */

    if (motion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      stage.addEventListener("pointermove", function (event) {
        if (dragging || event.pointerType !== "mouse") return;

        var rect = stage.getBoundingClientRect();
        var nx = (event.clientX - rect.left) / rect.width - 0.5;
        var ny = (event.clientY - rect.top) / rect.height - 0.5;

        gsap.to(deck, {
          rotateY: nx * 9,
          rotateX: -ny * 7,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto"
        });
      });

      stage.addEventListener("pointerleave", function () {
        gsap.to(deck, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto"
        });
      });
    }

    /* ---------- page scroll: the stack advances and opens ---------- */

    if (motion) {
      section.classList.add("has-scroll-story");

      function syncScrollPosition(progress) {
        if (typeof progress === "number") view.progress = progress;
        view.scrollPos = view.progress * (n - 1);
        if (view.scrollPos <= 0.001 || view.scrollPos >= n - 1 - 0.001) {
          manualOffset = 0;
        }

        if (settle) {
          settle.kill();
          settle = null;
        }

        state.pos = clamp(view.scrollPos + manualOffset, 0, n - 1);
        state.lean = 0;
        layout();

        var scrollIndex = Math.round(state.pos);
        if (scrollIndex !== index) setFront(scrollIndex, false);
      }

      var scrollStory = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: sectionScrollStart,
          end: sectionScrollEnd,
          scrub: 1.6,
          invalidateOnRefresh: true,
          onUpdate: function (trigger) {
            syncScrollPosition(trigger.progress);
          },
          onRefresh: function (trigger) {
            syncScrollPosition(trigger.progress);
          }
        }
      });

      scrollStory.to(view, {
        progress: 1,
        duration: 1,
        ease: "none",
        onUpdate: function () {
          syncScrollPosition();
        }
      }, 0);

      scrollStory.to(stage, {
        y: -22,
        ease: "none",
        duration: 1
      }, 0);
    }

    /* ---------- resize ---------- */

    var resizeFrame = 0;

    window.addEventListener(
      "resize",
      function () {
        if (resizeFrame) return;
        resizeFrame = window.requestAnimationFrame(function () {
          resizeFrame = 0;
          measure();
          layout();
          if (motion && window.ScrollTrigger) window.ScrollTrigger.refresh();
        });
      },
      { passive: true }
    );

    measure();
    setFront(0, false);
    layout();

    if (motion) {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();

      gsap.delayedCall(0.4, function () {
        measure();
        layout();
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    }
  }

  App.deck = { init: init };
})();
