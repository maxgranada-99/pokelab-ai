const TOTAL_NATIONAL_DEX = 1025;

async function loadPokedex() {
  const res = await fetch("./data/pokedex.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No s'ha pogut carregar pokedex.json");
  return res.json();
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function dexNum(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function spriteUrl(p) {
  // PRIORITAT: pokeapiId (formes) > dex (nacional)
  const id = dexNum(p?.pokeapiId) ?? dexNum(p?.dex);
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function baseKey(p) {
  // baseName > nom sense parèntesis
  const bn = (p?.baseName ?? "").toString().trim();
  if (bn) return bn;
  const nom = (p?.nom ?? "").toString();
  return nom.replace(/\s*\(.*?\)\s*/g, "").trim();
}

function labelLine(p) {
  const d = dexNum(p.dex);
  const dexText = d ? `#${d} ` : "";

  const tipus = Array.isArray(p.tipus) && p.tipus.length ? ` [${p.tipus.join(", ")}]` : "";
  const joc = p.joc ? ` — ${p.joc}` : "";
  const reg = p.regio ? ` · ${p.regio}` : "";
  const natura = p.naturalesa ? ` · ${p.naturalesa}` : "";
  const rol = p.rol ? ` · ${p.rol}` : "";
  const notes = p.notes ? ` · ${p.notes}` : "";

  return `${dexText}${p.nom}${tipus}${joc}${reg}${natura}${rol}${notes}`;
}

function groupByBase(pokemons) {
  const map = new Map();
  for (const p of pokemons) {
    const key = baseKey(p);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }

  // ordena formes: primer la "normal" (sense forma o forma buida), després la resta
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => {
      const fa = normalize(a.forma || "");
      const fb = normalize(b.forma || "");
      if (!fa && fb) return -1;
      if (fa && !fb) return 1;
      return fa.localeCompare(fb);
    });
  }
  return map;
}

function renderAnalysis(pokemons) {
  const analysisEl = document.getElementById("analysis");
  if (!analysisEl) return;

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
${warnings ? `<div style="margin-top:8px;">${warnings}</div>` : `<div style="margin-top:8px;">✅ Rols bastant equilibrats (de moment).</div>`}
`;
}

function ensureModal() {
  let modal = document.getElementById("modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modal";
  modal.style.position = "fixed";
  modal.style.inset = "0";
  modal.style.background = "rgba(0,0,0,.45)";
  modal.style.display = "none";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";
  modal.style.padding = "24px";
  modal.style.zIndex = "9999";

  const card = document.createElement("div");
  card.id = "modalCard";
  card.style.background = "white";
  card.style.borderRadius = "12px";
  card.style.maxWidth = "760px";
  card.style.width = "100%";
  card.style.padding = "18px";
  card.style.boxShadow = "0 10px 30px rgba(0,0,0,.25)";

  const closeRow = document.createElement("div");
  closeRow.style.display = "flex";
  closeRow.style.justifyContent = "flex-end";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Tancar";
  closeBtn.style.cursor = "pointer";
  closeBtn.onclick = () => (modal.style.display = "none");

  closeRow.appendChild(closeBtn);

  const content = document.createElement("div");
  content.id = "modalContent";

  card.appendChild(closeRow);
  card.appendChild(content);
  modal.appendChild(card);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  document.body.appendChild(modal);
  return modal;
}

function openModalForGroup(baseName, forms) {
  const modal = ensureModal();
  const content = document.getElementById("modalContent");

  const d = dexNum(forms?.[0]?.dex);
  const header = document.createElement("div");
  header.innerHTML = `
    <div style="font-size:22px; font-weight:700; margin-bottom:6px;">${d ? `#${d} ` : ""}${baseName}</div>
    <div style="color:#444; margin-bottom:12px;">Formes capturades: <b>${forms.length}</b></div>
    <hr style="border:none; border-top:1px solid #eee; margin: 10px 0 14px;">
  `;

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "14px";

  for (const p of forms) {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "64px 1fr";
    row.style.gap = "12px";
    row.style.alignItems = "center";

    const img = document.createElement("img");
    img.width = 64;
    img.height = 64;
    img.alt = p.nom;
    const s = spriteUrl(p);
    if (s) img.src = s;
    else img.style.display = "none";

    const info = document.createElement("div");
    const tipus = Array.isArray(p.tipus) && p.tipus.length ? `[${p.tipus.join(", ")}]` : "";
    const regio = p.regio ? ` · ${p.regio}` : "";
    const joc = p.joc ? ` — ${p.joc}` : "";
    const natura = p.naturalesa ? ` · ${p.naturalesa}` : "";
    const rol = p.rol ? ` · ${p.rol}` : "";

    const movs = Array.isArray(p.moviments)
      ? p.moviments.filter(x => x && x !== "_No response_")
      : [];

    info.innerHTML = `
      <div style="font-weight:700;">${p.nom} ${tipus}${regio}${joc}</div>
      <div style="color:#444; margin-top:2px;">${rol}${natura || ""}</div>
      ${movs.length ? `<div style="margin-top:6px;"><b>Moviments:</b> ${movs.join(", ")}</div>` : ""}
      ${p.notes ? `<div style="margin-top:4px;"><b>Notes:</b> ${p.notes}</div>` : ""}
    `;

    row.appendChild(img);
    row.appendChild(info);
    list.appendChild(row);
  }

  content.innerHTML = "";
  content.appendChild(header);
  content.appendChild(list);

  modal.style.display = "flex";
}

function renderList(listEl, groups, query) {
  const q = normalize(query);

  // fem un array de "entries" per pintar
  const entries = [];
  for (const [base, forms] of groups.entries()) {
    // el filtre busca pel nom de qualsevol forma (inclosa Hisui)
    const match = forms.some(p => normalize(p.nom).includes(q));
    if (!match) continue;

    // dades resum: mostra el "normal" si existeix, si no el primer
    const primary = forms.find(p => !normalize(p.forma || "")) ?? forms[0];

    const d = dexNum(primary.dex);
    entries.push({
      base,
      forms,
      primary,
      dex: d ?? 99999, // per ordenar
    });
  }

  entries.sort((a, b) => a.dex - b.dex);

  listEl.innerHTML = "";
  for (const e of entries) {
    const li = document.createElement("li");
    li.style.listStyle = "none";
    li.style.padding = "10px 8px";
    li.style.borderRadius = "10px";
    li.style.cursor = "pointer";
    li.onmouseenter = () => (li.style.background = "rgba(0,0,0,.04)");
    li.onmouseleave = () => (li.style.background = "transparent");

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "12px";

    const img = document.createElement("img");
    img.alt = e.primary.nom;
    img.width = 64;
    img.height = 64;

    const s = spriteUrl(e.primary);
    if (s) img.src = s;
    else img.style.display = "none";

    const text = document.createElement("div");

    const extraForms = e.forms.length > 1 ? ` · +${e.forms.length - 1} forma/es` : "";
    text.textContent = `${labelLine(e.primary)}${extraForms}`;

    row.appendChild(img);
    row.appendChild(text);
    li.appendChild(row);

    li.addEventListener("click", () => {
      openModalForGroup(e.base, e.forms);
    });

    listEl.appendChild(li);
  }

  return entries.length;
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

  const pokemons = Array.isArray(data) ? data : (data.pokemon ?? []);
  const groups = groupByBase(pokemons);

  const shown = renderList(listEl, groups, "");
  countEl.textContent = `${shown} / ${groups.size} Pokémon mostrats`;

  renderAnalysis(pokemons);

  qEl.addEventListener("input", () => {
    const shown2 = renderList(listEl, groups, qEl.value);
    countEl.textContent = `${shown2} / ${groups.size} Pokémon mostrats`;
  });
})();