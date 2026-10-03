/**
 * Course quiz engine — shared across course sites (rsod2026, prba2026,
 * ...), each keeping its own copy of this file. Mounts a self-grading
 * quiz into a container and POSTs the result to the shared PHP backend
 * in _server/, tagged with which course and lecture page it's on.
 *
 * Usage (top of a lecture .qmd, as raw HTML):
 *   <div id="course-quiz"></div>
 *   <script src="../assets/js/quiz-engine.js"></script>
 *   <script>
 *     CourseQuiz.mount(document.getElementById('course-quiz'), {
 *       course: "rsod2026",
 *       lecture: "wyklad2",
 *       submitUrl: "https://sebastianzajac.pl/rsod-quiz/submit.php",
 *       questions: [ { id, points, diff, text, code, options:[{v,t}] }, ... ]
 *     });
 */
(function (global) {
  "use strict";

  var STYLE_ID = "rsod-quiz-style";
  var CSS =
    "#rsod-quiz{font-family:inherit;max-width:700px;margin:2rem 0;border:1px solid #d7dde4;" +
    "border-radius:10px;padding:20px 22px;background:#fafbfc;}" +
    "#rsod-quiz h3{margin-top:0;}" +
    "#rsod-quiz .rq-field{margin-bottom:16px;display:flex;flex-direction:column;gap:6px;}" +
    "#rsod-quiz input[type=email]{padding:8px 10px;border:1px solid #c7cdd6;border-radius:6px;font-size:.95rem;}" +
    "#rsod-quiz .rq-q{border-top:1px solid #e2e6eb;padding-top:14px;margin-top:14px;}" +
    "#rsod-quiz .rq-q:first-of-type{border-top:none;margin-top:0;padding-top:0;}" +
    "#rsod-quiz .rq-meta{display:flex;justify-content:space-between;font-size:.78rem;color:#6b7684;margin-bottom:4px;}" +
    "#rsod-quiz pre{background:#eef1f5;border-radius:6px;padding:8px 10px;overflow-x:auto;font-size:.85rem;}" +
    "#rsod-quiz .rq-opt{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border-radius:6px;cursor:pointer;}" +
    "#rsod-quiz .rq-opt:hover{background:#eef1f5;}" +
    "#rsod-quiz button.rq-submit{margin-top:14px;background:#33539e;color:#fff;border:none;" +
    "padding:10px 18px;border-radius:7px;font-size:.95rem;cursor:pointer;}" +
    "#rsod-quiz button.rq-submit:disabled{opacity:.5;cursor:not-allowed;}" +
    "#rsod-quiz .rq-result{margin-top:16px;padding:14px 16px;border-radius:8px;background:#e7f4eb;}" +
    "#rsod-quiz .rq-error{margin-top:16px;padding:14px 16px;border-radius:8px;background:#fbebe8;color:#8a2f1f;}" +
    "#rsod-quiz .rq-score{font-size:1.6rem;font-weight:700;}";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  var DISPLAY_LETTERS = ["A", "B", "C", "D"];

  // Fisher-Yates. Grading uses each option's own `v` (submitted as the
  // radio's value), never the on-screen position — shuffling display
  // order only stops "always pick the Nth option" guessing, it can't
  // desync grading.
  function shuffled(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function mount(container, config) {
    injectStyle();
    var questions = config.questions;
    var maxScore = questions.reduce(function (s, q) { return s + q.points; }, 0);

    container.innerHTML =
      "<h3>Test — " + (config.title || config.lecture) + "</h3>" +
      '<form class="rq-form">' +
      '<div class="rq-field"><label for="rq-email"><strong>E-mail</strong></label>' +
      '<input type="email" id="rq-email" required placeholder="imie.nazwisko@wcy.wat.edu.pl"></div>' +
      '<div class="rq-questions"></div>' +
      '<button type="submit" class="rq-submit">Wyślij i pokaż wynik</button>' +
      "</form>" +
      '<div class="rq-output"></div>';

    var qHost = container.querySelector(".rq-questions");
    questions.forEach(function (q, i) {
      var opts = shuffled(q.options)
        .map(function (o, idx) {
          return (
            '<label class="rq-opt"><input type="radio" name="' +
            q.id +
            '" value="' +
            o.v +
            '" required><span><strong>' +
            DISPLAY_LETTERS[idx] +
            ")</strong> " +
            o.t +
            "</span></label>"
          );
        })
        .join("");
      var block = el(
        '<div class="rq-q">' +
          '<div class="rq-meta"><span>Pytanie ' +
          (i + 1) +
          " · " +
          q.points +
          " pkt</span><span>" +
          (q.diff || "") +
          "</span></div>" +
          "<p>" +
          q.text +
          "</p>" +
          (q.code ? "<pre><code>" + q.code.replace(/</g, "&lt;") + "</code></pre>" : "") +
          '<div class="rq-opts">' +
          opts +
          "</div>" +
          "</div>"
      );
      qHost.appendChild(block);
    });

    var form = container.querySelector(".rq-form");
    var output = container.querySelector(".rq-output");
    var submitBtn = container.querySelector(".rq-submit");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = container.querySelector("#rq-email").value.trim();
      var answers = {};
      questions.forEach(function (q) {
        var picked = form.querySelector('input[name="' + q.id + '"]:checked');
        answers[q.id] = picked ? picked.value : null;
      });

      submitBtn.disabled = true;
      submitBtn.textContent = "Wysyłanie…";

      fetch(config.submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, course: config.course, lecture: config.lecture, answers: answers }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error("http_" + r.status);
          return r.json();
        })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || "unknown_error");
          output.innerHTML =
            '<div class="rq-result"><div class="rq-score">' +
            data.score +
            " / " +
            data.maxScore +
            "</div><p>Wynik zapisany dla " +
            email +
            ".</p></div>";
          submitBtn.textContent = "Wynik zapisany";
        })
        .catch(function (err) {
          output.innerHTML =
            '<div class="rq-error">Nie udało się zapisać wyniku (' +
            err.message +
            "). Spróbuj ponownie za chwilę lub napisz do prowadzącego.</div>";
          submitBtn.disabled = false;
          submitBtn.textContent = "Wyślij i pokaż wynik";
        });
    });
  }

  global.CourseQuiz = { mount: mount };
})(window);
