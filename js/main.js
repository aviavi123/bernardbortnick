/* ===========================================================================
   Bernard Bortnick — gallery data + behavior
   ---------------------------------------------------------------------------
   TO ADD REAL WORK: drop image files into the matching folder under /images,
   then edit the GALLERIES object below. Each series has a `title` and a list of
   `works`. The navigation, thumbnail strip, and large stage build themselves.

   IN-PLACE EDITING: titles and descriptions can be edited right on the page.
   Click "Edit" in the footer, enter the password, then double-click any title
   or description to change it. See README for how edits get published.
   =========================================================================== */

const EDIT_PASSWORD = "bortnick";   // ← change this; it only deters casual visitors (see README)

/* One-click publishing target. Fill these in after the GitHub repo exists.
   While owner/repo are blank, "Publish" falls back to downloading a file. */
const GITHUB = {
  owner:  "aviavi123",
  repo:   "bernardbortnick",
  branch: "main",
  path:   "content-overrides.json",
};
const TOKEN_KEY = "bb_gh_token";    // GitHub token, stored in this browser only

const GALLERIES = {
  "portraits": {
    title: "Portraits",
    works: [
      { src: "images/portraits/placeholder-01.svg", title: "Untitled Portrait", details: "Oil on canvas" },
      { src: "images/portraits/placeholder-02.svg", title: "Untitled Portrait", details: "Oil on canvas" },
    ],
  },
  "landscapes": {
    title: "Landscapes and the Built Environment",
    works: [
      { src: "images/landscapes/placeholder-01.svg", title: "Untitled Landscape", details: "Oil on canvas" },
      { src: "images/landscapes/placeholder-02.svg", title: "Untitled Landscape", details: "Oil on canvas" },
    ],
  },
  "age-of-outrage": {
    title: "Age of Outrage",
    works: [
      { src: "images/age-of-outrage/placeholder-01.svg", title: "Untitled", details: "Mixed media" },
      { src: "images/age-of-outrage/placeholder-02.svg", title: "Untitled", details: "Mixed media" },
    ],
  },
  "figurative": {
    title: "Figurative",
    works: [
      { src: "images/figurative/placeholder-01.svg", title: "Untitled Figure", details: "Oil on canvas" },
      { src: "images/figurative/placeholder-02.svg", title: "Untitled Figure", details: "Oil on canvas" },
    ],
  },
  "watercolors": {
    title: "Watercolors",
    works: [
      { src: "images/watercolors/placeholder-01.svg", title: "Untitled", details: "Watercolor on paper" },
      { src: "images/watercolors/placeholder-02.svg", title: "Untitled", details: "Watercolor on paper" },
    ],
  },
  "drawings-people-and-places": {
    title: "Drawings: People and Places",
    works: [
      { src: "images/drawings-people-and-places/placeholder-01.svg", title: "Untitled", details: "Ink on paper" },
      { src: "images/drawings-people-and-places/placeholder-02.svg", title: "Untitled", details: "Charcoal on paper" },
    ],
  },
  "drawings-political": {
    title: "Drawings: Political",
    works: [
      { src: "images/drawings-political/placeholder-01.svg", title: "Untitled", details: "Ink on paper" },
      { src: "images/drawings-political/placeholder-02.svg", title: "Untitled", details: "Ink on paper" },
    ],
  },
};

const PAGES = {
  about: {
    title: "About",
    html: `
      <p>Bernard Bortnick is a painter whose work moves between portraiture,
      observed landscape, the built environment, and political commentary.
      <em>(Replace this with your dad's artist statement and bio.)</em></p>
      <p>He lives and works in Dallas, Texas.</p>`,
  },
  contact: {
    title: "Contact",
    html: `
      <p>For inquiries about available work, exhibitions, or commissions:</p>
      <p><a href="mailto:sirob49@gmail.com">sirob49@gmail.com</a></p>`,
  },
};

/* ===========================================================================
   Editing layer — published overrides (shared) + local edits (this browser)
   =========================================================================== */

const LOCAL_KEY = "bb_overrides_v1";
let publishedOverrides = {};                                  // from content-overrides.json (all visitors)
let localOverrides = loadLocalOverrides();                    // from localStorage (this browser only)
let editing = false;
let current = { key: null, index: 0 };

function loadLocalOverrides() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; }
  catch { return {}; }
}
function saveLocalOverrides() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(localOverrides));
}

/* Effective title/details for a work: defaults < published < local */
function contentFor(work) {
  const pub = publishedOverrides[work.src] || {};
  const loc = localOverrides[work.src] || {};
  return {
    title:   loc.title   ?? pub.title   ?? work.title,
    details: loc.details ?? pub.details ?? work.details ?? "",
  };
}

