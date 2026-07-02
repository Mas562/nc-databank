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
      .map((a) => `<li><a href="#/article/${a.id}" data-nav-article="${a.id}">${esc(a.title)}</a></li>`)
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
          <span class="article-cat-chip">${cat ? esc(cat.name) : ""}</span>
          <h1 class="article-title glitch" data-text="${esc(article.title)}" data-decode>${esc(article.title)}</h1>
          <p class="article-subtitle">${esc(article.subtitle || "")}</p>
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

  /* ---------------- старт ---------------- */

  renderSidebar();
  window.addEventListener("hashchange", route);
  route();
  ambientGlitchLoop();
  statusTickerLoop();
  initCardTilt();
  bootSequence();
})();