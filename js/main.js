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

const EDIT_PASSWORD = "kintrob1";   // light security: deters casual visitors only (see README)

/* One-click publishing target. Fill these in after the GitHub repo exists.
   While owner/repo are blank, "Publish" falls back to downloading a file. */
const GITHUB = {
  owner:  "aviavi123",
  repo:   "bernardbortnick",
  branch: "main",
  path:   "content-overrides.json",
};
const TOKEN_KEY = "bb_gh_token";    // GitHub token, stored in this browser only

/* Category slugs + display titles, in nav order. Must match CATEGORIES in
   build_manifest.py. The actual paintings come from manifest.json (regenerated
   by running `python3 build_manifest.py` whenever images are added/removed). */
const CATEGORIES = [
  ["portraits",                  "Portraits"],
  ["landscapes",                 "Landscapes and the Built Environment"],
  ["age-of-outrage",             "Age of Outrage"],
  ["figurative",                 "Figurative"],
  ["watercolors",                "Watercolors"],
  ["drawings-people-and-places", "Drawings: People and Places"],
  ["drawings-political",         "Drawings: Political"],
];

let GALLERIES = {};   // built from CATEGORIES + manifest.json at startup

function buildGalleries(manifest) {
  GALLERIES = {};
  for (const [slug, title] of CATEGORIES) {
    GALLERIES[slug] = { title, works: (manifest && manifest[slug]) || [] };
  }
}

async function loadManifest() {
  try {
    const res = await fetch("manifest.json", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch { /* ignore — falls back to empty galleries */ }
  return {};
}

const PAGES = {
  about: {
    title: "About",
    html: `
      <p>Bernard Bortnick lives in Dallas, TX. In addition to being a painter,
      Bortnick is a Fellow of the American Institute of Architects, a former
      professor of Architecture at Washington University, and has designed over
      100 buildings around the world.</p>`,
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
  navPrev: $("#nav-prev"),
  navNext: $("#nav-next"),
};

let galleryKeys = [];   // set after galleries are built

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

  if (gallery.works.length === 0) {
    els.galleryView.classList.add("empty");
    els.stageImg.classList.remove("loaded");
    els.stageImg.removeAttribute("src");
    els.capTitle.textContent = "Images coming soon";
    els.capDetail.textContent = "";
    current = { key, index: 0 };
    closeMobileNav();
    return;
  }
  els.galleryView.classList.remove("empty");

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

  const multi = gallery.works.length > 1;
  els.navPrev.hidden = !multi;
  els.navNext.hidden = !multi;

  selectWork(key, workIndex);
  closeMobileNav();
}

/* Move to the previous/next painting in the current series (wraps around).
   selectWork() keeps the thumbnail strip selection in sync. */
function step(delta) {
  const works = GALLERIES[current.key]?.works || [];
  if (works.length < 2) return;
  const next = (current.index + delta + works.length) % works.length;
  selectWork(current.key, next);
}

/* Size the large image to whatever vertical space is left below the thumbnail
   strip, so the full painting + caption fit without scrolling. */
function fitStageImage() {
  const img = els.stageImg;
  if (!img || els.galleryView.hidden) return;
  const caption = document.getElementById("stage-caption");
  const topFromDoc = img.getBoundingClientRect().top + window.scrollY; // scroll-independent
  const captionH = caption ? caption.offsetHeight : 0;
  const reserve = 16 + captionH + 28;   // caption gap + caption height + bottom breathing room
  const available = window.innerHeight - topFromDoc - reserve;
  img.style.maxHeight = Math.max(available, 160) + "px";
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
    requestAnimationFrame(() => { els.stageImg.classList.add("loaded"); fitStageImage(); });
  };
  img.src = work.src;

  els.capTitle.textContent = c.title;
  els.capDetail.textContent = c.details;
  fitStageImage();

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

function defaultGallery() {
  return galleryKeys.find((k) => GALLERIES[k].works.length > 0) || galleryKeys[0];
}

function route() {
  const hash = location.hash.replace(/^#/, "");
  if (!hash) return showGallery(defaultGallery());
  const [key, idx] = hash.split("/");
  if (GALLERIES[key]) return showGallery(key, parseInt(idx, 10) || 0);
  showGallery(defaultGallery());
}

document.addEventListener("click", (e) => {
  const pageLink = e.target.closest("[data-page]");
  if (pageLink) { e.preventDefault(); showPage(pageLink.dataset.page); return; }
  const home = e.target.closest("[data-nav-home]");
  if (home) { e.preventDefault(); location.hash = ""; showGallery(defaultGallery()); }
});

window.addEventListener("hashchange", route);
window.addEventListener("resize", fitStageImage);
els.stageImg.addEventListener("load", fitStageImage);

els.navPrev.addEventListener("click", () => step(-1));
els.navNext.addEventListener("click", () => step(1));

/* Swipe left/right on the image to change paintings (touch screens) */
(function enableSwipe() {
  const wrap = document.querySelector(".stage-image-wrap");
  if (!wrap) return;
  let startX = 0, startY = 0, tracking = false;
  wrap.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { tracking = false; return; }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  wrap.addEventListener("touchend", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    // Require a clearly horizontal swipe so vertical scrolling still works.
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      step(dx < 0 ? 1 : -1);   // swipe left → next, swipe right → previous
    }
  }, { passive: true });
})();

document.addEventListener("keydown", (e) => {
  if (els.galleryView.hidden) return;                 // only when viewing a gallery
  const ae = document.activeElement;
  if (ae && ae.getAttribute && ae.getAttribute("contenteditable") === "true") return;  // mid-edit
  if (e.key === "ArrowLeft")  { e.preventDefault(); step(-1); }
  else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
});

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
    else if (getRes.status === 401 || getRes.status === 403) return tokenProblem(getRes);
    // 404 here just means the file doesn't exist yet — we'll create it below.

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

    if (putRes.status === 401 || putRes.status === 403) return tokenProblem(putRes);
    if (!putRes.ok) {
      const body = await putRes.json().catch(() => ({}));
      throw new Error(`GitHub responded ${putRes.status}` + (body.message ? " — " + body.message : ""));
    }

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

async function tokenProblem(res) {
  const body = await res.json().catch(() => ({}));
  const msg = body.message || "";
  const forget = window.confirm(
    `GitHub refused the publish (${res.status}).\n` +
    (msg ? `Reason: ${msg}\n\n` : "\n") +
    "Most often this means the token is missing “Contents: Read and write” for the " +
    "bernardbortnick repository, or wasn't given access to that repo.\n\n" +
    "Click OK to forget the saved token (so you can paste a fresh one next time), " +
    "or Cancel to keep it — e.g. if you'll just fix its permissions on GitHub."
  );
  if (forget) localStorage.removeItem(TOKEN_KEY);
}

const editLink = document.getElementById("edit-link");
if (editLink) editLink.addEventListener("click", (e) => { e.preventDefault(); enterEditMode(); });

/* ===========================================================================
   Init
   =========================================================================== */

makeEditable(els.capTitle, "title");
makeEditable(els.capDetail, "details");

document.getElementById("year").textContent = new Date().getFullYear();

(async function init() {
  const [, manifest] = await Promise.all([loadPublished(), loadManifest()]);
  buildGalleries(manifest);
  galleryKeys = Object.keys(GALLERIES);
  buildNav();
  route();
})();
