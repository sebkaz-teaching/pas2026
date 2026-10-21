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
  var CSS = "\n#rsod-quiz{font-family:inherit;width:100%;max-width:820px;margin:1.5rem 0 2.5rem;padding:clamp(16px,3vw,32px);border:1px solid #ccd8e4;border-top:5px solid #285680;border-radius:16px;background:#f3f6fa;color:#203247;box-sizing:border-box;box-shadow:0 8px 24px #2032470a}\n#rsod-quiz *{box-sizing:border-box}\n#rsod-quiz .rq-kicker{font-size:.75rem;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:#285680;margin:0 0 8px}\n#rsod-quiz h3{margin:0 0 12px;font-size:1.35rem;line-height:1.4;border:0;padding:0}\n#rsod-quiz .rq-summary{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}\n#rsod-quiz .rq-summary span{padding:4px 10px;background:#e1eaf4;border-radius:20px;font-size:.85rem;font-weight:600}\n#rsod-quiz .rq-instructions{font-size:.95rem;line-height:1.6;margin:0 0 22px;color:#43556a}\n#rsod-quiz .rq-form{display:block;width:100%}\n#rsod-quiz .rq-field{display:flex;flex-direction:column;gap:7px;margin:0 0 24px;padding:18px;background:#fff;border:1px solid #d5dfea;border-radius:10px}\n#rsod-quiz input[type=email]{width:100%;padding:12px;border:1px solid #9aaec2;border-radius:7px;font:inherit;background:white;color:#203247}\n#rsod-quiz .rq-field small{font-size:.8rem;color:#526477}\n#rsod-quiz .rq-questions{display:flex!important;flex-direction:column!important;gap:20px;width:100%}\n#rsod-quiz fieldset.rq-q{display:block;float:none;min-width:0;width:100%;margin:0;padding:20px;border:1px solid #cdd9e5;border-radius:12px;background:#fff}\n#rsod-quiz .rq-q legend{float:none;width:100%;margin:0 0 10px;padding:0;font-size:1.05rem;font-weight:650;line-height:1.6;color:#203247}\n#rsod-quiz .rq-number{color:#285680;font-weight:800}\n#rsod-quiz .rq-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.8rem;color:#56677a;margin:0 0 14px}\n#rsod-quiz pre{background:#eef2f6;border-radius:6px;padding:12px;overflow-x:auto;font-size:.9rem}\n#rsod-quiz .rq-opts{display:flex!important;flex-direction:column!important;gap:9px;width:100%}\n#rsod-quiz label.rq-opt{display:flex!important;float:none;width:100%;gap:12px;align-items:flex-start;margin:0;padding:12px 14px;border:1px solid #d5dfea;border-radius:8px;background:#fff;cursor:pointer;line-height:1.55;font-size:.97rem;text-align:left}\n#rsod-quiz .rq-opt input[type=radio]{flex:0 0 auto;width:18px;height:18px;margin:3px 0 0;accent-color:#285680}\n#rsod-quiz .rq-opt span{min-width:0;overflow-wrap:anywhere}\n#rsod-quiz .rq-opt:hover{background:#f1f6fc;border-color:#829eb9}\n#rsod-quiz .rq-opt:has(input:checked){background:#e8f1fc;border-color:#285680;box-shadow:inset 3px 0 #285680}\n#rsod-quiz .rq-opt:focus-within{outline:3px solid #aac7e5;outline-offset:2px}\n#rsod-quiz input[type=email]:focus-visible,#rsod-quiz button:focus-visible{outline:3px solid #aac7e5;outline-offset:3px}\n#rsod-quiz .rq-footer{margin-top:24px;padding-top:20px;border-top:1px solid #ccd8e4}\n#rsod-quiz .rq-footer p{font-size:.85rem;color:#526477;margin:10px 0 0}\n#rsod-quiz button.rq-submit{padding:13px 22px;background:#285680;color:white;border:0;border-radius:8px;font:inherit;font-weight:650;cursor:pointer;white-space:normal}\n#rsod-quiz button.rq-submit:hover{background:#1e4365}\n#rsod-quiz button.rq-submit:disabled{opacity:.65;cursor:not-allowed}\n#rsod-quiz .rq-result,#rsod-quiz .rq-error{margin-top:20px;padding:18px;border-radius:10px;line-height:1.6}\n#rsod-quiz .rq-result{background:#e7f4eb;border:1px solid #8bb69a;color:#20472d}\n#rsod-quiz .rq-error{background:#fff0ed;border:1px solid #d59889;color:#812d1b}\n#rsod-quiz .rq-score{font-size:1.8rem;font-weight:750}\n@media(max-width:540px){#rsod-quiz fieldset.rq-q{padding:14px}#rsod-quiz label.rq-opt{padding:11px}#rsod-quiz button.rq-submit{width:100%}}\n";

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
      '<p class="rq-kicker">Karta testowa · PAS</p>' +
      "<h3>" + (config.title || config.lecture) + "</h3>" +
      '<div class="rq-summary"><span>' + questions.length + ' pytań</span><span>' + maxScore +
      ' punktów</span><span>Jedna odpowiedź w każdym pytaniu</span></div>' +
      '<p class="rq-instructions">Pracuj samodzielnie. Wpisz e-mail i zaznacz po jednej odpowiedzi we wszystkich pytaniach. Następnie wyślij test, aby otrzymać wynik.</p>' +
      '<form class="rq-form">' +
      '<div class="rq-field"><label for="rq-email"><strong>E-mail</strong></label>' +
      '<input type="email" id="rq-email" required autocomplete="email" aria-describedby="rq-email-help" placeholder="imie.nazwisko@wat.edu.pl"><small id="rq-email-help">Adres pozwoli prowadzącemu przypisać wynik do Ciebie.</small></div>' +
      '<div class="rq-questions"></div>' +
      '<div class="rq-footer"><button type="submit" class="rq-submit">Wyślij test i pokaż wynik</button>' +
      '<p>Po wysłaniu poczekaj na potwierdzenie zapisu i liczbę zdobytych punktów.</p></div>' +
      "</form>" +
      '<div class="rq-output" role="status" aria-live="polite" aria-atomic="true"></div>';

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
        '<fieldset class="rq-q">' +
          '<legend><span class="rq-number">' + (i + 1) + '.</span> ' + q.text + '</legend>' +
          '<div class="rq-meta"><span>Pytanie ' + (i + 1) + ' z ' + questions.length +
          '</span><span>' + q.points + ' pkt · ' + (q.diff || '') + '</span></div>' +
          (q.code ? "<pre><code>" + q.code.replace(/</g, "&lt;") + "</code></pre>" : "") +
          '<div class="rq-opts">' + opts + '</div>' +
          '</fieldset>'
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
          return r.json().then(function (data) {
            if (!r.ok) throw new Error(data.error || "http_" + r.status);
            return data;
          });
        })
        .then(function (data) {
          if (!data.ok) throw new Error(data.error || "unknown_error");
          output.innerHTML =
            '<div class="rq-result"><div class="rq-score">' +
            data.score +
            " / " +
            data.maxScore +
            "</div><p>Wynik zapisany dla " +
            email.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") +
            ".</p></div>";
          submitBtn.textContent = "Wynik zapisany";
          form.querySelectorAll("input").forEach(function (input) { input.disabled = true; });
        })
        .catch(function (err) {
          var message = err.message === "unknown_course_or_lecture"
            ? "Test nie jest jeszcze aktywowany na serwerze. Zgłoś to prowadzącemu; odpowiedzi pozostają na tej stronie."
            : "Nie udało się potwierdzić zapisu wyniku. Zachowaj otwartą stronę i zgłoś problem prowadzącemu.";
          output.innerHTML = '<div class="rq-error"></div>';
          output.querySelector(".rq-error").textContent = message;
          submitBtn.disabled = false;
          submitBtn.textContent = "Wyślij test i pokaż wynik";
        });
    });
  }

  global.CourseQuiz = { mount: mount };
})(window);
