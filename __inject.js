const fs = require("fs");
let html = fs.readFileSync("reasons.html", "utf8");

const probe = `
<script>
(function () {
  var pre = document.createElement("pre");
  pre.id = "__t";
  pre.style.cssText = "font:12px monospace;white-space:pre-wrap";
  var log = [];
  function say(k, v) { log.push(k + ": " + v); pre.textContent = log.join("\n"); }
  say("ALIVE", "probe parsed");
  function start() {
    try {
      say("pre in dom", !!document.body.contains(pre));
      var deck = document.querySelector("[data-deck]");
      var cards = document.querySelectorAll(".deck-card");
      var count = document.querySelector("[data-deck-count]");
      say("cards", cards.length);
      say("count", count.textContent.trim());
      say("scrollY", window.scrollY);
      say("lenis", window.App && App.lenis ? "present" : "absent");
      say("card2 start", cards[2].style.transform);
      say("stage start", deck.parentNode.style.transform);

      if (window.App && App.lenis) App.lenis.scrollTo(700, { immediate: true });
      else window.scrollTo(0, 700);

      setTimeout(function () {
        say("scrollY after lenis", Math.round(window.scrollY));
        say("card2 after", cards[2].style.transform);
        say("stage after", deck.parentNode.style.transform);
        say("count after scroll", count.textContent.trim());
        say("DONE", "true");
      }, 1200);
    } catch (err) {
      say("ERROR", err.message);
    }
  }
  document.body.appendChild(pre);
  setTimeout(start, 900);
  window.addEventListener("error", function (e) { say("PAGE ERROR", e.message); });
})();
</script>
`;

html = html.replace("</body>", probe + "</body>");
fs.writeFileSync("__reasonstest.html", html);
console.log("probe written");
