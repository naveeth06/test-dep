/* =========================================================
   Boot
   ========================================================= */

(function () {
  "use strict";

  var App = window.App;
  if (!App) return;

  var page = document.body.getAttribute("data-page") || "";

  if (typeof App.initCake === "function") {
    App.initCake();
  }

  if (App.pages && typeof App.pages[page] === "function") {
    App.pages[page]();
  }

  App.reveal();

  if (window.ScrollTrigger) {
    window.addEventListener("load", function () {
      window.ScrollTrigger.refresh();
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        window.ScrollTrigger.refresh();
      });
    }
  }
})();
