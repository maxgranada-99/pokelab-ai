// ====== CONFIG ======
const TOTAL_DEX = 1025;

// Sprite: si tenim pokeapiId usem aquest; si no, dex
function spriteUrl(p) {
  const id = p?.pokeapiId ?? p?.dex;
  if (!id) return "";
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function dexNum(dex) {
  const n = Number(dex);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function openModal(title, subtitle, bodyHtml) {
  const overlay = document.getElementById("modalOverlay");
  const t = document.getElementById("modalTitle");
  const s = document.getElementById("modalSubtitle");
  const b = document.getElementById("modalBody");
  if (!overlay || !t || !s || !b) return;

  t.textContent = title || "";
  s.textContent = subtitle || "";
  b.innerHTML = bodyHtml || "";

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  const b = document.getElementById("modalBody");
  if (!overlay) return;

  overlay.classList.add("hidden");
  overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (b) b.innerHTML = "";
}

async function loadCaptured() {
  const res = await fetch("./data/pokedex.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No s'ha pogut carregar pokedex.json");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.pokemon ?? []);
}

// Base dex: 1..1025 amb nom “—” (de moment). El nom real el prendrem del capturat.
function buildBaseDex() {
  const arr = [];
  for (let i = 1; i <= TOTAL_DEX; i++) {
    arr.push({ dex: i, name: `#${i}` });
  }
  return arr;
}

function setProgress(capturedUnique) {
  const pct = TOTAL_DEX > 0 ? Math.round((capturedUnique / TOTAL_DEX) * 100) : 0;
  const fill = document.getElementById("progressFill");
  const txt = document.getElementById("progressText");

  if (fill) fill.style.width = `${pct}%`;
  if (txt) txt.textContent = `${capturedUnique}/${TOTAL_DEX} · ${pct}%`;

  const pokeball = document.getElementById("captureBtn");
  if (pokeball) pokeball.style.setProperty("--p", pct / 100);
}

function renderDetail(entry, allCaptured) {
  const el = document.getElementById("detail");
  if (!el) return;

  if (!entry) {
    el.className = "muted";
    el.textContent = "Clica un Pokémon capturat per veure’n el detall.";
    return;
  }

  const dex = dexNum(entry.dex);
  const dexText = dex ? `#${dex} ` : "";
  const title = `${dexText}${entry.baseName || entry.nom || "—"}`;

  // Agrupem formes del mateix dex
  const forms = dex ? allCaptured.filter(x => dexNum(x.dex) === dex) : [entry];

  const formsHtml = forms.map(f => {
    const img = spriteUrl(f);
    const tipus = Array.isArray(f.tipus) && f.tipus.length ? f.tipus.join(", ") : "—";
    const movs = Array.isArray(f.moviments) ? f.moviments.filter(x => x && x !== "_No response_") : [];
    const movText = movs.length ? movs.join(", ") : "—";
    const nat = f.naturalesa ? `Naturalesa: ${f.naturalesa}` : "";
    const rol = f.rol ? `Rol: ${f.rol}` : "";

    return `
      <div style="display:flex; gap:12px; padding:10px 0; border-top:1px solid #eee;">
        ${img ? `<img src="${img}" alt="${f.nom}" width="64" height="64" onerror="this.style.display='none'">` : ""}
        <div style="flex:1">
          <div style="font-weight:700">${f.nom}${f.forma ? ` · ${f.forma}` : ""}</div>
          <div class="muted">${tipus}${f.regio ? ` · ${f.regio}` : ""}${f.joc ? ` — ${f.joc}` : ""}</div>
          ${(nat || rol) ? `<div class="muted" style="margin-top:4px">${nat}${nat && rol ? " · " : ""}${rol}</div>` : ""}
          <div class="muted" style="margin-top:6px"><b>Moviments:</b> ${movText}</div>
          ${f.notes ? `<div class="muted" style="margin-top:4px"><b>Notes:</b> ${f.notes}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  const headImg = spriteUrl(entry);

  el.className = "detail";
  el.innerHTML = `
    <div class="detail-head">
      ${headImg ? `<img src="${headImg}" alt="${entry.nom}" onerror="this.style.display='none'">` : ""}
      <div style="flex:1">
        <h2>${title}</h2>
        <div class="muted">${entry.regio ? `Regió: ${entry.regio}` : ""}</div>
        <div class="muted">Formes capturades: ${forms.length}</div>
      </div>
    </div>
    <div style="margin-top:10px">${formsHtml}</div>
  `;
}

function renderGrid(baseDex, captured, query) {
  const grid = document.getElementById("grid");
  const countEl = document.getElementById("count");
  if (!grid) return;

  const q = normalize(query);

  // Map capturats per dex (primer capturat trobat)
  const byDex = new Map();
  for (const p of captured) {
    const d = dexNum(p.dex);
    if (!d) continue;
    if (!byDex.has(d)) byDex.set(d, p);
  }

  // Progrés: espècies úniques
  setProgress(byDex.size);

  const visibleDex = baseDex.filter(item => {
    if (!q) return true;
    const cap = byDex.get(item.dex);
    const name = cap?.baseName || cap?.nom || "";
    return normalize(name).includes(q);
  });

  if (countEl) countEl.textContent = `${visibleDex.length} / ${TOTAL_DEX} mostrats`;

  grid.innerHTML = "";

      // --- NEW CAPTURE detection (via localStorage) ---
  const LS_KEY = "pokedex_seen_dex_v1";
  let seen = new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) seen = new Set(JSON.parse(raw));
  } catch {}
  for (const item of visibleDex) {
    const cap = byDex.get(item.dex);
    const isNewCapture = !!cap && !seen.has(item.dex);

    const cell = document.createElement("div");
    cell.className = "cell" + (cap ? "" : " locked");
    if (isNewCapture) {
      cell.classList.add("new-capture");
      seen.add(item.dex);
    }

    const dexEl = document.createElement("div");
    dexEl.className = "dex";
    dexEl.textContent = `#${item.dex}`;

    const img = document.createElement("img");
    img.alt = cap ? (cap.baseName || cap.nom) : "";
    if (cap) {
      img.src = spriteUrl(cap) || "";
      img.onerror = () => (img.style.display = "none");
    } else {
      img.style.display = "none";
    }

    const nameEl = document.createElement("div");
    nameEl.className = "name";
    nameEl.textContent = cap ? (cap.baseName || cap.nom) : "—";

    cell.appendChild(dexEl);
    cell.appendChild(img);
    cell.appendChild(nameEl);

    if (cap) {
      cell.addEventListener("click", () => {
        renderDetail(cap, captured);

        const dex = dexNum(cap.dex);
        const title = `#${dex || "?"} ${cap.baseName || cap.nom}`;
        const subtitle = cap.regio ? `Regió: ${cap.regio}` : "";
        const body = document.getElementById("detail")?.innerHTML || "";

        openModal(title, subtitle, body);
      });
    }

    grid.appendChild(cell);
  }
  try {
  localStorage.setItem(LS_KEY, JSON.stringify([...seen].sort((a,b)=>a-b)));
} catch {}
}

(async () => {
  const qEl = document.getElementById("q");
  const addBtn = document.getElementById("addBtn");

  let captured = [];
  try {
    captured = await loadCaptured();
  } catch (e) {
    const countEl = document.getElementById("count");
    if (countEl) countEl.textContent = "Error carregant dades";
    return;
  }

  const baseDex = buildBaseDex();

  // primera renderització
  renderDetail(null, captured);
  renderGrid(baseDex, captured, "");

  // cerca
  if (qEl) {
    qEl.addEventListener("input", () => {
      renderGrid(baseDex, captured, qEl.value);
    });
  }

  // Botó afegir: de moment, porta a New Issue del repo (tu ja tens el template)
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      window.open("./.github/ISSUE_TEMPLATE/", "_blank");
    });
  }

  // --- Modal: tancar amb ✕, clic fora i ESC ---
  const overlay = document.getElementById("modalOverlay");
  const closeBtn = document.getElementById("modalClose");

  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
})();
const addPokemonBtn = document.getElementById("addPokemonBtn");

if (addPokemonBtn) {
  addPokemonBtn.addEventListener("click", () => {
    window.open(
      "https://github.com/maxgranada-99/pokelab-ai/issues/new?template=afegir-pokemon.yml",
      "_blank"
    );
  });
}