const TOTAL_NATIONAL_DEX = 1025;

async function loadPokedex() {
  const res = await fetch("./data/pokedex.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No s'ha pogut carregar pokedex.json");
  return res.json();
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function toArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function uniqueDexCount(pokemons) {
  const set = new Set();
  for (const p of pokemons) if (Number.isFinite(p.dex)) set.add(p.dex);
  return set.size;
}

function updateProgress(pokemons) {
  const captured = uniqueDexCount(pokemons);
  const pct = TOTAL_NATIONAL_DEX > 0 ? (captured / TOTAL_NATIONAL_DEX) * 100 : 0;

  document.getElementById("progressFill").style.width =
    `${Math.min(100, Math.max(0, pct)).toFixed(2)}%`;

  document.getElementById("progressText").textContent =
    `${captured} / ${TOTAL_NATIONAL_DEX} capturats (${pct.toFixed(2)}%)`;
}

function renderAnalysis(pokemons) {
  const analysisEl = document.getElementById("analysis");
  const countsByRole = {};

  for (const p of pokemons) {
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
${warnings
  ? `<div style="margin-top:8px;">${warnings}</div>`
  : `<div style="margin-top:8px;">✅ Rols bastant equilibrats (de moment).</div>`}
`;
}

function spriteUrlByDex(dex) {
  if (!dex) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

function renderDetail(p) {
  const detailEl = document.getElementById("detail");
  if (!p) {
    detailEl.className = "muted";
    detailEl.textContent = "Clica un Pokémon de la llista per veure’n el detall.";
    return;
  }

  const dexText = p.dex ? `#${p.dex}` : "(sense #dex)";
  const title = `${dexText} ${p.nom}`;

  const tipusArr = toArray(p.tipus);
  const movArr = toArray(p.moviments).filter(x => normalize(x) !== "_no response_");

  const sprite = spriteUrlByDex(p.dex);

  detailEl.className = "detail";
  detailEl.innerHTML = `
<div class="detail-head">
  ${sprite ? `<img src="${sprite}" alt="${p.nom}" width="120" height="120">` : ""}
  <div>
    <h3>${title}</h3>
    <div class="muted">${p.regio ? p.regio : "—"}</div>
  </div>
  <button class="close" id="closeDetail">Tancar</button>
</div>

<div class="grid">
  <div class="k">Tipus</div>
  <div class="v">
    ${tipusArr.length ? tipusArr.map(t => `<span class="pill">${t}</span>`).join("") : "—"}
  </div>

  <div class="k">Joc</div>
  <div class="v">${p.joc ?? "—"}</div>

  <div class="k">Naturalesa</div>
  <div class="v">${p.naturalesa ?? "—"}</div>

  <div class="k">Rol</div>
  <div class="v">${p.rol ?? "—"}</div>

  <div class="k">Moviments</div>
  <div class="v">${movArr.length ? movArr.join(", ") : "—"}</div>

  <div class="k">Notes</div>
  <div class="v">${(p.notes ?? "").toString().trim() || "—"}</div>
</div>
`;

  document.getElementById("closeDetail").addEventListener("click", () => {
    renderDetail(null);
  });
}

function renderList(listEl, pokemons, items, onSelect) {
  listEl.innerHTML = "";

  for (const p of items) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "row";

    const img = document.createElement("img");
    img.alt = p.nom;
    img.width = 64;
    img.height = 64;

    const sprite = spriteUrlByDex(p.dex);
    if (sprite) img.src = sprite;
    else img.style.display = "none";

    const text = document.createElement("div");

    const dexText = p.dex ? `#${p.dex} ` : "";
    const reg = p.regio ? ` · ${p.regio}` : "";
    const joc = p.joc ? ` — ${p.joc}` : "";
    const tipus = Array.isArray(p.tipus) && p.tipus.length ? ` [${p.tipus.join(", ")}]` : "";
    const rol = p.rol ? ` · ${p.rol}` : "";
    const natura = p.naturalesa ? ` · ${p.naturalesa}` : "";
    const notes = p.notes ? ` · ${p.notes}` : "";

    text.textContent = `${dexText}${p.nom}${tipus}${joc}${reg}${rol}${natura}${notes}`;

    row.appendChild(img);
    row.appendChild(text);

    row.addEventListener("click", () => onSelect(p));

    li.appendChild(row);
    listEl.appendChild(li);
  }
}

function renderAll(listEl, countEl, data, query, onSelect) {
  const q = normalize(query);
  const pokemons = Array.isArray(data) ? data : (data.pokemon ?? []);
  const items = pokemons.filter(p => normalize(p.nom).includes(q));

  countEl.textContent = `${items.length} / ${pokemons.length} Pokémon mostrats`;

  updateProgress(pokemons);
  renderAnalysis(pokemons);
  renderList(listEl, pokemons, items, onSelect);
}

(async () => {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");
  const qEl = document.getElementById("q");

  let data;
  try {
    data = await loadPokedex();
  } catch (e) {
    countEl.textContent = "Error carregant dades";
    listEl.innerHTML = `<li>No he pogut llegir <code>data/pokedex.json</code></li>`;
    return;
  }

  let selected = null;

  const onSelect = (p) => {
    selected = p;
    renderDetail(selected);
  };

  renderAll(listEl, countEl, data, "", onSelect);
  renderDetail(null);

  qEl.addEventListener("input", () => {
    renderAll(listEl, countEl, data, qEl.value, onSelect);
  });
})();