const TOTAL_NATIONAL_DEX = 1025;

async function loadPokedex() {
  const res = await fetch("./data/pokedex.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No s'ha pogut carregar pokedex.json");
  return res.json();
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function dexNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

// Sprite robust:
// - si hi ha pokeapiId: usa'l (formes)
// - si no: usa dex (nacional)
function spriteUrl(p) {
  const id = dexNum(p.pokeapiId) ?? dexNum(p.dex);
  if (!id) return null;

  // Sprites clàssics (els petits)
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function groupByBase(pokemons) {
  const map = new Map();
  for (const p of pokemons) {
    const base = (p.baseName ?? p.nom ?? "").toString().trim();
    const dex = dexNum(p.dex) ?? 999999;
    const key = `${dex}__${normalize(base)}`;
    if (!map.has(key)) map.set(key, { baseName: base, dex: dexNum(p.dex), forms: [] });
    map.get(key).forms.push(p);
  }

  const groups = [...map.values()];
  groups.sort((a, b) => (a.dex ?? 999999) - (b.dex ?? 999999) || normalize(a.baseName).localeCompare(normalize(b.baseName)));
  return groups;
}

function renderAnalysis(pokemons) {
  const analysisEl = document.getElementById("analysis");

  const countsByRole = {};
  for (const p of pokemons) {
    const r = normalize(p.rol);
    const key = r || "sense rol";
    countsByRole[key] = (countsByRole[key] ?? 0) + 1;
  }

  const roleLines = Object.entries(countsByRole)
    .sort((a, b) => b[1] - a[1])
    .map(([role, n]) => `- ${role}: ${n}`)
    .join("\n");

  const warnings = Object.entries(countsByRole)
    .filter(([, n]) => n >= 2 && !!n)
    .map(([role, n]) => `⚠️ Tens ${n} Pokémon amb el rol “${role}”.`)
    .join("<br>");

  analysisEl.innerHTML = `
<pre style="margin:0; white-space:pre-wrap;">${roleLines || "- (encara no hi ha dades)"}</pre>
${warnings ? `<div style="margin-top:8px;">${warnings}</div>` : `<div style="margin-top:8px;">✅ Rols bastant equilibrats (de moment).</div>`}
`;
}

function openModal(modalEl) {
  modalEl.style.display = "block";
  document.body.style.overflow = "hidden";
}
function closeModal(modalEl) {
  modalEl.style.display = "none";
  document.body.style.overflow = "";
}

function renderModal(modalEl, group) {
  const titleEl = modalEl.querySelector("#modalTitle");
  const bodyEl = modalEl.querySelector("#modalBody");

  const dexText = group.dex ? `#${group.dex} ` : "";
  titleEl.textContent = `${dexText}${group.baseName}`;

  const forms = [...group.forms];
  // primer la forma “normal” (sense (X)) i després les altres
  forms.sort((a, b) => {
    const aIsForm = /\(.*\)/.test(a.nom ?? "");
    const bIsForm = /\(.*\)/.test(b.nom ?? "");
    return Number(aIsForm) - Number(bIsForm);
  });

  const rows = forms.map((p) => {
    const imgUrl = spriteUrl(p);
    const imgHtml = imgUrl
      ? `<img src="${imgUrl}" alt="${p.nom ?? ""}" width="64" height="64" style="image-rendering:pixelated" onerror="this.style.display='none'">`
      : "";

    const tipus = Array.isArray(p.tipus) && p.tipus.length ? `[${p.tipus.join(", ")}]` : "";
    const joc = p.joc ? `${p.joc}` : "";
    const reg = p.regio ? `${p.regio}` : "";
    const rol = p.rol ? `${p.rol}` : "";
    const natura = p.naturalesa ? `${p.naturalesa}` : "";
    const movs = Array.isArray(p.moviments) ? p.moviments.filter(Boolean) : [];
    const movText = movs.length ? `Moviments: ${movs.join(", ")}` : "";
    const notes = p.notes ? p.notes : "";

    const meta = [tipus, reg, joc].filter(Boolean).join(" · ");
    const extra = [rol, natura, movText, notes].filter(Boolean).join(" · ");

    return `
<div style="display:flex; gap:12px; align-items:flex-start; padding:10px 0; border-top:1px solid #eee;">
  <div style="width:72px; min-width:72px;">${imgHtml}</div>
  <div>
    <div style="font-weight:600;">${p.nom ?? group.baseName}</div>
    <div style="opacity:.85;">${meta || ""}</div>
    ${extra ? `<div style="margin-top:6px;">${extra}</div>` : ""}
  </div>
</div>`;
  });

  bodyEl.innerHTML = `
<div style="opacity:.85; margin-bottom:8px;">Formes capturades: ${forms.length}</div>
<div>${rows.join("")}</div>
`;
}

function renderList(listEl, groups, onSelect) {
  listEl.innerHTML = "";

  for (const g of groups) {
    const li = document.createElement("li");
    li.style.listStyle = "none";
    li.style.padding = "12px 10px";
    li.style.borderRadius = "12px";
    li.style.cursor = "pointer";
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "12px";

    li.addEventListener("mouseenter", () => (li.style.background = "#f5f5f5"));
    li.addEventListener("mouseleave", () => (li.style.background = ""));

    // agafem una “forma representativa” per la llista: preferim la normal, si no la primera
    const forms = g.forms ?? [];
    const rep =
      forms.find((p) => !/\(.*\)/.test(p.nom ?? "")) ??
      forms[0] ??
      { nom: g.baseName, dex: g.dex };

    const img = document.createElement("img");
    img.alt = rep.nom ?? g.baseName;
    img.width = 64;
    img.height = 64;
    img.style.imageRendering = "pixelated";

    const spr = spriteUrl(rep);
    if (spr) img.src = spr;
    else img.style.display = "none";

    // si falla, amaga
    img.onerror = () => {
      img.style.display = "none";
    };

    const text = document.createElement("div");

    const d = dexNum(rep.dex ?? g.dex);
    const dexText = d ? `#${d} ` : "";
    const tipus = Array.isArray(rep.tipus) && rep.tipus.length ? ` [${rep.tipus.join(", ")}]` : "";
    const joc = rep.joc ? ` — ${rep.joc}` : "";
    const reg = rep.regio ? ` · ${rep.regio}` : "";
    const rol = rep.rol ? ` · ${rep.rol}` : "";
    const natura = rep.naturalesa ? ` · ${rep.naturalesa}` : "";

    const moreForms = (g.forms?.length ?? 1) > 1 ? ` · +${(g.forms.length - 1)} forma/es` : "";

    text.textContent = `${dexText}${g.baseName}${tipus}${joc}${reg}${rol}${natura}${moreForms}`;

    li.appendChild(img);
    li.appendChild(text);

    li.addEventListener("click", () => onSelect(g));
    listEl.appendChild(li);
  }
}

function setupModal() {
  // Crea modal si no existeix
  let modal = document.getElementById("modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modal";
    modal.style.display = "none";
    modal.innerHTML = `
<div style="position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; padding:24px; z-index:9999;">
  <div style="background:#fff; border-radius:16px; width:min(820px, 100%); max-height:min(80vh, 900px); overflow:auto; box-shadow:0 10px 30px rgba(0,0,0,.25);">
    <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid #eee;">
      <div id="modalTitle" style="font-size:20px; font-weight:800;"></div>
      <button id="modalClose" style="border:0; background:#eee; padding:6px 10px; border-radius:10px; cursor:pointer;">Tancar</button>
    </div>
    <div id="modalBody" style="padding:16px 18px;"></div>
  </div>
</div>`;
    document.body.appendChild(modal);
  }

  const overlay = modal.firstElementChild;
  const closeBtn = modal.querySelector("#modalClose");

  closeBtn.addEventListener("click", () => closeModal(modal));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(modal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal(modal);
  });

  return modal;
}

function hideFitxaSectionIfAny() {
  // Si tens una secció “Fitxa” fixa a l’HTML i la vols eliminar després, ho farem al final.
  // Ara no toquem res per no trencar-te res.
}

function renderApp(data, query) {
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");

  const pokemons = Array.isArray(data) ? data : (data.pokemon ?? []);
  const q = normalize(query);

  // filtrem per nom o baseName
  const filtered = pokemons.filter((p) => {
    const n = normalize(p.nom);
    const b = normalize(p.baseName);
    return n.includes(q) || b.includes(q);
  });

  const groups = groupByBase(filtered);
  const groupsAll = groupByBase(pokemons);

  countEl.textContent = `${groups.length} / ${groupsAll.length} Pokémon mostrats`;

  renderAnalysis(pokemons);

  const modal = setupModal();
  renderList(listEl, groups, (g) => {
    renderModal(modal, g);
    openModal(modal);
  });

  hideFitxaSectionIfAny();
}

(async () => {
  const qEl = document.getElementById("q");
  const countEl = document.getElementById("count");
  const listEl = document.getElementById("list");

  let data;
  try {
    data = await loadPokedex();
  } catch (e) {
    countEl.textContent = "Error carregant dades";
    listEl.innerHTML = `<li>No he pogut llegir <code>data/pokedex.json</code></li>`;
    return;
  }

  renderApp(data, "");

  qEl.addEventListener("input", () => {
    renderApp(data, qEl.value);
  });
})();