/* Try to load published edits (works on a web server; skipped on file://) */
async function loadPublished() {
  try {
    const res = await fetch("content-overrides.json", { cache: "no-store" });
    if (res.ok) publishedOverrides = await res.json();
  } catch { /* no published overrides yet — fine */ }
}

/* --------------------------------------------------------------------------- */

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const els = {
  navList: $("#nav-list"),
  sectionTitle: $("#section-title"),
  galleryView: $("#gallery-view"),
  textView: $("#text-view"),
  textContent: $("#text-content"),
  strip: $("#thumb-strip"),
  stageImg: $("#stage-image"),
  capTitle: $(".cap-title"),
  capDetail: $(".cap-detail"),
  nav: $("#site-nav"),
  navToggle: $(".nav-toggle"),
};

const galleryKeys = Object.keys(GALLERIES);

function buildNav() {
  els.navList.innerHTML = "";
  galleryKeys.forEach((key) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#" + key;
    a.textContent = GALLERIES[key].title;
    a.dataset.gallery = key;
    li.appendChild(a);
    els.navList.appendChild(li);
  });
}

function showGallery(key, workIndex = 0) {
  if (!GALLERIES[key]) key = galleryKeys[0];
  const gallery = GALLERIES[key];

  els.textView.hidden = true;
  els.galleryView.hidden = false;
  els.sectionTitle.textContent = gallery.title;

  document.querySelectorAll("#site-nav a").forEach((a) => a.classList.remove("active"));
  const activeLink = document.querySelector(`a[data-gallery="${key}"]`);
  if (activeLink) activeLink.classList.add("active");

  els.strip.innerHTML = "";
  gallery.works.forEach((work, i) => {
    const btn = document.createElement("button");
    btn.className = "thumb";
    btn.setAttribute("role", "tab");
    btn.dataset.index = i;
    const img = document.createElement("img");
    img.src = work.src;
    img.alt = contentFor(work).title;
    img.loading = "lazy";
    btn.appendChild(img);
    btn.addEventListener("click", () => selectWork(key, i));
    els.strip.appendChild(btn);
  });

  selectWork(key, workIndex);
  closeMobileNav();
}

function selectWork(key, index) {
  const work = GALLERIES[key].works[index];
  if (!work) return;
  current = { key, index };
  const c = contentFor(work);

  els.stageImg.classList.remove("loaded");
  const img = new Image();
  img.onload = () => {
    els.stageImg.src = work.src;
    els.stageImg.alt = c.title;
    requestAnimationFrame(() => els.stageImg.classList.add("loaded"));
  };
  img.src = work.src;

  els.capTitle.textContent = c.title;
  els.capDetail.textContent = c.details;

  els.strip.querySelectorAll(".thumb").forEach((t) => t.classList.remove("active"));
  const activeThumb = els.strip.querySelector(`.thumb[data-index="${index}"]`);
  if (activeThumb) {
    activeThumb.classList.add("active");
    activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  history.replaceState(null, "", `#${key}/${index}`);
}

function showPage(name) {
  const page = PAGES[name];
  if (!page) return;
  els.galleryView.hidden = true;
  els.textView.hidden = false;
  els.sectionTitle.textContent = page.title;
  els.textContent.innerHTML = `<h1>${page.title}</h1>${page.html}`;
  document.querySelectorAll("#site-nav a").forEach((a) => a.classList.remove("active"));
  window.scrollTo({ top: 0 });
  closeMobileNav();
}

function closeMobileNav() {
  els.nav.classList.remove("open");
  els.navToggle.setAttribute("aria-expanded", "false");
}

els.navToggle.addEventListener("click", () => {
  const open = els.nav.classList.toggle("open");
  els.navToggle.setAttribute("aria-expanded", String(open));
});

function route() {
  const hash = location.hash.replace(/^#/, "");
  if (!hash) return showGallery(galleryKeys[0]);
  const [key, idx] = hash.split("/");
  if (GALLERIES[key]) return showGallery(key, parseInt(idx, 10) || 0);
  showGallery(galleryKeys[0]);
}

document.addEventListener("click", (e) => {
  const pageLink = e.target.closest("[data-page]");
  if (pageLink) { e.preventDefault(); showPage(pageLink.dataset.page); return; }
  const home = e.target.closest("[data-nav-home]");
  if (home) { e.preventDefault(); location.hash = ""; showGallery(galleryKeys[0]); }
});

window.addEventListener("hashchange", route);

/* ===========================================================================
   Inline editing UI
   =========================================================================== */

function currentWork() {
  return GALLERIES[current.key]?.works[current.index] || null;
}

function makeEditable(el, field) {
  el.addEventListener("dblclick", () => {
    if (!editing) return;
    el.setAttribute("contenteditable", "true");
    el.classList.add("editing-field");
    el.focus();
    document.getSelection().selectAllChildren(el);
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); el.blur(); }
    if (e.key === "Escape") { el.textContent = contentFor(currentWork())[field]; el.blur(); }
  });
  el.addEventListener("blur", () => {
    if (el.getAttribute("contenteditable") !== "true") return;
    el.removeAttribute("contenteditable");
    el.classList.remove("editing-field");
    const work = currentWork();
    if (!work) return;
    const value = el.textContent.trim();
    localOverrides[work.src] = localOverrides[work.src] || {};
    localOverrides[work.src][field] = value;
    saveLocalOverrides();
  });
}

