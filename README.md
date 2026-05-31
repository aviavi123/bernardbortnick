# Bernard Bortnick — portfolio site

A white, minimal painting portfolio modeled on the Whitespace layout: a top row of
horizontally-scrollable thumbnails with a large image stage below. Pure static
HTML/CSS/JS — no build step, no dependencies. Designed to live on GitHub Pages at
**bernardbortnick.com**.

## Files
```
index.html              Page shell
css/style.css           All styling (white theme, thumbnail strip, stage, edit mode)
js/main.js              Gallery data + behavior  ← edit this to add paintings
images/<category>/      One folder per category, holds that category's paintings
generate_placeholders.py  Throwaway script that made the placeholders — delete later
content-overrides.json  (optional) published title/description edits — see "Editing"
```

## Category folders
Each category has its own folder under `images/`. Drop Bernard's painting files
into the matching one:
```
images/portraits/
images/landscapes/
images/age-of-outrage/
images/figurative/
images/watercolors/
images/drawings-people-and-places/
images/drawings-political/
```

## Preview locally
```
cd bernardbortnick-site
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Adding Bernard's real paintings
1. Put image files in the right `images/<category>/` folder (JPG/PNG; ~1600px on
   the long edge is plenty).
2. Open `js/main.js` and edit the `GALLERIES` object. Each work is one line:
   ```js
   { src: "images/landscapes/field.jpg", title: "Field, Late Afternoon",
     details: "Oil on canvas, 28 × 40 in, 2021" },
   ```
3. Delete the `placeholder-*.svg` files and `generate_placeholders.py` once real
   images are in.

## Editing titles & descriptions on the page (no HTML)
There's an **Edit** link in the footer.
1. Click it and enter the password (set by `EDIT_PASSWORD` at the top of
   `js/main.js` — **change it from the default**).
2. Double-click any title or description in the gallery to edit it; press Enter
   to keep, Esc to cancel. Edits save instantly **in that browser**.
3. Click **Publish changes…** to make them live for everyone.

> Note: the password is light security — it lives in the page's code, so it keeps
> casual visitors out but is not a real secret. Fine for an art portfolio.

### One-click publishing setup (do this once)
"Publish" commits a `content-overrides.json` file straight to GitHub via its API,
so the site updates on its own within ~1 minute. To enable it:

1. Push the site to a GitHub repo and note the owner + repo name.
2. In `js/main.js`, fill in the `GITHUB` block at the top:
   ```js
   const GITHUB = { owner: "your-username", repo: "bernardbortnick", branch: "main", path: "content-overrides.json" };
   ```
3. Create a **fine-grained personal access token** at
   github.com → Settings → Developer settings → Fine-grained tokens:
   - **Repository access:** only the site repo.
   - **Permissions:** Contents → **Read and write** (nothing else).
   - Copy the token.
4. On your dad's computer, the first time he clicks **Publish**, paste that token
   when prompted. It's saved in his browser, so he's never asked again — from then
   on he just edits and clicks Publish.

> The token is stored in the browser's local storage. Scope it to **only this
> repo** with **only Contents write** so that, worst case, it can edit nothing but
> this website. To revoke it, delete the token on GitHub and it stops working.

Until the `GITHUB` block is filled in, **Publish** simply downloads
`content-overrides.json` and you commit it to the repo manually.

## Deploying to GitHub Pages + custom domain
1. Create a repo (e.g. `bernardbortnick`) and push these files.
2. Repo → Settings → Pages → deploy from `main` branch, root folder.
3. Add a file named `CNAME` containing just: `bernardbortnick.com`
4. At your domain registrar, point DNS at GitHub Pages:
   - `A` records for `@` → `185.199.108.153`, `.109.153`, `.110.153`, `.111.153`
   - `CNAME` for `www` → `<your-github-username>.github.io`
5. Back in Settings → Pages, set the custom domain and enable "Enforce HTTPS".
