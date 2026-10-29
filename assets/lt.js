/* LT Information — shared page behaviour: top bar, contents list, quizzes, tabs, copy buttons,
   reading progress, previous/next links and the light/dark switch. Plain JS, no libraries. */
(function () {
  'use strict';

  // Course map, in study order. Used for the breadcrumb and the previous/next links.
  var COURSES = [
    { group: 'Client/Server Architecture', pages: [
      ['Client_Server_Course.html', 'Client/Server Architecture & IT Security'],
      ['course_html_LT2025.html', 'Client/Server Architecture: Course Overview'],
      ['_html_20251030_25fce4.html', 'Client/Server Architecture: Extended Edition'],
      ['c-spart2.html', 'Client/Server Part 2: How It Works'],
      ['teirsexplanations.html', 'Architecture Tiers Explained'],
      ['tier.html', 'Tiers: Knowledge Check'],
      ['truefalse-tiers.html', 'Tiers: True or False'],
    ] },
    { group: 'Remote Invocation', pages: [
      ['chapter4.html', 'Chapter 4: Remote Procedure Call (RPC)'],
      ['chapter4corba.html', 'Chapter 4: RMI-IIOP & CORBA'],
      ['paractis.html', 'RMI-IIOP & CORBA: Practice'],
    ] },
    { group: 'Network Programming', pages: [
      ['socket first.html', 'Java Network Programming: Guide'],
      ['socet program slide p1.html', 'Java Network Programming: Slides'],
      ['http.html', 'HTTP & HTTPS'],
    ] },
    { group: 'Cybersecurity', pages: [
      ['Cha1-cyber-25-26.html', 'Chapter 1: Cybersecurity Fundamentals'],
      ['CIA -CYber 25-26.html', 'The CIA Triad'],
      ['security layers.html', 'Security Layers'],
    ] },
  ];
  window.LT_COURSES = COURSES;

  var THEME_KEY = 'lt-theme';
  function storedTheme() { try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; } }
  function saveTheme(v) { try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* private mode */ } }
  var t0 = storedTheme();
  if (t0 === 'light' || t0 === 'dark') document.documentElement.setAttribute('data-theme', t0);

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function href(file) { return encodeURI(file); }
  function currentFile() {
    var p = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    return p || 'index.html';
  }
  function slug(text, used) {
    var base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'section';
    var s = base, i = 2;
    while (used[s] || document.getElementById(s)) s = base + '-' + i++;
    used[s] = 1;
    return s;
  }

  function isDark() {
    var a = document.documentElement.getAttribute('data-theme');
    if (a) return a === 'dark';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function topBar() {
    if (document.querySelector('.lt-top') || document.body.hasAttribute('data-no-top')) return;
    var file = currentFile(), crumb = '';
    COURSES.forEach(function (g) { g.pages.forEach(function (p) { if (p[0] === file) crumb = g.group; }); });
    var bar = el('header', { class: 'lt-top' });
    bar.innerHTML = '<div class="lt-top-in">' +
      '<a class="lt-brand" href="index.html" aria-label="LT Information, all courses"><span class="mark">LT</span><span>LT Information</span></a>' +
      (crumb ? '<span class="lt-crumb">/ ' + esc(crumb) + '</span>' : '') +
      '<span class="spacer"></span>' +
      '<a class="lt-icon-btn" href="index.html">All courses</a>' +
      '<button class="lt-icon-btn" type="button" id="lt-theme" aria-label="Switch light or dark theme"></button>' +
      '</div><div class="lt-progress" aria-hidden="true"></div>';
    document.body.insertBefore(bar, document.body.firstChild);
    var btn = bar.querySelector('#lt-theme');
    function label() { btn.textContent = isDark() ? '☀ Light' : '☾ Dark'; }
    label();
    btn.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      saveTheme(next); label();
    });
    var prog = bar.querySelector('.lt-progress');
    function onScroll() {
      var h = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = (h > 0 ? Math.min(100, (scrollY / h) * 100) : 0) + '%';
    }
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  function toc() {
    var main = document.querySelector('.lt-main'), box = document.querySelector('.lt-toc');
    if (!main || !box) return;
    var used = {}, heads = Array.prototype.slice.call(main.querySelectorAll('h2'))
      .filter(function (h) { return !h.closest('.quiz, .callout, .card, .summary, .slide'); });
    if (!heads.length) { box.hidden = true; return; }
    var ol = el('ol');
    heads.forEach(function (h) {
      if (!h.id) h.id = slug(h.textContent, used);
      var li = el('li'), a = el('a', { href: '#' + h.id });
      a.textContent = h.getAttribute('data-toc') || h.textContent.trim();
      li.appendChild(a); ol.appendChild(li);
    });
    box.innerHTML = '<h2>On this page</h2>'; box.appendChild(ol);
    if (!('IntersectionObserver' in window)) return;
    var links = box.querySelectorAll('a');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  // Quiz markup: .quiz > .q > .opts > button[data-correct]; optional .explain, .quiz-score, .quiz-done, .quiz-reset
  function quizzes() {
    document.querySelectorAll('.quiz').forEach(function (quiz) {
      var qs = quiz.querySelectorAll('.q');
      var score = quiz.querySelector('.quiz-score'), done = quiz.querySelector('.quiz-done');
      function update() {
        var answered = quiz.querySelectorAll('.q.answered').length, right = quiz.querySelectorAll('.q.got-it').length;
        if (score) score.textContent = right + ' / ' + qs.length + ' correct';
        quiz.classList.toggle('finished', answered === qs.length);
        if (done && answered === qs.length) {
          var pct = Math.round((right / qs.length) * 100);
          done.textContent = 'You scored ' + right + ' out of ' + qs.length + ' (' + pct + '%). ' +
            (pct >= 80 ? 'Well done. You know this section.' : pct >= 50 ? 'Good start. Re-read the explanations for the ones you missed.' : 'Review the lesson above, then reset and try again.');
        }
      }
      qs.forEach(function (q) {
        q.querySelectorAll('.opts button').forEach(function (b) {
          b.type = 'button';
          b.addEventListener('click', function () {
            if (q.classList.contains('answered')) return;
            q.classList.add('answered');
            var ok = b.hasAttribute('data-correct');
            if (ok) q.classList.add('got-it'); else b.classList.add('wrong');
            q.querySelectorAll('.opts button').forEach(function (o) {
              o.disabled = true;
              if (o.hasAttribute('data-correct')) o.classList.add('correct');
            });
            update();
          });
        });
      });
      var reset = quiz.querySelector('.quiz-reset');
      if (reset) reset.addEventListener('click', function () {
        qs.forEach(function (q) {
          q.classList.remove('answered', 'got-it');
          q.querySelectorAll('.opts button').forEach(function (o) { o.disabled = false; o.classList.remove('correct', 'wrong'); });
        });
        update();
      });
      update();
    });
  }

  // Tabs markup: .tabs > [role=tablist] > button[role=tab][aria-controls], then [role=tabpanel]
  function tabs() {
    document.querySelectorAll('.tabs').forEach(function (t) {
      var btns = t.querySelectorAll('[role="tab"]');
      function show(b) {
        btns.forEach(function (x) {
          var on = x === b, p = document.getElementById(x.getAttribute('aria-controls'));
          x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
          if (p) p.hidden = !on;
        });
      }
      btns.forEach(function (b) { b.type = 'button'; b.addEventListener('click', function () { show(b); }); });
      if (btns.length) show(t.querySelector('[role="tab"][aria-selected="true"]') || btns[0]);
    });
  }

  function copyButtons() {
    document.querySelectorAll('.lt-main pre').forEach(function (pre) {
      if (pre.querySelector('.copy')) return;
      var b = el('button', { class: 'copy', type: 'button' }, 'Copy');
      b.addEventListener('click', function () {
        var text = (pre.querySelector('code') || pre).innerText.replace(/\nCopy$/, '');
        function ok() { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1400); }
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, function () { select(pre); });
        else select(pre);
      });
      pre.appendChild(b);
    });
    function select(node) { var r = document.createRange(); r.selectNodeContents(node); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
  }

  function pager() {
    var main = document.querySelector('.lt-main');
    if (!main || main.querySelector('.lt-pager')) return;
    var flat = []; COURSES.forEach(function (g) { g.pages.forEach(function (p) { flat.push(p); }); });
    var i = flat.map(function (p) { return p[0]; }).indexOf(currentFile());
    if (i < 0) return;
    var nav = el('nav', { class: 'lt-pager', 'aria-label': 'Previous and next lesson' }), html = '';
    if (i > 0) html += '<a class="prev" href="' + href(flat[i - 1][0]) + '"><span class="dir">← Previous</span><span>' + esc(flat[i - 1][1]) + '</span></a>';
    if (i < flat.length - 1) html += '<a class="next" href="' + href(flat[i + 1][0]) + '"><span class="dir">Next →</span><span>' + esc(flat[i + 1][1]) + '</span></a>';
    nav.innerHTML = html; main.appendChild(nav);
  }

  function footer() {
    if (document.querySelector('.lt-foot')) return;
    document.body.appendChild(el('footer', { class: 'lt-foot' }, '© ' + new Date().getFullYear() + ' LT Information · <a href="index.html">All courses</a>'));
  }

  function init() { topBar(); toc(); quizzes(); tabs(); copyButtons(); pager(); footer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
