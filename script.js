async function loadPokedex() {
  const res = await fetch("./data/pokedex.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No s'ha pogut carregar pokedex.json");
  const data = await res.json();
  return Array.isArray(data) ? data : (data.pokemon ?? []);
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function dexNum(dex) {
  const n = Number(dex);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Barra de progrés
function setProgress(capturedUnique, total) {
  const pct = total > 0 ? Math.round((capturedUnique / total) * 100) : 0;

  const txt =
    document.getElementById("progressText") ||
    document.getElementById("progress-text") ||
    document.getElementById("progress_label") ||
    document.getElementById("progressLabel");

  // HTML teu: la barra és el fill que s’ha d’omplir (progressFill)
  const fill =
    document.getElementById("progressFill") ||
    document.getElementById("progress-fill");

  // POSSIBLE 2n percentatge (si existeix al teu HTML)
  const pctEl =
    document.getElementById("percent") ||
    document.getElementById("progressPercent") ||
    document.getElementById("progress-percent");

  if (txt) txt.textContent = `${capturedUnique}/${total} · ${pct}%`;
  if (pctEl) pctEl.textContent = ""; // evita que surti el 2n "0%"

  if (fill && fill.style) {
    fill.style.width = `${pct}%`;
    fill.setAttribute("aria-valuenow", String(capturedUnique));
    fill.setAttribute("aria-valuemax", String(total));
  }
}

function getFormsForSameDex(data, p) {
  const d = dexNum(p.dex);
  if (!d) return [p];

  const all = data.filter(x => dexNum(x.dex) === d);

  all.sort((a, b) => {
    const aForm = (a.forma || "").trim();
    const bForm = (b.forma || "").trim();
    if (!aForm && bForm) return -1;
    if (aForm && !bForm) return 1;
    return aForm.localeCompare(bForm);
  });

  return all;
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

function renderDetail(data, p) {
  const dex = dexNum(p.dex);
  const dexText = dex ? `#${dex} ` : "";

  const forms = getFormsForSameDex(data, p);

  const formsHtml = forms.map(f => {
    const fdex = dexNum(f.dex);
    const fspriteId = f.pokeapiId ?? fdex;
    const fsprite = fspriteId
      ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${fspriteId}.png`
      : "";

    const ftipus = Array.isArray(f.tipus) && f.tipus.length ? f.tipus.join(", ") : "—";
    const fmovs = Array.isArray(f.moviments) ? f.moviments.filter(x => x && x !== "_No response_") : [];
    const fmovText = fmovs.length ? fmovs.join(", ") : "—";

    return `
      <div style="display:flex; gap:12px; padding:10px 0; border-top:1px solid #eee;">
        ${fsprite ? `<img src="${fsprite}" alt="${f.nom}" width="64" height="64" onerror="this.style.display='none'">` : ""}
        <div style="flex:1">
          <div style="font-weight:700">${f.nom}${f.forma ? ` · ${f.forma}` : ""}</div>
          <div class="muted">
            ${ftipus}
            ${f.regio ? ` · ${f.regio}` : ""}
            ${f.joc ? ` — ${f.joc}` : ""}
            ${f.naturalesa ? ` · ${f.naturalesa}` : ""}
            ${f.rol ? ` · ${f.rol}` : ""}
          </div>
          <div class="muted" style="margin-top:4px"><b>Moviments:</b> ${fmovText}</div>
          ${f.notes ? `<div class="muted" style="margin-top:2px"><b>Notes:</b> ${f.notes}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  // Títol + “Regió” sota el nom (com vols)
  const title = `${dexText}${p.baseName || p.nom}`;
  const regionLine = p.regio ? `Regió: ${p.regio}` : (p.forma ? `Regió: ${p.forma}` : "");

  console.log("renderDetail executat", p.nom);

  openModal(
    title,
    regionLine,
    `<div class="muted">Formes capturades: ${forms.length}</div>
     <div style="margin-top:8px">${formsHtml}</div>`
  );
}

function render(listEl, countEl, data, query) {
  const q = normalize(query);
  const items = data.filter(p => normalize(p.nom).includes(q));

  if (countEl) countEl.textContent = `${items.length} / ${data.length} Pokémon mostrats`;

  const TOTAL_DEX = 1025;
  const uniqueDex = new Set(data.map(p => dexNum(p.dex)).filter(Boolean)).size;
  setProgress(uniqueDex, TOTAL_DEX);

  // Anàlisi ràpida
  const analysisEl = document.getElementById("analysis");
  if (analysisEl) {
    const countsByRole = {};
    for (const p of data) {
      const r = (p.rol ?? "sense rol").toString().trim().toLowerCase();
      countsByRole[r] = (countsByRole[r] ?? 0) + 1;
    }

    const roleLines = Object.entries(countsByRole)
      .sort((a, b) => b[1] - a[1])
      .map(([role, n]) => `- ${role}: ${n}`)
      .join("\n");

    const warnings = Object.entries(countsByRole)
      .filter(([, n]) => n >= 2)
      .map(([role, n]) => `⚠️ Tens ${n} Pokémon amb el rol “${role}”.`)
      .join("<br>");

    analysisEl.innerHTML = `
<pre style="margin:0; white-space:pre-wrap;">${roleLines || "- (encara no hi ha dades)"}</pre>
${warnings ? `<div style="margin-top:8px;">${warnings}</div>` : `<div style="margin-top:8px;">✅ Rols bastant equilibrats (de moment).</div>`}
`;
  }

  // Llista
  listEl.innerHTML = "";

  const sorted = [...items].sort((a, b) => (dexNum(a.dex) ?? 99999) - (dexNum(b.dex) ?? 99999));

  for (const p of sorted) {
    const li = document.createElement("li");
    li.className = "row";

    const dex = dexNum(p.dex);
    const dexText = dex ? `#${dex} ` : "";

    const img = document.createElement("img");
    img.alt = p.nom;
    img.width = 64;
    img.height = 64;

    const spriteId = p.pokeapiId ?? dex;
    if (spriteId) {
      img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
      img.onerror = () => (img.style.display = "none");
    } else {
      img.style.display = "none";
    }

    const text = document.createElement("div");
    const joc = p.joc ? ` — ${p.joc}` : "";
    const regio = p.regio ? ` · ${p.regio}` : "";
    const tipus = Array.isArray(p.tipus) && p.tipus.length ? ` [${p.tipus.join(", ")}]` : "";
    const rol = p.rol ? ` · ${p.rol}` : "";
    const natura = p.naturalesa ? ` · ${p.naturalesa}` : "";
    const notes = p.notes ? ` · ${p.notes}` : "";

    text.textContent = `${dexText}${p.nom}${tipus}${joc}${regio}${rol}${natura}${notes}`;

    li.appendChild(img);
    li.appendChild(text);

    li.addEventListener("click", () => {
      console.log("CLICK:", p.nom);
      renderDetail(data, p);
    });

    listEl.appendChild(li);
  }
}

(async () => {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const qEl = document.getElementById("q");

  let data = [];
  try {
    data = await loadPokedex();
  } catch (e) {
    if (countEl) countEl.textContent = "Error carregant dades";
    if (listEl) listEl.innerHTML = `<li>No he pogut llegir <code>data/pokedex.json</code></li>`;
    return;
  }

  render(listEl, countEl, data, "");

    // Modal: tancar amb creu
  const closeBtn = document.getElementById("modalClose");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Modal: tancar clicant fora
  const overlay = document.getElementById("modalOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Modal: tancar amb ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (qEl) {
    qEl.addEventListener("input", () => {
      render(listEl, countEl, data, qEl.value);
    });
  }
})();