function enterEditMode() {
  if (editing) return;
  if (sessionStorage.getItem("bb_unlocked") !== "1") {
    const pw = window.prompt("Enter the editing password:");
    if (pw === null) return;
    if (pw !== EDIT_PASSWORD) { window.alert("Incorrect password."); return; }
    sessionStorage.setItem("bb_unlocked", "1");
  }
  editing = true;
  document.body.classList.add("editing");
  buildEditToolbar();
}

function exitEditMode() {
  editing = false;
  document.body.classList.remove("editing");
  const bar = $("#edit-toolbar");
  if (bar) bar.remove();
}

function buildEditToolbar() {
  if ($("#edit-toolbar")) return;
  const bar = document.createElement("div");
  bar.id = "edit-toolbar";
  bar.innerHTML = `
    <span class="eb-label">Editing — double-click any title or description</span>
    <button id="eb-publish">Publish changes…</button>
    <button id="eb-done">Done</button>`;
  document.body.appendChild(bar);
  $("#eb-done").addEventListener("click", exitEditMode);
  $("#eb-publish").addEventListener("click", publishChanges);
}

/* Publish local edits so everyone sees them. Uses the GitHub API when GITHUB is
   configured; otherwise downloads the file for a manual commit. */
async function publishChanges() {
  const merged = Object.assign({}, publishedOverrides, localOverrides);
  const json = JSON.stringify(merged, null, 2);

  if (GITHUB.owner && GITHUB.repo) {
    return publishViaGitHub(merged, json);
  }
  downloadOverrides(json);
}

function downloadOverrides(json) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "content-overrides.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  if (navigator.clipboard) navigator.clipboard.writeText(json).catch(() => {});
  window.alert(
    "Saved content-overrides.json to your Downloads.\n\n" +
    "Add that file to the website to publish the changes (see README). Until " +
    "then, your edits are saved in this browser."
  );
}

function getToken() {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = window.prompt(
      "One-time setup: paste the GitHub publishing token.\n" +
      "(It's saved in this browser so you won't be asked again.)"
    );
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
  }
  return token ? token.trim() : null;
}

/* btoa over UTF-8 (handles accented characters, ×, etc.) */
function toBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

async function publishViaGitHub(merged, json) {
  const token = getToken();
  if (!token) return;

  const api = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${GITHUB.path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };
  const publishBtn = document.getElementById("eb-publish");
  if (publishBtn) { publishBtn.disabled = true; publishBtn.textContent = "Publishing…"; }

  try {
    // Need the current file's SHA to update it (omit if the file doesn't exist yet)
    let sha;
    const getRes = await fetch(`${api}?ref=${GITHUB.branch}`, { headers, cache: "no-store" });
    if (getRes.ok) sha = (await getRes.json()).sha;
    else if (getRes.status === 401) { invalidToken(); return; }

    const putRes = await fetch(api, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: "Update painting titles/descriptions",
        content: toBase64(json),
        branch: GITHUB.branch,
        ...(sha ? { sha } : {}),
      }),
    });

    if (putRes.status === 401) { invalidToken(); return; }
    if (!putRes.ok) throw new Error(`GitHub responded ${putRes.status}`);

    publishedOverrides = merged;
    localOverrides = {};
    saveLocalOverrides();
    window.alert("Published! Your changes will be live on the website within about a minute.");
  } catch (err) {
    window.alert("Could not publish: " + err.message + "\nYour edits are still saved in this browser.");
  } finally {
    if (publishBtn) { publishBtn.disabled = false; publishBtn.textContent = "Publish changes…"; }
  }
}

function invalidToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.alert("The publishing token was rejected. Please click Publish again and re-enter it.");
}

const editLink = document.getElementById("edit-link");
if (editLink) editLink.addEventListener("click", (e) => { e.preventDefault(); enterEditMode(); });

/* ===========================================================================
   Init
   =========================================================================== */

makeEditable(els.capTitle, "title");
makeEditable(els.capDetail, "details");

document.getElementById("year").textContent = new Date().getFullYear();
buildNav();

loadPublished().finally(route);
