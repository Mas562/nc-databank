/* ============================================================
   NC//DATABANK — роутинг, поиск, рендер
   Маршруты: #/  |  #/category/<id>  |  #/article/<id>
   ============================================================ */

(function () {
  "use strict";

  const content = document.getElementById("content");
  const navCategories = document.getElementById("nav-categories");
  const navArticles = document.getElementById("nav-articles");
  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const byId = (id) => DB.articles.find((a) => a.id === id);
  const catById = (id) => DB.categories.find((c) => c.id === id);
  const inCategory = (catId) => DB.articles.filter((a) => a.category === catId);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));

  /* ---------------- сайдбар ---------------- */

  function renderSidebar() {
    navCategories.innerHTML = DB.categories
      .map((cat) => `
        <li>
          <a href="#/category/${cat.id}" data-nav-cat="${cat.id}">
            <span class="nav-cat-icon">${cat.icon}</span>
            ${esc(cat.name)}
            <span class="nav-cat-count">${inCategory(cat.id).length}</span>
          </a>
        </li>`)
      .join("");

    navArticles.innerHTML = DB.articles
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, "ru"))
      .map((a) => `<li><a href="#/article/${a.id}"${a.secret ? ' class="is-secret"' : ""} data-nav-article="${a.id}">${esc(a.title)}</a></li>`)
      .join("");

    document.getElementById("footer-count").textContent = DB.articles.length;
  }

  function highlightNav(route) {
    document
      .querySelectorAll(".sidebar-nav a.is-active")
      .forEach((el) => el.classList.remove("is-active"));

    let selector = null;
    if (route.name === "category") selector = `[data-nav-cat="${route.id}"]`;
    if (route.name === "article") selector = `[data-nav-article="${route.id}"]`;
    if (selector) {
      const link = document.querySelector(selector);
      if (link) link.classList.add("is-active");
    }
  }

  /* ---------------- шаблоны ---------------- */

  function cardHTML(article, i = 0) {
    const cat = catById(article.category);
    const excerpt = article.subtitle || "";
    return `
      <a class="card reveal" style="--i:${i % 6}" href="#/article/${article.id}">
        <span class="card-cat">${cat ? esc(cat.name) : ""}</span>
        <h3 class="card-title">${esc(article.title)}</h3>
        <p class="card-excerpt">${esc(excerpt)}</p>
      </a>`;
  }

  function breadcrumbsHTML(parts) {
    const items = [`<a href="#/">Главная</a>`, ...parts];
    return `<nav class="breadcrumbs" aria-label="Хлебные крошки">${items.join('<span class="crumb-sep">//</span>')}</nav>`;
  }

  /* ---------------- страницы ---------------- */

  function renderHome() {
    const featured = DB.articles.filter((a) => a.featured);

    content.innerHTML = `
      <section class="home-hero glitch-in">
        <div>
          <h1 class="home-title">База данных<br><span class="accent glitch" data-text="Найт-Сити" data-decode>Найт-Сити</span></h1>
          <p class="home-sub">Неофициальная энциклопедия по вселенной Cyberpunk 2077: люди, улицы, корпорации и технологии города, в котором есть миллион способов умереть.</p>
        </div>
        <div class="home-stats">
          <div class="stat"><div class="stat-num" data-count="${DB.articles.length}">${DB.articles.length}</div><div class="stat-label">записей в базе</div></div>
          <div class="stat"><div class="stat-num" data-count="${DB.categories.length}">${DB.categories.length}</div><div class="stat-label">разделов</div></div>
          <div class="stat"><div class="stat-num" data-count="2077">2077</div><div class="stat-label">текущий год</div></div>
          <div class="stat"><div class="stat-num" data-count="7" data-suffix="M">7M</div><div class="stat-label">население НС</div></div>
        </div>
      </section>

      ${tickerHTML()}

      <div class="section-heading"><h2>Избранные записи</h2><span class="rule"></span></div>
      <div class="card-grid">${featured.map(cardHTML).join("")}</div>

      <div class="section-heading"><h2>Разделы базы</h2><span class="rule"></span></div>
      <div class="category-row">
        ${DB.categories
          .map((cat, i) => `
            <a class="category-chip reveal" style="--i:${i}" href="#/category/${cat.id}">
              ${cat.icon} ${esc(cat.name)}
              <span class="chip-count">[${inCategory(cat.id).length}]</span>
            </a>`)
          .join("")}
      </div>

      <div class="section-heading"><h2>Хронология мира</h2><span class="rule"></span></div>
      <ol class="timeline">${timelineHTML()}</ol>`;

    document.title = "NC//DATABANK — энциклопедия Cyberpunk 2077";
  }

  function renderCategory(catId) {
    const cat = catById(catId);
    if (!cat) return renderNotFound();

    const articles = inCategory(catId);

    content.innerHTML = `
      ${breadcrumbsHTML([`<span>${esc(cat.name)}</span>`])}
      <header class="category-header glitch-in">
        <h1 class="category-title">${cat.icon} <span class="glitch" data-text="${esc(cat.name)}" data-decode>${esc(cat.name)}</span></h1>
        <p class="category-desc">${esc(cat.desc)}</p>
      </header>
      <div class="card-grid">${articles.map(cardHTML).join("")}</div>`;

    document.title = `${cat.name} — NC//DATABANK`;
  }

  function renderArticle(id) {
    const article = byId(id);
    if (!article) return renderNotFound();

    const cat = catById(article.category);

    const infoboxRows = Object.entries(article.infobox || {})
      .map(([key, val]) => `
        <div class="infobox-row">
          <div class="infobox-key">${esc(key)}</div>
          <div class="infobox-val">${esc(val)}</div>
        </div>`)
      .join("");

    const sections = (article.sections || [])
      .map((s) => `<h2>${esc(s.heading)}</h2>${s.html}`)
      .join("");

    const relatedArticles = (article.related || [])
      .map(byId)
      .filter(Boolean);

    const relatedHTML = relatedArticles.length
      ? `<section class="related">
           <h3 class="related-title">// Связанные записи</h3>
           <div class="related-links">
             ${relatedArticles
               .map((r) => `<a class="related-link" href="#/article/${r.id}">${esc(r.title)}</a>`)
               .join("")}
           </div>
         </section>`
      : "";

    content.innerHTML = `
      ${breadcrumbsHTML([
        `<a href="#/category/${article.category}">${cat ? esc(cat.name) : ""}</a>`,
        `<span>${esc(article.title)}</span>`
      ])}
      <article class="glitch-in">
        <header class="article-header">
          <span class="article-cat-chip">${cat ? esc(cat.name) : ""}</span>${article.secret ? '<span class="article-secret-chip">// BREACH PROTOCOL: РАСШИФРОВАНО</span>' : ""}
          <h1 class="article-title glitch" data-text="${esc(article.title)}" data-decode>${esc(article.title)}</h1>
          <p class="article-subtitle">${esc(article.subtitle || "")}</p>
          <button class="bd-enter-btn" data-bd="${article.id}" type="button"><span class="bd-enter-icon">▶</span> Воспроизвести брейнданс</button>
        </header>
        <div class="article-body-wrap">
          <div class="article-body">${sections}${relatedHTML}</div>
          <aside class="infobox" aria-label="Краткая информация">
            <div class="infobox-header">
              <div class="infobox-label">// Досье</div>
              <p class="infobox-name">${esc(article.title)}</p>
            </div>
            <div class="infobox-rows">${infoboxRows}</div>
          </aside>
        </div>
      </article>`;

    document.title = `${article.title} — NC//DATABANK`;
  }

  function renderNotFound() {
    content.innerHTML = `
      <div class="not-found">
        <div class="not-found-code">404</div>
        <p class="not-found-msg">ЗАПИСЬ НЕ НАЙДЕНА ИЛИ УДАЛЕНА НЕТСТОРОЖЕМ</p>
        <a href="#/">// вернуться в базу данных</a>
      </div>`;
    document.title = "404 — NC//DATABANK";
  }

  /* ---------------- роутер ---------------- */

  function parseRoute() {
    const hash = location.hash.replace(/^#\/?/, "");
    const [name, id] = hash.split("/");
    if (!name) return { name: "home" };
    if (name === "category" && id) return { name: "category", id };
    if (name === "article" && id) return { name: "article", id };
    return { name: "notfound" };
  }

  function route() {
    const r = parseRoute();
    if (r.name === "home") renderHome();
    else if (r.name === "category") renderCategory(r.id);
    else if (r.name === "article") renderArticle(r.id);
    else renderNotFound();

    document.body.classList.toggle("route-article", r.name === "article");
    highlightNav(r);
    closeSearch();
    sidebar.classList.remove("is-open");
    content.scrollIntoView({ block: "start", behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
    fxOnRoute();
  }

  /* ============================================================
     Глитч-эффекты
     ============================================================ */

  const GLITCH_CHARS = "!<>-_\\/[]{}=+*^?#@$%&01ラドクリヲネオサイバ";
  const glitchFlash = document.getElementById("glitch-flash");
  const statusLine = document.getElementById("status-line");
  const logo = document.querySelector(".logo");

  // эффект «дешифровки»: текст собирается из случайных символов
  function decodeText(el, duration = 550) {
    if (REDUCED_MOTION) return;
    const finalText = el.dataset.text || el.textContent;
    const len = finalText.length;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const resolved = Math.floor(t * len);
      let out = finalText.slice(0, resolved);
      for (let i = resolved; i < len; i++) {
        out += finalText[i] === " "
          ? " "
          : GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }

  // короткий RGB-глитч на элементе с классом .glitch
  function burstGlitch(el) {
    if (REDUCED_MOTION || !el) return;
    el.classList.remove("is-glitching");
    void el.offsetWidth; // перезапуск CSS-анимации
    el.classList.add("is-glitching");
    setTimeout(() => el.classList.remove("is-glitching"), 400);
  }

  // вызывается после каждой смены страницы
  function fxOnRoute() {
    observeReveals();
    if (REDUCED_MOTION) return;
    animateCounters();

    glitchFlash.classList.remove("is-active");
    void glitchFlash.offsetWidth;
    glitchFlash.classList.add("is-active");

    content.querySelectorAll("[data-decode]").forEach((el) => {
      decodeText(el);
      setTimeout(() => burstGlitch(el), 650);
    });
  }

  // случайные амбиентные глитчи: раз в 4–10 секунд дёргаем случайный заголовок
  function ambientGlitchLoop() {
    if (REDUCED_MOTION) return;
    const delay = 4000 + Math.random() * 6000;
    setTimeout(() => {
      const targets = document.querySelectorAll(".glitch");
      if (targets.length && Math.random() < 0.8) {
        burstGlitch(targets[(Math.random() * targets.length) | 0]);
      } else {
        logo.classList.add("is-glitching");
        setTimeout(() => logo.classList.remove("is-glitching"), 550);
      }
      ambientGlitchLoop();
    }, delay);
  }

  // живая строка статуса в шапке
  const STATUS_MESSAGES = [
    "СОЕДИНЕНИЕ СТАБИЛЬНО",
    "ICE: АКТИВЕН",
    "ТРАФИК ЗАШИФРОВАН",
    "СЛЕДОВ НЕ ОБНАРУЖЕНО",
    "ПИНГ ДО УЗЛА: 12МС",
    "ДЕМОНОВ В СЕТИ: 0"
  ];
  const STATUS_WARNINGS = [
    "ВНИМАНИЕ: СКАНИРОВАНИЕ СЕТИ",
    "ОБНАРУЖЕН НЕТРАННЕР",
    "СБОЙ СЕГМЕНТА ДАННЫХ"
  ];

  function statusTickerLoop() {
    if (REDUCED_MOTION || !statusLine) return;
    setTimeout(() => {
      const isWarning = Math.random() < 0.12;
      const pool = isWarning ? STATUS_WARNINGS : STATUS_MESSAGES;
      const msg = pool[(Math.random() * pool.length) | 0];

      statusLine.classList.toggle("meta-warn", isWarning);
      statusLine.dataset.text = msg;
      decodeText(statusLine, 350);

      if (isWarning) {
        // тревога недолгая: возвращаем обычный статус
        setTimeout(() => {
          statusLine.classList.remove("meta-warn");
          statusLine.dataset.text = STATUS_MESSAGES[0];
          decodeText(statusLine, 350);
        }, 2600);
      }
      statusTickerLoop();
    }, 5000 + Math.random() * 4000);
  }

  /* ============================================================
     Тикер и хронология (главная)
     ============================================================ */

  function tickerHTML() {
    if (!DB.ticker || !DB.ticker.length) return "";
    const items = DB.ticker
      .map((t) => `<span class="ticker-item">${esc(t)}</span>`)
      .join('<span class="ticker-sep">///</span>');
    const group = `<div class="ticker-group">${items}<span class="ticker-sep">///</span></div>`;
    return `
      <div class="ticker">
        <span class="ticker-label">СВОДКА N54</span>
        <div class="ticker-viewport">
          <div class="ticker-track">${group}<div aria-hidden="true" class="ticker-clone">${group}</div></div>
        </div>
      </div>`;
  }

  function timelineHTML() {
    return (DB.timeline || [])
      .map((t, i) => `
        <li class="tl-item reveal" style="--i:${i % 6}">
          <span class="tl-year">${esc(t.year)}</span>
          <div>
            <h3 class="tl-title">${t.link ? `<a href="#/article/${t.link}">${esc(t.title)}</a>` : esc(t.title)}</h3>
            <p class="tl-text">${esc(t.text)}</p>
          </div>
        </li>`)
      .join("");
  }

  /* ============================================================
     Появление блоков при скролле
     ============================================================ */

  const revealObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            revealObserver.unobserve(el);
            el.classList.add("is-visible");
            el.addEventListener("animationend", function onEnd(e) {
              if (e.target !== el) return;
              el.removeEventListener("animationend", onEnd);
              // возвращаем карточку к обычным hover-стилям
              el.classList.remove("reveal", "is-visible");
            });
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
      )
    : null;

  function observeReveals() {
    const els = content.querySelectorAll(".reveal");
    if (REDUCED_MOTION || !revealObserver) {
      els.forEach((el) => el.classList.remove("reveal"));
      return;
    }
    els.forEach((el) => revealObserver.observe(el));
  }

  /* ---------------- анимированные счётчики статистики ---------------- */

  function animateCounters() {
    content.querySelectorAll("[data-count]").forEach((el) => {
      const target = parseInt(el.dataset.count, 10);
      if (!Number.isFinite(target)) return;
      const suffix = el.dataset.suffix || "";
      const start = performance.now();
      const duration = 900;

      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------------- тилт и подсветка карточек ---------------- */

  function initCardTilt() {
    if (REDUCED_MOTION || !window.matchMedia("(pointer: fine)").matches) return;

    document.addEventListener(
      "pointermove",
      (e) => {
        const card = e.target.closest(".card");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        card.style.setProperty("--ry", ((px - 0.5) * 5).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * 5).toFixed(2) + "deg");
      },
      { passive: true }
    );

    document.addEventListener(
      "pointerout",
      (e) => {
        const card = e.target.closest(".card");
        if (!card || card.contains(e.relatedTarget)) return;
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      },
      { passive: true }
    );
  }

  /* ---------------- загрузочный экран (раз за сессию) ---------------- */

  function bootSequence() {
    if (REDUCED_MOTION) return;
    let seen = false;
    try {
      seen = !!sessionStorage.getItem("nc-boot");
      sessionStorage.setItem("nc-boot", "1");
    } catch (e) { /* приватный режим — просто показываем */ }
    if (seen) return;

    const overlay = document.createElement("div");
    overlay.className = "boot";
    overlay.setAttribute("aria-hidden", "true");
    const log = document.createElement("div");
    log.className = "boot-log";
    overlay.appendChild(log);
    document.body.appendChild(overlay);

    const lines = [
      "NC//DATABANK · ЗАГРУЗЧИК v2.77",
      "> ИНИЦИАЛИЗАЦИЯ ЯДРА .......... ОК",
      "> УЗЕЛ NET://WATSON.SEC-7 ..... ОК",
      "> ОБХОД ICE ................... ОК",
      `> ЗАГРУЗКА ЗАПИСЕЙ [${DB.articles.length}] ....... ОК`,
      "> ДОСТУП РАЗРЕШЁН. ДОБРО ПОЖАЛОВАТЬ."
    ];

    let closed = false;
    function close() {
      if (closed) return;
      closed = true;
      overlay.classList.add("is-done");
      setTimeout(() => overlay.remove(), 450);
    }
    overlay.addEventListener("click", close);

    let i = 0;
    (function next() {
      if (closed) return;
      if (i >= lines.length) {
        setTimeout(close, 500);
        return;
      }
      const row = document.createElement("div");
      if (i === lines.length - 1) row.className = "boot-ok";
      row.dataset.text = lines[i];
      log.appendChild(row);
      decodeText(row, 180);
      i++;
      setTimeout(next, 170);
    })();
  }

  /* ---------------- поиск ---------------- */

  let activeIndex = -1;

  function searchArticles(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return DB.articles
      .map((a) => {
        const title = a.title.toLowerCase();
        const sub = (a.subtitle || "").toLowerCase();
        const body = (a.sections || []).map((s) => s.html).join(" ").toLowerCase();
        let score = 0;
        if (title.includes(q)) score += title.startsWith(q) ? 100 : 50;
        if (sub.includes(q)) score += 20;
        if (body.includes(q)) score += 5;
        return { a, score };
      })
      .filter((r) => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
      .map((r) => r.a);
  }

  function renderSearchResults(results, query) {
    activeIndex = -1;
    if (!query.trim()) return closeSearch();

    if (!results.length) {
      searchResults.innerHTML = `<div class="search-empty">// ничего не найдено по запросу «${esc(query)}»</div>`;
    } else {
      searchResults.innerHTML = results
        .map((a) => {
          const cat = catById(a.category);
          return `
            <a class="search-result" href="#/article/${a.id}">
              <div class="search-result-cat">${cat ? esc(cat.name) : ""}</div>
              <div class="search-result-title">${esc(a.title)}</div>
            </a>`;
        })
        .join("");
    }
    searchResults.hidden = false;
  }

  function closeSearch() {
    searchResults.hidden = true;
    activeIndex = -1;
  }

  searchInput.addEventListener("input", () => {
    renderSearchResults(searchArticles(searchInput.value), searchInput.value);
  });

  searchInput.addEventListener("keydown", (e) => {
    const items = Array.from(searchResults.querySelectorAll(".search-result"));
    if (e.key === "Escape") {
      searchInput.value = "";
      closeSearch();
      searchInput.blur();
      return;
    }
    if (!items.length) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = e.key === "ArrowDown"
        ? (activeIndex + 1) % items.length
        : (activeIndex - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle("is-active", i === activeIndex));
      items[activeIndex].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex].click();
      searchInput.value = "";
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search")) closeSearch();
  });

  // горячая клавиша "/" — фокус на поиск
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------- мобильный сайдбар ---------------- */

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("is-open");
  });

  /* ---------------- случайная запись ---------------- */

  content.addEventListener("click", function (e) {
    var b = e.target.closest(".bd-enter-btn");
    if (b && b.dataset.bd) openBraindance(b.dataset.bd);
  });

  const randomBtn = document.getElementById("random-btn");
  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      const current = parseRoute();
      let pick;
      do {
        pick = DB.articles[(Math.random() * DB.articles.length) | 0];
      } while (DB.articles.length > 1 && current.name === "article" && pick.id === current.id);
      location.hash = "#/article/" + pick.id;
    });
  }

  /* ---------------- терминал ---------------- */

  let terminalOpen = false;
  let terminalHistory = [];
  let historyIndex = -1;
  let terminalNoiseEnabled = true;
  let tapTimes = [];

  function toggleTerminal() {
    if (terminalOpen) {
      closeTerminal();
    } else {
      openTerminal();
    }
  }

  function openTerminal() {
    if (terminalOpen) return;
    terminalOpen = true;

    const overlay = document.createElement("div");
    overlay.className = "terminal-overlay";
    overlay.id = "terminal";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="terminal-header">
        <span class="terminal-title">NC//DATABANK :: TERMINAL v2.77</span>
        <span class="terminal-close">[ESC] закрыть</span>
      </div>
      <div class="terminal-body" id="terminal-body">
        <div class="terminal-line terminal-welcome">ДОБРО ПОЖАЛОВАТЬ В ТЕРМИНАЛ NC//DATABANK</div>
        <div class="terminal-line">ВВЕДИТЕ "help" ДЛЯ СПИСКА КОМАНД</div>
        <div class="terminal-line terminal-sep">\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</div>
      </div>
      <div class="terminal-input-line">
        <span class="terminal-prompt">NC//DB&gt;</span>
        <input type="text" class="terminal-input" id="terminal-input" spellcheck="false" autocomplete="off" aria-label="Терминал">
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-active"));

    const input = document.getElementById("terminal-input");
    setTimeout(() => input && input.focus(), 100);
    input.addEventListener("keydown", handleTerminalKey);

    const body = document.getElementById("terminal-body");
    body.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        setTimeout(closeTerminal, 50);
      }
    });
  }

  function closeTerminal() {
    const overlay = document.getElementById("terminal");
    if (overlay) {
      overlay.classList.remove("is-active");
      setTimeout(() => overlay.remove(), 250);
    }
    terminalOpen = false;
    historyIndex = -1;
  }

  function terminalWrite(html, className) {
    const body = document.getElementById("terminal-body");
    if (!body) return;
    const line = document.createElement("div");
    line.className = "terminal-line" + (className ? " " + className : "");
    line.innerHTML = html;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
  }

  function terminalWriteSlow(text, className, speed) {
    if (REDUCED_MOTION) {
      terminalWrite(text, className);
      return;
    }
    const body = document.getElementById("terminal-body");
    if (!body) return;
    const line = document.createElement("div");
    line.className = "terminal-line" + (className ? " " + className : "");
    body.appendChild(line);

    let i = 0;
    function type() {
      if (!document.getElementById("terminal")) return;
      if (i < text.length) {
        line.textContent += text[i];
        i++;
        body.scrollTop = body.scrollHeight;
        setTimeout(type, speed || 12);
      }
    }
    type();
  }

  function handleTerminalKey(e) {
    const input = e.target;

    if (e.key === "Enter") {
      const cmd = input.value.trim();
      input.value = "";
      terminalWrite("<span class=\"terminal-prompt-inline\">NC//DB&gt;</span> " + esc(cmd));
      executeTerminalCommand(cmd);
      return;
    }

    if (e.key === "Escape") {
      closeTerminal();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!terminalHistory.length) return;
      if (historyIndex < 0) historyIndex = terminalHistory.length;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = terminalHistory[historyIndex];
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!terminalHistory.length) return;
      historyIndex = Math.min(terminalHistory.length, historyIndex + 1);
      input.value = historyIndex >= terminalHistory.length ? "" : terminalHistory[historyIndex];
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const partial = input.value.toLowerCase();
      const commands = ["help", "scan", "lookup", "ping", "noise", "clear", "echo", "whoami", "date", "exit", "glitch", "reboot", "breach", "braindance"];
      const match = commands.find((c) => c.startsWith(partial) && c !== partial);
      if (match) input.value = match;
    }
  }

  function executeTerminalCommand(cmd) {
    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (cmd) {
      terminalHistory.push(cmd);
      historyIndex = terminalHistory.length;
    }

    switch (command) {
      case "help":   showHelp(); break;
      case "scan":   cmdScan(); break;
      case "lookup":
      case "open":   cmdLookup(args.join(" ")); break;
      case "ping":   cmdPing(); break;
      case "noise":  cmdNoise(); break;
      case "clear":  cmdClear(); break;
      case "echo":   terminalWrite(esc(args.join(" "))); break;
      case "whoami": cmdWhoami(); break;
      case "date":   cmdDate(); break;
      case "exit":
      case "quit":   closeTerminal(); break;
      case "graph":  closeTerminal(); openGraph(); break;
      case "sound":
      case "audio":  closeTerminal(); toggleSound(); break;
      case "glitch": cmdGlitch(); break;
      case "breach": closeTerminal(); openBreach(); break;
      case "bd":
      case "braindance": {
        var _r = parseRoute();
        if (_r.name === "article" && byId(_r.id)) { closeTerminal(); openBraindance(_r.id); }
        else terminalWriteSlow("БРЕЙНДАНС ДОСТУПЕН ТОЛЬКО НА СТРАНИЦЕ ЗАПИСИ.", "terminal-error");
        break;
      }
      case "reboot": cmdReboot(); break;
      case "":       break;
      default:
        terminalWriteSlow("НЕИЗВЕСТНАЯ КОМАНДА: " + command + ". ВВЕДИТЕ \"help\".", "terminal-error");
    }
  }

  function showHelp() {
    [
      "ДОСТУПНЫЕ КОМАНДЫ:",
      "  help        — этот список",
      "  scan        — сканировать текущую страницу",
      "  lookup ID   — перейти к статье",
      "  ping        — проверить соединение с узлом",
      "  noise       — вкл/выкл glitch-эффекты",
      "  clear       — очистить терминал",
      "  echo TEXT   — вывести текст",
      "  whoami      — информация об узле",
      "  date        — системное время",
      "  glitch      — принудительный глитч",
      "  reboot      — перезагрузка терминала",
      "  graph       — открыть граф знаний",
      "  breach      — взлом протокола: мини-игра, открывает скрытые записи",
      "  braindance  — режим брейнданс для текущей статьи",
      "  sound       — вкл/выкл звуковую атмосферу",
      "  exit        — закрыть терминал"
    ].forEach((l) => terminalWrite(l));
  }

  function cmdScan() {
    const r = parseRoute();
    const info = ["СКАНИРОВАНИЕ УЗЛА..."];
    if (r.name === "home") {
      info.push("  УЗЕЛ: NC//DB::ГЛАВНАЯ");
      info.push("  ЗАПИСЕЙ В БАЗЕ: " + DB.articles.length);
      info.push("  РАЗДЕЛОВ: " + DB.categories.length);
      info.push("  ИЗБРАННЫХ: " + DB.articles.filter((a) => a.featured).length);
    } else if (r.name === "category") {
      const cat = catById(r.id);
      if (cat) {
        info.push("  УЗЕЛ: NC//CAT::" + r.id);
        info.push("  РАЗДЕЛ: " + cat.name);
        info.push("  ЗАПИСЕЙ: " + inCategory(r.id).length);
        info.push("  СТАТУС: ДОСТУПЕН");
      }
    } else if (r.name === "article") {
      const a = byId(r.id);
      if (a) {
        const c = catById(a.category);
        info.push("  УЗЕЛ: NC//ART::" + a.id);
        info.push("  ЗАГОЛОВОК: " + a.title);
        info.push("  РАЗДЕЛ: " + (c ? c.name : "Н/Д"));
        info.push("  СВЯЗЕЙ: " + (a.related || []).length);
        info.push("  РАЗДЕЛОВ: " + (a.sections || []).length);
        info.push("  СТАТУС: " + (a.featured ? "ИЗБРАННАЯ" : "СТАНДАРТНАЯ"));
      }
    } else if (r.name === "notfound") {
      info.push("  ОШИБКА: ЗАПИСЬ НЕ НАЙДЕНА");
    }
    info.push("СКАНИРОВАНИЕ ЗАВЕРШЕНО.");
    info.forEach((l) => terminalWriteSlow(l, "", 8));
  }

  function cmdLookup(query) {
    if (!query) {
      terminalWriteSlow("ИСПОЛЬЗОВАНИЕ: lookup <ID СТАТЬИ>", "terminal-error");
      return;
    }
    const article = byId(query);
    if (article) {
      terminalWriteSlow("ПЕРЕХОД К СТАТЬЕ: " + article.title + "...");
      setTimeout(() => {
        closeTerminal();
        location.hash = "#/article/" + article.id;
      }, 400);
    } else {
      const similar = DB.articles.filter((a) =>
        a.id.indexOf(query) !== -1 || a.title.toLowerCase().indexOf(query.toLowerCase()) !== -1
      );
      if (similar.length) {
        terminalWriteSlow("ЗАПИСЬ \"" + query + "\" НЕ НАЙДЕНА. ВОЗМОЖНО, ВЫ ИМЕЛИ В ВИДУ:");
        similar.slice(0, 5).forEach((a) => {
          terminalWrite("  <a href=\"#/article/" + a.id + "\" class=\"terminal-link\">" + a.id + "</a> — " + esc(a.title));
        });
      } else {
        terminalWriteSlow("ОШИБКА: ЗАПИСЬ \"" + query + "\" НЕ НАЙДЕНА.", "terminal-error");
      }
    }
  }

  function cmdPing() {
    const delays = [12, 16, 22, 8, 31, 14];
    const delay = delays[(Math.random() * delays.length) | 0];
    terminalWriteSlow("ПИНГ УЗЛА NET://WATSON.SEC-7...");
    setTimeout(() => {
      terminalWriteSlow("ОТВЕТ: " + delay + "МС");
      terminalWriteSlow("СТАТУС: " + (delay < 20 ? "СТАБИЛЬНО" : "НЕСТАБИЛЬНО"));
      if (delay > 25) {
        terminalWriteSlow("ПРЕДУПРЕЖДЕНИЕ: ПОТЕРЯ ПАКЕТОВ 3%", "terminal-warn");
      }
    }, 300 + Math.random() * 400);
  }

  function cmdNoise() {
    terminalNoiseEnabled = !terminalNoiseEnabled;
    const status = terminalNoiseEnabled ? "ВКЛЮЧЕНЫ" : "ОТКЛЮЧЕНЫ";
    terminalWriteSlow("GLITCH-ЭФФЕКТЫ: " + status);
    document.body.classList.toggle("noise-off", !terminalNoiseEnabled);
  }

  function cmdClear() {
    const body = document.getElementById("terminal-body");
    if (body) body.innerHTML = "";
  }

  function cmdWhoami() {
    const r = parseRoute();
    terminalWriteSlow("NC//DATABANK :: ИНФОРМАЦИЯ ОБ УЗЛЕ");
    terminalWrite("  УЗЕЛ:      NET://WATSON.SEC-7");
    terminalWrite("  ВЕРСИЯ:    NC//DB v2.77");
    terminalWrite("  ICE:       АКТИВЕН");
    terminalWrite("  СТАТУС:    ПОДКЛЮЧЁН");
    terminalWrite("  СТРАНИЦА:  " + r.name.toUpperCase() + (r.id ? "::" + r.id : ""));
  }

  function cmdDate() {
    const now = new Date();
    const y = 2077;
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    terminalWriteSlow("СИСТЕМНОЕ ВРЕМЯ: " + y + "." + m + "." + d + " " + h + ":" + min);
    terminalWrite("ТОЧНОСТЬ: +/- 0.02МС");
  }

  function cmdGlitch() {
    terminalWriteSlow("ИНИЦИИРУЮ ПРИНУДИТЕЛЬНЫЙ ГЛИТЧ...");
    setTimeout(() => {
      const flash = document.getElementById("glitch-flash");
      if (flash) {
        flash.classList.remove("is-active");
        void flash.offsetWidth;
        flash.classList.add("is-active");
      }
      document.querySelectorAll(".glitch[data-decode]").forEach((el) => {
        const text = el.dataset.text;
        el.dataset.text = "";
        setTimeout(() => {
          el.dataset.text = text;
          decodeText(el);
        }, 30);
      });
      terminalWriteSlow("ГЛИТЧ ВЫПОЛНЕН.");
    }, 200);
  }

  function cmdReboot() {
    terminalWriteSlow("ПЕРЕЗАГРУЗКА ТЕРМИНАЛА...");
    setTimeout(() => terminalWrite("."), 200);
    setTimeout(() => terminalWrite(".."), 400);
    setTimeout(() => terminalWrite("..."), 600);
    setTimeout(() => {
      cmdClear();
      terminalWrite("NC//DATABANK :: ТЕРМИНАЛ v2.77", "terminal-welcome");
      terminalWrite("ЗАГРУЗКА ЗАВЕРШЕНА.");
    }, 800);
  }

  /* ---------------- граф знаний ---------------- */

  const CATEGORY_COLORS = {
    characters: "#f0e51e",
    locations:  "#5bd6dd",
    corps:      "#f5484f",
    gangs:      "#4ade80",
    tech:       "#a78bfa",
    events:     "#fb923c"
  };

  const CATEGORY_ORDER = ["characters", "locations", "corps", "gangs", "tech", "events"];

  let graphOpen = false;
  let graphAnimId = null;

  function toggleGraph() {
    if (graphOpen) closeGraph();
    else openGraph();
  }

  function openGraph() {
    if (graphOpen) return;
    graphOpen = true;

    const overlay = document.createElement("div");
    overlay.className = "graph-overlay";
    overlay.id = "graph-overlay";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML = `
      <div class="graph-header">
        <span class="graph-title"><span class="graph-title-dim">NC//DATABANK ::</span> ГРАФ ЗНАНИЙ<span class="graph-title-caret">▮</span></span>
        <span class="graph-close">[ESC] закрыть · колесо / пинч — зум · тащи — панорама</span>
      </div>
      <div class="graph-body" id="graph-body">
        <div class="graph-grid" aria-hidden="true"></div>
        <svg class="graph-svg" id="graph-svg"></svg>
        <div class="graph-scanline" aria-hidden="true"></div>
        <div class="graph-frame" aria-hidden="true"></div>
        <div class="graph-stats" id="graph-stats" aria-hidden="true"></div>
        <div class="graph-hud" id="graph-hud" aria-hidden="true">
          <div class="graph-hud-title">// СКАНЕР УЗЛОВ</div>
          <div class="graph-hud-body" id="graph-hud-body"></div>
        </div>
      </div>
      <div class="graph-footer" id="graph-footer"></div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-active"));

    const bodyEl = document.getElementById("graph-body");
    const svg = document.getElementById("graph-svg");

    var w = bodyEl.clientWidth || 800;
    var h = bodyEl.clientHeight || 600;
    var cx = w / 2, cy = h / 2;

    function sizeSvg() {
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("width", w);
      svg.setAttribute("height", h);
    }
    sizeSvg();

    const NS = "http://www.w3.org/2000/svg";

    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML = [
      '<filter id="graph-glow" x="-60%" y="-60%" width="220%" height="220%">',
      '<feGaussianBlur stdDeviation="2.5" result="blur"/>',
      "<feMerge><feMergeNode in=\"blur\"/><feMergeNode in=\"SourceGraphic\"/></feMerge>",
      "</filter>"
    ].join("");
    svg.appendChild(defs);

    const edgesG = document.createElementNS(NS, "g");
    const nodesG = document.createElementNS(NS, "g");
    const labelsG = document.createElementNS(NS, "g");
    svg.appendChild(edgesG);
    svg.appendChild(nodesG);
    svg.appendChild(labelsG);

    /* ---- данные ---- */
    const nodeMap = {};
    const nodes = DB.articles.map(function (a) {
      var n = {
        id: a.id, title: a.title, category: a.category, featured: a.featured,
        x: 0, y: 0, vx: 0, vy: 0, connections: 0, radius: 8
      };
      nodeMap[n.id] = n;
      return n;
    });

    DB.articles.forEach(function (a) {
      (a.related || []).forEach(function (rId) {
        if (nodeMap[rId]) {
          nodeMap[a.id].connections++;
          nodeMap[rId].connections++;
        }
      });
    });

    var maxC = Math.max.apply(null, nodes.map(function (n) { return n.connections; })) || 1;
    var hubMin = Math.max(3, Math.ceil(maxC * 0.55));
    nodes.forEach(function (n) { n.radius = 7 + (n.connections / maxC) * 15; });

    /* якоря категорий: каждый раздел тяготеет к своему сектору круга */
    var anchors = {};
    function computeAnchors() {
      var present = CATEGORY_ORDER.filter(function (c) {
        return nodes.some(function (n) { return n.category === c; });
      });
      present.forEach(function (c, i) {
        var ang = (i / present.length) * Math.PI * 2 - Math.PI / 2;
        var r = Math.min(w, h) * 0.32;
        anchors[c] = { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
      });
    }
    computeAnchors();

    nodes.forEach(function (n) {
      var an = anchors[n.category] || { x: cx, y: cy };
      n.x = an.x + (Math.random() - 0.5) * 90;
      n.y = an.y + (Math.random() - 0.5) * 90;
    });

    var edgeSet = {};
    var edges = [];
    DB.articles.forEach(function (a) {
      (a.related || []).forEach(function (rId) {
        if (!nodeMap[rId]) return;
        var key = a.id < rId ? a.id + "::" + rId : rId + "::" + a.id;
        if (edgeSet[key]) return;
        edgeSet[key] = true;
        edges.push({ source: nodeMap[a.id], target: nodeMap[rId] });
      });
    });

    var neighbors = {};
    edges.forEach(function (e) {
      (neighbors[e.source.id] = neighbors[e.source.id] || {})[e.target.id] = true;
      (neighbors[e.target.id] = neighbors[e.target.id] || {})[e.source.id] = true;
    });

    /* ---- элементы ---- */
    var edgeEls = edges.map(function (e) {
      var line = document.createElementNS(NS, "line");
      line.setAttribute("class", "graph-edge");
      edgesG.appendChild(line);
      return { el: line, edge: e };
    });

    var nodeEls = nodes.map(function (n) {
      var color = CATEGORY_COLORS[n.category] || "#7d7d8c";

      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "graph-node" + (n.connections >= hubMin ? " is-hub" : ""));

      var ring = document.createElementNS(NS, "circle");
      ring.setAttribute("class", "graph-node-ring");
      ring.setAttribute("r", n.radius + 5);
      ring.setAttribute("stroke", color);
      g.appendChild(ring);

      var core = document.createElementNS(NS, "circle");
      core.setAttribute("class", "graph-node-core");
      core.setAttribute("r", n.radius);
      core.setAttribute("stroke", color);
      core.style.filter = "url(#graph-glow)";
      g.appendChild(core);

      var dot = document.createElementNS(NS, "circle");
      dot.setAttribute("class", "graph-node-dot");
      dot.setAttribute("r", Math.max(2.2, n.radius * 0.38));
      dot.setAttribute("fill", color);
      g.appendChild(dot);

      nodesG.appendChild(g);

      var label = document.createElementNS(NS, "text");
      label.setAttribute("class", "graph-label");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dy", n.radius + 16);
      label.textContent = n.title.toUpperCase();
      labelsG.appendChild(label);

      return { el: g, label: label, node: n };
    });

    /* ---- легенда-фильтр ---- */
    var footer = document.getElementById("graph-footer");
    var activeCats = {};

    footer.innerHTML = CATEGORY_ORDER
      .filter(function (c) { return nodes.some(function (n) { return n.category === c; }); })
      .map(function (c) {
        var cat = catById(c);
        var count = nodes.filter(function (n) { return n.category === c; }).length;
        return '<button type="button" class="graph-legend-item" data-cat="' + c + '">' +
          '<span class="graph-legend-dot" style="background:' + CATEGORY_COLORS[c] + ';box-shadow:0 0 6px ' + CATEGORY_COLORS[c] + '"></span>' +
          (cat ? esc(cat.name) : c) +
          '<span class="graph-legend-count">[' + count + ']</span></button>';
      })
      .join("");

    function applyFilter() {
      var any = CATEGORY_ORDER.some(function (c) { return activeCats[c]; });
      nodeEls.forEach(function (item) {
        var off = any && !activeCats[item.node.category];
        item.el.classList.toggle("is-off", off);
        item.label.classList.toggle("is-off", off);
      });
      edgeEls.forEach(function (item) {
        var off = any && !(activeCats[item.edge.source.category] && activeCats[item.edge.target.category]);
        item.el.classList.toggle("is-off", off);
      });
    }

    footer.addEventListener("click", function (e) {
      var btn = e.target.closest(".graph-legend-item");
      if (!btn) return;
      var c = btn.dataset.cat;
      activeCats[c] = !activeCats[c];
      btn.classList.toggle("is-on", !!activeCats[c]);
      applyFilter();
    });

    /* ---- статистика и HUD ---- */
    var statsEl = document.getElementById("graph-stats");
    var hudBody = document.getElementById("graph-hud-body");
    var HUD_IDLE = '<div class="hud-row hud-idle">НАВЕДИТЕ НА УЗЕЛ<span class="hud-caret">_</span></div>';
    hudBody.innerHTML = HUD_IDLE;

    var tx = 0, ty = 0, sc = 1;

    function updateStats() {
      statsEl.textContent = "УЗЛОВ: " + nodes.length + " · СВЯЗЕЙ: " + edges.length + " · МАСШТАБ: " + Math.round(sc * 100) + "%";
    }
    updateStats();

    function updateHud(item) {
      if (!item) {
        hudBody.innerHTML = HUD_IDLE;
        return;
      }
      var n = item.node;
      var cat = catById(n.category);
      var color = CATEGORY_COLORS[n.category] || "#7d7d8c";
      hudBody.innerHTML =
        '<div class="hud-row hud-name">' + esc(n.title) + '</div>' +
        '<div class="hud-row"><span class="hud-key">ID</span>ART::' + esc(n.id) + '</div>' +
        '<div class="hud-row"><span class="hud-key">РАЗДЕЛ</span><span style="color:' + color + '">' + (cat ? esc(cat.name) : "Н/Д") + '</span></div>' +
        '<div class="hud-row"><span class="hud-key">СВЯЗЕЙ</span>' + n.connections + '</div>' +
        '<div class="hud-row hud-action">[КЛИК] ОТКРЫТЬ ЗАПИСЬ</div>';
    }

    var hovered = null;
    function setHover(item) {
      if (hovered === item) return;
      hovered = item;
      svg.classList.toggle("has-focus", !!item);
      var nb = item ? (neighbors[item.node.id] || {}) : {};
      nodeEls.forEach(function (it) {
        var hot = !!item && (it === item || nb[it.node.id]);
        it.el.classList.toggle("is-hot", hot);
        it.el.classList.toggle("is-focus", it === item);
        it.label.classList.toggle("is-hot", hot);
      });
      edgeEls.forEach(function (it) {
        var hot = !!item && (it.edge.source.id === item.node.id || it.edge.target.id === item.node.id);
        it.el.classList.toggle("is-hot", hot);
      });
      updateHud(item);
    }

    /* ---- физика ---- */
    var alpha = 1;

    function step(a) {
      var rep = 42000, attr = 0.004, grav = 0.004, cluster = 0.01, damp = 0.88, ideal = 105;

      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var dx = nodes[i].x - nodes[j].x;
          var dy = nodes[i].y - nodes[j].y;
          var dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          var f = (rep / (dist * dist)) * a;
          var fx = (dx / dist) * f;
          var fy = (dy / dist) * f;
          nodes[i].vx += fx; nodes[i].vy += fy;
          nodes[j].vx -= fx; nodes[j].vy -= fy;
        }
      }

      edges.forEach(function (e) {
        var dx = e.target.x - e.source.x;
        var dy = e.target.y - e.source.y;
        var dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        var f = (dist - ideal) * attr * a;
        var fx = (dx / dist) * f;
        var fy = (dy / dist) * f;
        e.source.vx += fx; e.source.vy += fy;
        e.target.vx -= fx; e.target.vy -= fy;
      });

      nodes.forEach(function (n) {
        var an = anchors[n.category];
        if (an) {
          n.vx += (an.x - n.x) * cluster * a;
          n.vy += (an.y - n.y) * cluster * a;
        }
        n.vx += (cx - n.x) * grav * a;
        n.vy += (cy - n.y) * grav * a;
        n.vx *= damp;
        n.vy *= damp;
        n.x += n.vx;
        n.y += n.vy;
      });
    }

    function render() {
      nodeEls.forEach(function (item) {
        item.el.setAttribute("transform", "translate(" + item.node.x + "," + item.node.y + ")");
        item.label.setAttribute("x", item.node.x);
        item.label.setAttribute("y", item.node.y);
      });
      edgeEls.forEach(function (item) {
        item.el.setAttribute("x1", item.edge.source.x);
        item.el.setAttribute("y1", item.edge.source.y);
        item.el.setAttribute("x2", item.edge.target.x);
        item.el.setAttribute("y2", item.edge.target.y);
      });
    }

    function tick() {
      if (!graphOpen) { graphAnimId = null; return; }
      if (alpha > 0.02) {
        step(alpha);
        alpha *= 0.985;
        render();
      }
      graphAnimId = requestAnimationFrame(tick);
    }

    function settle(iterations) {
      for (var s = 0; s < iterations; s++) step(Math.max(0.05, 1 - s / iterations));
      render();
    }

    if (REDUCED_MOTION) {
      settle(300);
    } else {
      tick();
    }

    /* ---- вид (пан/зум) ---- */
    function applyView() {
      var t = "translate(" + tx + "," + ty + ") scale(" + sc + ")";
      edgesG.setAttribute("transform", t);
      nodesG.setAttribute("transform", t);
      labelsG.setAttribute("transform", t);
    }

    function nodeAt(px, py) {
      for (var i = nodeEls.length - 1; i >= 0; i--) {
        var item = nodeEls[i];
        if (item.el.classList.contains("is-off")) continue;
        var nx = item.node.x * sc + tx;
        var ny = item.node.y * sc + ty;
        var r = (item.node.radius + 5) * sc;
        if ((px - nx) * (px - nx) + (py - ny) * (py - ny) <= r * r) return item;
      }
      return null;
    }

    /* ---- взаимодействие: drag / pan / pinch / клик ---- */
    var pointers = {};
    var dragNode = null, dragOffX = 0, dragOffY = 0, dragging = false;
    var panning = false, panStartX = 0, panStartY = 0;
    var pinch = null;
    var downX = 0, downY = 0, moved = false;

    function localXY(e) {
      var r = svg.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    svg.addEventListener("pointerdown", function (e) {
      svg.setPointerCapture(e.pointerId);
      var p = localXY(e);
      pointers[e.pointerId] = p;
      var ids = Object.keys(pointers);

      if (ids.length === 2) {
        if (dragNode) dragNode.el.classList.remove("is-dragging");
        dragging = false;
        dragNode = null;
        panning = false;
        bodyEl.classList.remove("is-panning");
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          sc: sc, tx: tx, ty: ty,
          mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2
        };
        return;
      }

      moved = false;
      downX = p.x;
      downY = p.y;

      var hit = nodeAt(p.x, p.y);
      if (hit) {
        dragNode = hit;
        dragging = true;
        dragOffX = p.x - hit.node.x * sc - tx;
        dragOffY = p.y - hit.node.y * sc - ty;
        hit.el.classList.add("is-dragging");
        e.preventDefault();
        return;
      }

      panning = true;
      panStartX = p.x;
      panStartY = p.y;
      bodyEl.classList.add("is-panning");
    });

    svg.addEventListener("pointermove", function (e) {
      var p = localXY(e);
      if (pointers[e.pointerId]) pointers[e.pointerId] = p;

      if (pinch) {
        var ids = Object.keys(pointers);
        if (ids.length >= 2) {
          var a = pointers[ids[0]], b = pointers[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
          var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          var newSc = Math.max(0.3, Math.min(3, pinch.sc * (d / pinch.d)));
          tx = mx - (pinch.mx - pinch.tx) * (newSc / pinch.sc);
          ty = my - (pinch.my - pinch.ty) * (newSc / pinch.sc);
          sc = newSc;
          applyView();
          updateStats();
        }
        return;
      }

      if (Math.abs(p.x - downX) > 4 || Math.abs(p.y - downY) > 4) moved = true;

      if (dragging && dragNode) {
        dragNode.node.x = (p.x - dragOffX - tx) / sc;
        dragNode.node.y = (p.y - dragOffY - ty) / sc;
        dragNode.node.vx = 0;
        dragNode.node.vy = 0;
        alpha = Math.max(alpha, 0.3);
        render();
        e.preventDefault();
        return;
      }

      if (panning) {
        tx += p.x - panStartX;
        ty += p.y - panStartY;
        panStartX = p.x;
        panStartY = p.y;
        applyView();
        e.preventDefault();
        return;
      }

      var hit = nodeAt(p.x, p.y);
      bodyEl.classList.toggle("is-over-node", !!hit);
      setHover(hit);
    });

    function endPointer(e) {
      delete pointers[e.pointerId];
      if (pinch && Object.keys(pointers).length < 2) pinch = null;

      if (dragging) {
        var wasNode = dragNode;
        if (wasNode) wasNode.el.classList.remove("is-dragging");
        dragging = false;
        dragNode = null;
        if (wasNode && !moved && e.type === "pointerup") {
          closeGraph();
          location.hash = "#/article/" + wasNode.node.id;
          return;
        }
      }
      if (panning) {
        panning = false;
        bodyEl.classList.remove("is-panning");
      }
    }
    svg.addEventListener("pointerup", endPointer);
    svg.addEventListener("pointercancel", endPointer);

    svg.addEventListener("pointerleave", function () {
      bodyEl.classList.remove("is-over-node");
      setHover(null);
    });

    svg.addEventListener("wheel", function (e) {
      e.preventDefault();
      var p = localXY(e);
      var delta = -e.deltaY * 0.001;
      var newSc = Math.max(0.3, Math.min(3, sc * (1 + delta)));
      tx = p.x - (p.x - tx) * (newSc / sc);
      ty = p.y - (p.y - ty) * (newSc / sc);
      sc = newSc;
      applyView();
      updateStats();
    }, { passive: false });

    /* ---- ресайз и клавиатура ---- */
    function onResize() {
      w = bodyEl.clientWidth || 800;
      h = bodyEl.clientHeight || 600;
      cx = w / 2;
      cy = h / 2;
      sizeSvg();
      computeAnchors();
      if (REDUCED_MOTION) settle(80);
      else alpha = Math.max(alpha, 0.5);
    }
    window.addEventListener("resize", onResize);

    function onGraphKey(e) {
      if (e.key === "Escape") closeGraph();
    }
    document.addEventListener("keydown", onGraphKey);
    overlay._keyHandler = onGraphKey;
    overlay._cleanup = function () {
      window.removeEventListener("resize", onResize);
    };
  }

  function closeGraph() {
    if (graphAnimId) cancelAnimationFrame(graphAnimId);
    graphAnimId = null;
    var overlay = document.getElementById("graph-overlay");
    if (overlay) {
      overlay.classList.remove("is-active");
      if (overlay._keyHandler) document.removeEventListener("keydown", overlay._keyHandler);
      if (overlay._cleanup) overlay._cleanup();
      setTimeout(function () { overlay.remove(); }, 250);
    }
    graphOpen = false;
  }

  /* ---------------- фоновая музыка ---------------- */

  let bgAudio = null;
  let soundEnabled = false;
  let currentVolume = 45;

  function toggleSound() {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      playMusic();
    } else {
      stopMusic();
    }
    updateSoundBtn();
    return soundEnabled;
  }

  function playMusic() {
    if (!bgAudio) {
      bgAudio = new Audio("audio/background_music.mp3");
      bgAudio.loop = true;
    }
    bgAudio.volume = currentVolume / 100;
    bgAudio.currentTime = 0;
    bgAudio.play().catch(() => {});
  }

  function stopMusic() {
    if (bgAudio) {
      bgAudio.pause();
      bgAudio.currentTime = 0;
    }
  }

  function setVolume(v) {
    currentVolume = Math.max(0, Math.min(100, v));
    if (bgAudio) bgAudio.volume = currentVolume / 100;
    const pct = document.getElementById("volume-pct");
    if (pct) pct.textContent = currentVolume + "%";
    const range = document.getElementById("volume-range");
    if (range) range.value = currentVolume;
    try { localStorage.setItem("nc-volume", currentVolume); } catch (e) {}
  }

  function updateSoundBtn() {
    const btn = document.getElementById("sound-btn");
    if (!btn) return;
    btn.classList.toggle("is-active", soundEnabled);
    btn.textContent = soundEnabled ? "\u266B" : "\u2205";
    btn.title = soundEnabled ? "Выключить звук (S)" : "Включить звук (S)";
    const slider = document.getElementById("volume-slider");
    if (slider) slider.classList.toggle("is-visible", soundEnabled);
  }

  function setupVolumeSlider() {
    const saved = localStorage.getItem("nc-volume");
    if (saved !== null) {
      const v = parseInt(saved, 10);
      if (!isNaN(v)) currentVolume = Math.max(0, Math.min(100, v));
    }

    const el = document.createElement("div");
    el.className = "volume-slider";
    el.id = "volume-slider";
    el.innerHTML = [
      '<span class="volume-label">VOL</span>',
      '<input type="range" id="volume-range" min="0" max="100" value="' + currentVolume + '">',
      '<span class="volume-pct" id="volume-pct">' + currentVolume + '%</span>'
    ].join("");
    document.body.appendChild(el);

    const range = document.getElementById("volume-range");
    range.addEventListener("input", function () {
      setVolume(parseInt(this.value, 10));
    });
  }

  /* ---------------- Breach Protocol (мини-игра) ----------------
     Правила как в CP2077: выбираем коды в матрице по правилу
     «строка → столбец → строка», заполняя буфер. Демоны — целевые
     последовательности; завершённый демон-DATAMINE расшифровывает
     секретную статью и добавляет её в базу навсегда (localStorage). */

  const BREACH_BYTES = ["1C", "55", "7A", "BD", "E9", "FF"];
  const BREACH_SIZE = 5;
  const BREACH_BUFFER = 8;
  const BREACH_TIME = 60;

  const SECRET_DAEMONS = [
    { id: "mikoshi",        name: "DATAMINE: MIKOSHI" },
    { id: "rache-bartmoss", name: "DATAMINE: BARTMOSS" },
    { id: "mr-blue-eyes",   name: "DATAMINE: BLUE_EYES" }
  ];
  const COSMETIC_DAEMONS = ["ICEPICK", "CAMERA SHUTDOWN", "FRIENDLY MODE"];

  let breachOpen = false;
  let breachTimerId = null;

  function getUnlockedSecrets() {
    try {
      const raw = JSON.parse(localStorage.getItem("nc-breach") || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveUnlockedSecrets(ids) {
    try { localStorage.setItem("nc-breach", JSON.stringify(ids)); } catch (e) {}
  }

  // добавляет уже разблокированные секретные статьи в базу при старте
  function restoreSecrets() {
    const unlocked = getUnlockedSecrets();
    (DB.secret || []).forEach((a) => {
      if (unlocked.indexOf(a.id) !== -1 && !DB.articles.some((x) => x.id === a.id)) {
        DB.articles.push(a);
      }
    });
  }

  function unlockSecret(id) {
    const unlocked = getUnlockedSecrets();
    if (unlocked.indexOf(id) !== -1) return false;
    const article = (DB.secret || []).find((a) => a.id === id);
    if (!article) return false;
    unlocked.push(id);
    saveUnlockedSecrets(unlocked);
    if (!DB.articles.some((a) => a.id === id)) {
      DB.articles.push(article);
      renderSidebar();
      highlightNav(parseRoute());
    }
    return true;
  }

  function openBreach() {
    if (breachOpen) return;
    breachOpen = true;

    const overlay = document.createElement("div");
    overlay.className = "breach-overlay";
    overlay.id = "breach-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="breach-header">
        <span class="breach-title"><span class="breach-title-dim">NC//DATABANK ::</span> BREACH PROTOCOL <span class="breach-title-ver">v2.77</span></span>
        <span class="breach-close">[ESC] прервать взлом</span>
      </div>
      <div class="breach-body">
        <div class="breach-main" id="breach-main"></div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-active"));

    function onBreachKey(e) {
      if (e.key === "Escape") closeBreach();
    }
    document.addEventListener("keydown", onBreachKey);
    overlay._keyHandler = onBreachKey;

    startBreachGame();
  }

  function closeBreach() {
    if (breachTimerId) { clearInterval(breachTimerId); breachTimerId = null; }
    const overlay = document.getElementById("breach-overlay");
    if (overlay) {
      overlay.classList.remove("is-active");
      if (overlay._keyHandler) document.removeEventListener("keydown", overlay._keyHandler);
      setTimeout(() => overlay.remove(), 250);
    }
    breachOpen = false;
  }

  function startBreachGame() {
    const main = document.getElementById("breach-main");
    if (!main) return;
    if (breachTimerId) { clearInterval(breachTimerId); breachTimerId = null; }

    const overlay = document.getElementById("breach-overlay");
    if (overlay) overlay.classList.remove("is-success", "is-fail");

    /* ---- генерация: сначала валидный путь, демоны — его отрезки,
       поэтому матрица гарантированно решаема одной цепочкой ---- */
    function tryPath() {
      var used = {};
      var path = [];
      var axis = "row";
      var line = 0;
      for (var step = 0; step < BREACH_BUFFER; step++) {
        var options = [];
        for (var i = 0; i < BREACH_SIZE; i++) {
          var r = axis === "row" ? line : i;
          var c = axis === "row" ? i : line;
          if (!used[r + ":" + c]) options.push([r, c]);
        }
        if (!options.length) return null;
        var pick = options[(Math.random() * options.length) | 0];
        used[pick[0] + ":" + pick[1]] = true;
        path.push(pick);
        line = axis === "row" ? pick[1] : pick[0];
        axis = axis === "row" ? "col" : "row";
      }
      return path;
    }

    var path = null;
    while (!path) path = tryPath();

    var grid = [];
    for (var r = 0; r < BREACH_SIZE; r++) {
      var row = [];
      for (var c = 0; c < BREACH_SIZE; c++) {
        row.push(BREACH_BYTES[(Math.random() * BREACH_BYTES.length) | 0]);
      }
      grid.push(row);
    }
    var pathBytes = path.map(function (p) { return grid[p[0]][p[1]]; });

    var unlockedIds = getUnlockedSecrets();
    var locked = SECRET_DAEMONS.filter(function (d) { return unlockedIds.indexOf(d.id) === -1; });
    var windows = [[0, 2], [2, 5], [4, 8]];
    var daemons = windows.map(function (w, i) {
      var reward = locked[i] || null;
      return {
        seq: pathBytes.slice(w[0], w[1]),
        name: reward ? reward.name : COSMETIC_DAEMONS[i % COSMETIC_DAEMONS.length],
        reward: reward,
        done: false,
        dead: false
      };
    });

    var st = {
      buffer: [],
      used: {},
      axis: "row",
      line: 0,
      started: false,
      finished: false,
      timeLeft: BREACH_TIME,
      unlockedNow: []
    };

    /* ---- разметка ---- */
    var gridHTML = "";
    for (var gr = 0; gr < BREACH_SIZE; gr++) {
      for (var gc = 0; gc < BREACH_SIZE; gc++) {
        gridHTML += '<button type="button" class="breach-cell" data-r="' + gr + '" data-c="' + gc + '">' + grid[gr][gc] + "</button>";
      }
    }

    var bufferHTML = "";
    for (var b = 0; b < BREACH_BUFFER; b++) {
      bufferHTML += '<span class="breach-slot" data-slot="' + b + '"></span>';
    }

    main.innerHTML = `
      <div class="breach-timer">
        <span class="breach-timer-label">ВРЕМЯ НА ВЗЛОМ</span>
        <div class="breach-timer-bar"><div class="breach-timer-fill" id="breach-timer-fill"></div></div>
        <span class="breach-timer-num" id="breach-timer-num">${BREACH_TIME.toFixed(1)}</span>
      </div>
      <div class="breach-columns">
        <div class="breach-left">
          <div class="breach-panel-label">// БУФЕР ПАМЯТИ</div>
          <div class="breach-buffer" id="breach-buffer">${bufferHTML}</div>
          <div class="breach-panel-label">// МАТРИЦА КОДА — СЕКВЕНСОР</div>
          <div class="breach-grid" id="breach-grid">${gridHTML}</div>
          <p class="breach-hint">строка → столбец → строка: выбирайте код на подсвеченной линии</p>
        </div>
        <div class="breach-right">
          <div class="breach-panel-label">// ДЕМОНЫ К ЗАГРУЗКЕ</div>
          <div class="breach-daemons" id="breach-daemons"></div>
          <div class="breach-log" id="breach-log"></div>
        </div>
      </div>`;

    var gridEl = document.getElementById("breach-grid");
    var cells = Array.prototype.slice.call(gridEl.querySelectorAll(".breach-cell"));
    var slots = Array.prototype.slice.call(document.querySelectorAll("#breach-buffer .breach-slot"));
    var daemonsEl = document.getElementById("breach-daemons");
    var logEl = document.getElementById("breach-log");
    var timerFill = document.getElementById("breach-timer-fill");
    var timerNum = document.getElementById("breach-timer-num");

    function log(html, cls) {
      var line = document.createElement("div");
      line.className = "breach-log-line" + (cls ? " " + cls : "");
      line.innerHTML = html;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }

    /* ---- состояние демона относительно буфера ---- */
    function daemonState(seq, buffer) {
      for (var i = 0; i + seq.length <= buffer.length; i++) {
        var ok = true;
        for (var j = 0; j < seq.length; j++) {
          if (buffer[i + j] !== seq[j]) { ok = false; break; }
        }
        if (ok) return { done: true, progress: seq.length };
      }
      var max = Math.min(seq.length - 1, buffer.length);
      for (var len = max; len > 0; len--) {
        var ok2 = true;
        for (var j2 = 0; j2 < len; j2++) {
          if (buffer[buffer.length - len + j2] !== seq[j2]) { ok2 = false; break; }
        }
        if (ok2) return { done: false, progress: len };
      }
      return { done: false, progress: 0 };
    }

    function anyDone() {
      return daemons.some(function (d) { return d.done; });
    }

    function isSelectable(rr, cc) {
      if (st.finished || st.used[rr + ":" + cc]) return false;
      return st.axis === "row" ? rr === st.line : cc === st.line;
    }

    function render() {
      cells.forEach(function (cell) {
        var rr = +cell.dataset.r, cc = +cell.dataset.c;
        var used = !!st.used[rr + ":" + cc];
        cell.classList.toggle("is-used", used);
        cell.classList.toggle("is-sel", isSelectable(rr, cc));
        if (used && cell.textContent !== "--") cell.textContent = "--";
      });
      gridEl.classList.toggle("is-finished", st.finished);

      slots.forEach(function (slot, i) {
        slot.textContent = st.buffer[i] || "";
        slot.classList.toggle("is-filled", i < st.buffer.length);
      });

      var remaining = BREACH_BUFFER - st.buffer.length;
      daemonsEl.innerHTML = daemons.map(function (d, i) {
        var stt = d.done ? { done: true, progress: d.seq.length } : daemonState(d.seq, st.buffer);
        if (!d.done && !st.finished && d.seq.length - stt.progress > remaining) d.dead = true;
        var cls = d.done ? " is-done" : (d.dead ? " is-dead" : "");
        var seqHTML = d.seq.map(function (byte, j) {
          return '<span class="breach-seq-byte' + (j < stt.progress ? " is-hit" : "") + '">' + byte + "</span>";
        }).join("");
        var status = d.done ? "ЗАГРУЖЕН" : (d.dead ? "НЕДОСТУПЕН" : "В ОЧЕРЕДИ");
        return '<div class="breach-daemon' + cls + '">' +
          '<div class="breach-daemon-seq">' + seqHTML + "</div>" +
          '<div class="breach-daemon-meta"><span class="breach-daemon-name">' + d.name + '</span>' +
          '<span class="breach-daemon-status">' + status + "</span></div></div>";
      }).join("");
    }

    function updateTimer() {
      var pct = Math.max(0, st.timeLeft / BREACH_TIME) * 100;
      timerFill.style.width = pct + "%";
      timerNum.textContent = st.timeLeft.toFixed(1);
      timerFill.classList.toggle("is-low", st.timeLeft <= 15);
      timerNum.classList.toggle("is-low", st.timeLeft <= 15);
    }

    function startTimer() {
      if (breachTimerId) return;
      breachTimerId = setInterval(function () {
        st.timeLeft = Math.max(0, st.timeLeft - 0.1);
        updateTimer();
        if (st.timeLeft <= 0) finish(anyDone() ? "partial" : "fail");
      }, 100);
    }

    function finish(kind) {
      if (st.finished) return;
      st.finished = true;
      if (breachTimerId) { clearInterval(breachTimerId); breachTimerId = null; }
      render();
      if (overlay) overlay.classList.add(kind === "fail" ? "is-fail" : "is-success");

      var title = kind === "success"
        ? "ВЗЛОМ УСПЕШЕН — ВСЕ ДЕМОНЫ ЗАГРУЖЕНЫ"
        : kind === "partial"
          ? "СОЕДИНЕНИЕ ЗАКРЫТО — ЧАСТИЧНЫЙ УСПЕХ"
          : "ВЗЛОМ ПРОВАЛЕН — ICE ВЫТЕСНИЛ ВАС ИЗ СИСТЕМЫ";

      var unlockedHTML = st.unlockedNow.map(function (id) {
        var a = (DB.secret || []).find(function (x) { return x.id === id; });
        return a
          ? '<a class="breach-unlock-link" href="#/article/' + a.id + '">→ РАСШИФРОВАНА ЗАПИСЬ: ' + esc(a.title) + "</a>"
          : "";
      }).join("");

      var resEl = document.createElement("div");
      resEl.className = "breach-result " + (kind === "fail" ? "is-fail" : "is-ok");
      resEl.innerHTML =
        '<div class="breach-result-title">' + title + "</div>" +
        unlockedHTML +
        (kind !== "fail" && !st.unlockedNow.length ? '<div class="breach-result-note">НОВЫХ ДАННЫХ НЕ ПОЛУЧЕНО</div>' : "") +
        '<div class="breach-result-actions">' +
        '<button type="button" class="breach-btn" id="breach-retry">[ ПОВТОРИТЬ ]</button>' +
        '<button type="button" class="breach-btn" id="breach-exit">[ ВЫЙТИ ]</button>' +
        "</div>";
      logEl.appendChild(resEl);
      logEl.scrollTop = logEl.scrollHeight;

      document.getElementById("breach-retry").addEventListener("click", startBreachGame);
      document.getElementById("breach-exit").addEventListener("click", closeBreach);
      resEl.querySelectorAll(".breach-unlock-link").forEach(function (link) {
        link.addEventListener("click", function () { closeBreach(); });
      });
    }

    gridEl.addEventListener("click", function (e) {
      var cell = e.target.closest(".breach-cell");
      if (!cell || st.finished) return;
      var rr = +cell.dataset.r, cc = +cell.dataset.c;
      if (!isSelectable(rr, cc)) return;

      if (!st.started) {
        st.started = true;
        startTimer();
      }

      st.used[rr + ":" + cc] = true;
      st.buffer.push(grid[rr][cc]);
      st.line = st.axis === "row" ? cc : rr;
      st.axis = st.axis === "row" ? "col" : "row";

      daemons.forEach(function (d) {
        if (d.done) return;
        if (daemonState(d.seq, st.buffer).done) {
          d.done = true;
          d.dead = false;
          log("ДЕМОН ЗАГРУЖЕН: " + d.name, "is-ok");
          if (d.reward && unlockSecret(d.reward.id)) {
            st.unlockedNow.push(d.reward.id);
            var art = (DB.secret || []).find(function (x) { return x.id === d.reward.id; });
            if (art) log("ДЕШИФРОВКА ДАННЫХ... ЗАПИСЬ «" + esc(art.title).toUpperCase() + "» ДОБАВЛЕНА В БАЗУ", "is-unlock");
          }
        }
      });

      render();

      if (daemons.every(function (d) { return d.done; })) {
        finish("success");
      } else if (st.buffer.length >= BREACH_BUFFER) {
        finish(anyDone() ? "partial" : "fail");
      }
    });

    log("ПОДКЛЮЧЕНИЕ К УЗЛУ NET://WATSON.SEC-7... ОК");
    log("ОБНАРУЖЕН УЯЗВИМЫЙ СЕГМЕНТ ДАННЫХ");
    log("ТАЙМЕР ЗАПУСТИТСЯ ПОСЛЕ ПЕРВОГО ВЫБОРА");
    render();
    updateTimer();
  }
  /* ---------------- Брейнданс-режим чтения ----------------
     Статья проигрывается как запись воспоминания: плейхед по
     таймлайну, сцены сменяются с декодированием, три слоя анализа
     (VISUAL / AUDIO / THERMAL) вытаскивают разные зацепки. */

  let bdOpen = false;
  let bdRafId = null;
  let bdState = null;

  const BD_LAYERS = [
    { id: "visual",  name: "ВИЗУАЛ",  key: "V" },
    { id: "audio",   name: "АУДИО",   key: "A" },
    { id: "thermal", name: "ТЕПЛО",   key: "T" }
  ];

  // вытаскивает ссылки на другие статьи из html-фрагмента
  function bdEntities(html) {
    var box = document.createElement("div");
    box.innerHTML = html || "";
    var out = [];
    var seen = {};
    box.querySelectorAll('a[href^="#/article/"]').forEach(function (a) {
      var id = a.getAttribute("href").replace("#/article/", "");
      if (seen[id]) return;
      seen[id] = true;
      out.push({ id: id, text: a.textContent.trim() });
    });
    return out;
  }

  function openBraindance(id) {
    if (bdOpen) return;
    var article = byId(id);
    if (!article) return;
    bdOpen = true;

    var cat = catById(article.category);

    // сцены: вступление + секции
    var frames = [{
      heading: "// НАЧАЛО ЗАПИСИ",
      html: '<p class="bd-establishing">' + esc(article.subtitle || article.title) + "</p>",
      entities: []
    }];
    (article.sections || []).forEach(function (s) {
      frames.push({ heading: s.heading, html: s.html, entities: bdEntities(s.html) });
    });
    (article.related || []).length && frames.push({
      heading: "// СВЯЗАННЫЕ УЗЛЫ",
      html: '<p class="bd-establishing">Обнаружены перекрёстные связи в памяти субъекта.</p>',
      entities: (article.related || []).map(byId).filter(Boolean).map(function (r) {
        return { id: r.id, text: r.title };
      })
    });

    // длительность сцены пропорциональна объёму текста
    frames.forEach(function (f) {
      var len = f.html.replace(/<[^>]+>/g, "").length;
      f.dur = Math.max(4, Math.min(9, 3 + len / 220));
    });
    var total = frames.reduce(function (s, f) { return s + f.dur; }, 0);
    var starts = [];
    frames.reduce(function (acc, f, i) { starts[i] = acc; return acc + f.dur; }, 0);

    var infoRows = Object.entries(article.infobox || {});

    var overlay = document.createElement("div");
    overlay.className = "bd-overlay bd-visual";
    overlay.id = "bd-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="bd-scanlines" aria-hidden="true"></div>
      <div class="bd-vignette" aria-hidden="true"></div>
      <div class="bd-header">
        <span class="bd-title"><span class="bd-title-dim">BRAINDANCE ::</span> МОНТАЖНЫЙ СТОЛ</span>
        <span class="bd-subject">СУБЪЕКТ: ${esc(article.title)}${cat ? " · " + esc(cat.name) : ""}</span>
        <span class="bd-close">[ESC] выход</span>
      </div>

      <div class="bd-stage">
        <div class="bd-crosshair bd-crosshair-h" aria-hidden="true"></div>
        <div class="bd-crosshair bd-crosshair-v" aria-hidden="true"></div>
        <div class="bd-frame-corners" aria-hidden="true"></div>

        <div class="bd-scene" id="bd-scene">
          <h2 class="bd-scene-heading glitch" id="bd-scene-heading" data-text=""></h2>
          <div class="bd-scene-body" id="bd-scene-body"></div>
        </div>

        <aside class="bd-annot" id="bd-annot"></aside>

        <div class="bd-hud-tl" aria-hidden="true">● REC</div>
        <div class="bd-hud-tr" id="bd-timecode" aria-hidden="true">00:00 / 00:00</div>
      </div>

      <div class="bd-console">
        <div class="bd-layers" id="bd-layers">
          ${BD_LAYERS.map(function (l) {
            return '<button type="button" class="bd-layer" data-layer="' + l.id + '">' +
              '<span class="bd-layer-key">[' + l.key + ']</span> ' + l.name + "</button>";
          }).join("")}
        </div>

        <div class="bd-transport">
          <button type="button" class="bd-btn" id="bd-rewind" title="В начало">⏮</button>
          <button type="button" class="bd-btn bd-btn-play" id="bd-play" title="Пуск/пауза">⏸</button>
          <button type="button" class="bd-btn" id="bd-speed" title="Скорость">1×</button>
        </div>

        <div class="bd-timeline" id="bd-timeline">
          <div class="bd-track" id="bd-track"></div>
          <div class="bd-playhead" id="bd-playhead"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("is-active"); });

    var trackEl = document.getElementById("bd-track");
    var playhead = document.getElementById("bd-playhead");
    var sceneHeading = document.getElementById("bd-scene-heading");
    var sceneBody = document.getElementById("bd-scene-body");
    var annotEl = document.getElementById("bd-annot");
    var timecode = document.getElementById("bd-timecode");
    var playBtn = document.getElementById("bd-play");
    var speedBtn = document.getElementById("bd-speed");

    // сегменты таймлайна
    trackEl.innerHTML = frames.map(function (f, i) {
      var w = (f.dur / total) * 100;
      var poi = f.entities.length ? '<span class="bd-clip-poi"></span>' : "";
      return '<div class="bd-clip" data-frame="' + i + '" style="width:' + w + '%">' +
        '<span class="bd-clip-label">' + esc(f.heading.replace(/^\/\/\s*/, "")) + "</span>" + poi + "</div>";
    }).join("");
    var clipEls = Array.prototype.slice.call(trackEl.querySelectorAll(".bd-clip"));

    bdState = {
      frames: frames, starts: starts, total: total, infoRows: infoRows,
      pos: 0, playing: !REDUCED_MOTION, speed: 1, layer: "visual",
      current: -1, lastTs: 0
    };

    function frameAt(pos) {
      for (var i = frames.length - 1; i >= 0; i--) {
        if (pos >= starts[i]) return i;
      }
      return 0;
    }

    function fmt(sec) {
      var s = Math.floor(sec);
      return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2);
    }

    function renderAnnot(fi) {
      var f = frames[fi];
      var layer = bdState.layer;
      if (layer === "thermal") {
        var ents = f.entities;
        annotEl.innerHTML = '<div class="bd-annot-label">// ТЕПЛОКАРТА · ОБЪЕКТЫ</div>' +
          (ents.length
            ? ents.map(function (e) {
                return '<button type="button" class="bd-poi" data-goto="' + esc(e.id) + '">' +
                  '<span class="bd-poi-dot"></span>' + esc(e.text) + "</button>";
              }).join("")
            : '<div class="bd-annot-empty">В КАДРЕ НЕТ ГОРЯЧИХ ОБЪЕКТОВ</div>');
      } else if (layer === "audio") {
        annotEl.innerHTML = '<div class="bd-annot-label">// АУДИО · ПЕРЕХВАТ ДАННЫХ</div>' +
          '<div class="bd-wave" aria-hidden="true">' +
            Array.from({ length: 28 }).map(function (_, i) {
              return '<span style="--d:' + (i % 7) + '"></span>';
            }).join("") + "</div>" +
          (infoRows.length
            ? infoRows.map(function (kv) {
                return '<div class="bd-audio-row"><span class="bd-audio-key">' + esc(kv[0]) +
                  '</span><span class="bd-audio-val">' + esc(kv[1]) + "</span></div>";
              }).join("")
            : '<div class="bd-annot-empty">ДОСЬЕ НЕ ОБНАРУЖЕНО</div>');
      } else {
        annotEl.innerHTML = '<div class="bd-annot-label">// ВИЗУАЛ · ЧИСТЫЙ КАДР</div>' +
          '<div class="bd-annot-meta">СЦЕНА ' + (fi + 1) + " / " + frames.length + "</div>" +
          '<div class="bd-annot-meta">ЦЕЛОСТНОСТЬ: ' + (94 + (fi % 6)) + "%</div>" +
          '<div class="bd-annot-hint">Переключите слой [A]/[T], чтобы вскрыть скрытые данные памяти.</div>';
      }
    }

    function showFrame(fi) {
      if (fi === bdState.current) return;
      bdState.current = fi;
      var f = frames[fi];
      sceneHeading.dataset.text = f.heading;
      sceneHeading.textContent = f.heading;
      sceneBody.innerHTML = f.html;
      clipEls.forEach(function (el, i) { el.classList.toggle("is-current", i === fi); });
      renderAnnot(fi);
      if (!REDUCED_MOTION) {
        decodeText(sceneHeading, 400);
        var sc = document.getElementById("bd-scene");
        sc.classList.remove("is-in");
        void sc.offsetWidth;
        sc.classList.add("is-in");
      }
    }

    function renderPos() {
      var pct = (bdState.pos / total) * 100;
      playhead.style.left = pct + "%";
      timecode.textContent = fmt(bdState.pos) + " / " + fmt(total);
      showFrame(frameAt(bdState.pos));
    }

    function setLayer(layer) {
      bdState.layer = layer;
      overlay.classList.remove("bd-visual", "bd-audio", "bd-thermal");
      overlay.classList.add("bd-" + layer);
      document.querySelectorAll(".bd-layer").forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.layer === layer);
      });
      renderAnnot(bdState.current < 0 ? 0 : bdState.current);
    }

    function setPlaying(on) {
      bdState.playing = on;
      playBtn.textContent = on ? "⏸" : "▶";
      overlay.classList.toggle("is-paused", !on);
      if (on && bdState.pos >= total - 0.05) bdState.pos = 0;
    }

    function loop(ts) {
      if (!bdOpen) { bdRafId = null; return; }
      if (bdState.playing) {
        if (!bdState.lastTs) bdState.lastTs = ts;
        var dt = (ts - bdState.lastTs) / 1000;
        bdState.lastTs = ts;
        bdState.pos += dt * bdState.speed;
        if (bdState.pos >= total) {
          bdState.pos = total;
          setPlaying(false);
        }
        renderPos();
      } else {
        bdState.lastTs = ts;
      }
      bdRafId = requestAnimationFrame(loop);
    }

    // управление
    document.getElementById("bd-layers").addEventListener("click", function (e) {
      var b = e.target.closest(".bd-layer");
      if (b) setLayer(b.dataset.layer);
    });
    playBtn.addEventListener("click", function () { setPlaying(!bdState.playing); });
    document.getElementById("bd-rewind").addEventListener("click", function () {
      bdState.pos = 0; renderPos(); setPlaying(true);
    });
    speedBtn.addEventListener("click", function () {
      var seq = [1, 1.5, 2, 0.5];
      var next = seq[(seq.indexOf(bdState.speed) + 1) % seq.length];
      bdState.speed = next;
      speedBtn.textContent = (next % 1 === 0 ? next : next.toFixed(1)) + "×";
    });

    var timelineEl = document.getElementById("bd-timeline");
    function scrubTo(clientX) {
      var rect = timelineEl.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      bdState.pos = p * total;
      bdState.lastTs = 0;
      renderPos();
    }
    var scrubbing = false;
    timelineEl.addEventListener("pointerdown", function (e) {
      scrubbing = true;
      timelineEl.setPointerCapture(e.pointerId);
      setPlaying(false);
      scrubTo(e.clientX);
    });
    timelineEl.addEventListener("pointermove", function (e) {
      if (scrubbing) scrubTo(e.clientX);
    });
    timelineEl.addEventListener("pointerup", function () { scrubbing = false; });

    clipEls.forEach(function (el) {
      el.addEventListener("click", function () {
        bdState.pos = starts[+el.dataset.frame] + 0.01;
        bdState.lastTs = 0;
        setPlaying(false);
        renderPos();
      });
    });

    annotEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-goto]");
      if (b) { closeBraindance(); location.hash = "#/article/" + b.dataset.goto; }
    });

    function onBdKey(e) {
      if (e.key === "Escape") { closeBraindance(); return; }
      if (e.key === " ") { e.preventDefault(); setPlaying(!bdState.playing); return; }
      var k = e.key.toLowerCase();
      if (k === "v" || e.code === "KeyV") setLayer("visual");
      else if (k === "a" || e.code === "KeyA") setLayer("audio");
      else if (k === "t" || e.code === "KeyT") setLayer("thermal");
    }
    document.addEventListener("keydown", onBdKey);
    overlay._keyHandler = onBdKey;

    document.querySelector(".bd-close").addEventListener("click", closeBraindance);

    setLayer("visual");
    setPlaying(bdState.playing);
    renderPos();
    bdRafId = requestAnimationFrame(loop);
  }

  function closeBraindance() {
    if (bdRafId) cancelAnimationFrame(bdRafId);
    bdRafId = null;
    bdState = null;
    var overlay = document.getElementById("bd-overlay");
    if (overlay) {
      overlay.classList.remove("is-active");
      if (overlay._keyHandler) document.removeEventListener("keydown", overlay._keyHandler);
      setTimeout(function () { overlay.remove(); }, 250);
    }
    bdOpen = false;
  }
  /* ---------------- старт ---------------- */

  restoreSecrets();
  renderSidebar();
  window.addEventListener("hashchange", route);
  route();
  ambientGlitchLoop();
  statusTickerLoop();
  initCardTilt();
  bootSequence();

  // терминал: ctrl+` или тройное t
  document.addEventListener("keydown", (e) => {
    if (e.key === "`" && e.ctrlKey) {
      e.preventDefault();
      toggleTerminal();
      return;
    }
    if (e.key.toLowerCase() === "t" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest("input,textarea")) {
      const now = Date.now();
      tapTimes = tapTimes.filter((t) => now - t < 1000);
      tapTimes.push(now);
      if (tapTimes.length >= 3) {
        tapTimes = [];
        toggleTerminal();
      }
    }

    if ((e.key === "G" || e.key === "g") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest("input,textarea")) {
      if (e.shiftKey || e.key === "G") {
        e.preventDefault();
        closeTerminal();
        toggleGraph();
      }
    }

    if ((e.key === "S" || e.key === "s") && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest("input,textarea")) {
      if (e.shiftKey || e.key === "S") {
        e.preventDefault();
        toggleSound();
      }
    }
  });

  // плавающая кнопка графа
  const graphBtn = document.createElement("button");
  graphBtn.className = "graph-btn";
  graphBtn.setAttribute("aria-label", "Открыть граф знаний");
  graphBtn.title = "Граф знаний (G)";
  graphBtn.innerHTML = "&#x25C8;";
  graphBtn.addEventListener("click", () => { closeTerminal(); toggleGraph(); });
  document.body.appendChild(graphBtn);

  // плавающая кнопка звука
  const soundBtn = document.createElement("button");
  soundBtn.className = "sound-btn";
  soundBtn.id = "sound-btn";
  soundBtn.setAttribute("aria-label", "Звуковая атмосфера");
  soundBtn.title = "Включить звук (S)";
  soundBtn.textContent = "\u2205";
  soundBtn.addEventListener("click", toggleSound);
  document.body.appendChild(soundBtn);

  // ползунок громкости
  setupVolumeSlider();
})();