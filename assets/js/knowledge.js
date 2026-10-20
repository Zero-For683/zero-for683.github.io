(() => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const theme = $(".theme-toggle");
  const updateThemeLabel = () =>
    theme.setAttribute(
      "aria-label",
      `Switch to ${document.documentElement.dataset.theme === "dark" ? "light" : "dark"} theme`,
    );
  updateThemeLabel();
  theme.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("gb-theme", next);
    } catch (_) {}
    updateThemeLabel();
  });
  const menu = $(".menu-toggle"),
    sidebar = $(".site-sidebar");
  const closeMenu = () => {
    sidebar.classList.remove("is-open");
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Open navigation");
  };
  menu.addEventListener("click", () => {
    const open = sidebar.classList.toggle("is-open");
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute(
      "aria-label",
      open ? "Close navigation" : "Open navigation",
    );
  });
  document.addEventListener("click", (e) => {
    if (!sidebar.contains(e.target) && !menu.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  sidebar
    .querySelectorAll("a")
    .forEach((a) => a.addEventListener("click", closeMenu));
  // Native fragment navigation stays useful without JavaScript; enhance headings and outline.
  const headings = [
    ...document.querySelectorAll(".page__content h2, .page__content h3"),
  ].filter((h) => !h.closest(".topic-card, .article-row"));
  const used = new Set(
    [...document.querySelectorAll("[id]")].map((el) => el.id),
  );
  headings.forEach((h, index) => {
    if (!h.id) {
      let id =
        h.textContent
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || `section-${index}`;
      const base = id;
      let n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      h.id = id;
      used.add(id);
    }
    const label = h.textContent.trim();
    const a = document.createElement("a");
    a.href = `#${h.id}`;
    a.textContent = label;
    if (h.tagName === "H3") a.className = "subheading";
    $("#page-toc").append(a);
    const anchor = document.createElement("a");
    anchor.href = `#${h.id}`;
    anchor.className = "heading-anchor";
    anchor.setAttribute("aria-label", `Link to ${label}`);
    anchor.textContent = "#";
    h.append(anchor);
  });
  if (!headings.length) $(".page-outline").hidden = true;
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.querySelectorAll("#page-toc a").forEach((a) => {
              const active = a.getAttribute("href") === `#${entry.target.id}`;
              a.classList.toggle("active", active);
              if (active) a.setAttribute("aria-current", "location");
              else a.removeAttribute("aria-current");
            });
          }
        });
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
  }
  document.querySelectorAll(".page__content pre").forEach((pre) => {
    const wrapper = document.createElement("div");
    wrapper.className = "code-wrapper";
    pre.before(wrapper);
    wrapper.append(pre);
    const copy = document.createElement("button");
    copy.className = "copy-code";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", "Copy code to clipboard");
    wrapper.append(copy);
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        copy.textContent = "Copied";
      } catch (_) {
        copy.textContent = "Select to copy";
      }
      setTimeout(() => {
        copy.textContent = "Copy";
      }, 2000);
    });
  });
  const dialog = $("#search-dialog"),
    input = $("#search-input"),
    results = $("#search-results"),
    status = $("#search-status");
  const script = document.querySelector("script[data-search-url]");
  let index,
    loading,
    generation = 0;
  async function loadIndex() {
    if (index) return index;
    if (!loading)
      loading = fetch(script.dataset.searchUrl)
        .then((r) => {
          if (!r.ok) throw new Error("Search unavailable");
          return r.json();
        })
        .then((data) => (index = data))
        .catch((e) => {
          loading = null;
          throw e;
        });
    return loading;
  }
  async function search() {
    const run = ++generation,
      query = input.value.trim().toLowerCase();
    results.replaceChildren();
    if (!query) {
      status.textContent = "Type to search articles and pages.";
      return;
    }
    status.textContent = "Searching…";
    try {
      const data = await loadIndex();
      if (run !== generation) return;
      const terms = query.split(/\s+/);
      const matches = data
        .map((item) => {
          const title = item.title.toLowerCase(),
            metadata =
              `${item.category || ""} ${item.tags || ""}`.toLowerCase(),
            all = `${title} ${metadata} ${item.text || ""}`.toLowerCase();
          return {
            item,
            score: terms.every((t) => all.includes(t))
              ? terms.reduce(
                  (score, t) =>
                    score +
                    (title.includes(t) ? 10 : metadata.includes(t) ? 5 : 1),
                  0,
                )
              : 0,
          };
        })
        .filter((match) => match.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      status.textContent = matches.length
        ? `${matches.length} result${matches.length === 1 ? "" : "s"}`
        : "No matching articles. Try a tool, topic, or technique.";
      matches.forEach(({ item }) => {
        const a = document.createElement("a");
        a.href = item.url;
        const category = document.createElement("small");
        category.textContent = (item.category || "Page").replaceAll("-", " ");
        a.append(category, document.createTextNode(item.title));
        results.append(a);
      });
    } catch (_) {
      if (run === generation)
        status.textContent =
          "Search could not load. Please try again, or browse topics in the navigation.";
    }
  }
  $(".search-trigger").addEventListener("click", () => {
    dialog.showModal();
    input.focus();
  });
  $(".search-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
  input.addEventListener("input", search);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (!dialog.open) dialog.showModal();
      input.focus();
    }
  });
})();
