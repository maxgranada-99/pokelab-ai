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
  return Number.isFinite(n) ? n : null;
}

function spriteUrl(p) {
  // IMPORTANT:
  // - pokeapiId: id real de PokéAPI (formes incloses). Ex: Typhlosion (Hisui) = 10233
  // - dex: número nacional (no serveix per formes)
  const id = dexNum(p.pokeapiId) ?? dexNum(p.dex);
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function fmtTipus(tipus) {
  if (!Array.isArray(tipus) || !tipus.length) return "";
  return ` [${tipus.join(", ")}]`;
}

function fmt(s, prefix = " · ") {
  const t = (s ?? "").toString().trim();
  return t ? `${prefix}${t}` : "";
}

function groupKey(p) {
  // Base per agrupar formes:
  // - si tens baseDex, és el millor
  // - si no, prova a eliminar "(Hisui)" del nom
  const baseDex = dexNum(p.baseDex);
  if (baseDex) return `dex:${baseDex}`;

  const nom = (p.nom ?? "").toString();
  const baseNom = nom.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase();
  return `name:${baseNom}`;
}

function buildGroups(pokemons) {
  const groups = new Map();
  for (const p of pokemons) {
    const k = groupKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }

  // ordena dins de cada grup: primer “base” (sense parèntesi), després formes
  for (const [k, arr] of groups.entries()) {
    arr.sort((a, b) => {
      const ap = /\(.*\)/.test(a.nom ?? "");
      const bp = /\(.*\)/.test(b.nom ?? "");
      if (ap !== bp) return ap ? 1 : -1;
      return (a.nom ?? "").localeCompare(b.nom ?? "", "ca");
    });
    groups.set(k, arr);
  }

  // ordena grups per dex si el tens, si no per nom
  const groupArr = Array.from(groups.values());
  groupArr.sort((ga, gb) => {
    const da = dexNum(ga[0].dex) ?? 999999;
    const db = dexNum(gb[0].dex) ?? 999999;
    if (da !== db) return da - db;
    return (ga[0].nom ?? "").localeCompare(gb[0].nom ?? "", "ca");
  });

  return groupArr;
}

function renderAnalysis(pokemons) {
  const analysisEl = document.getElementById("analysis");
  if (!analysisEl) return;

  const countsByRole = {};
  for (const p of pokemons) {
    const r = (p.rol ?? "").toString().trim().toLowerCase() || "sense rol";
    countsByRole[r] = (countsByRole[r] ?? 0) + 1;
  }

  const roleLines = Object.entries(countsByRole)
    .sort((a, b) => b[1] - a[1])
    .map(([role, n]) => `- ${role}: ${n}`)
    .join("\n");

  const warnings = Object.entries(countsByRole)
    .filter(([, n]) => n >= 2 && n !== 0)
    .map(([role, n]) => `⚠️ Tens ${n} Pokémon amb el rol “${role}”.`)
    .join("<br>");

  analysisEl.innerHTML = `
<pre style="margin:0; white-space:pre-wrap;">${roleLines || "- (encara no hi ha dades)"}</pre>
${warnings ? `<div style="margin-top:8px;">${warnings}</div>` : `<div style="margin-top:8px;">✅ Rols bastant equilibrats (de moment).</div>`}
`;
}

function openModal(html) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modal-content");
  if (!modal || !content) return;

  content.innerHTML = html;
  modal.style.display = "block";

  const closeBtn = document.getElementById("modal-close");
  if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");

  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

function renderModalForGroup(group) {
  const base = group[0];
  const dex = dexNum(base.dex);
  const dexText = dex ? `#${dex} ` : "";
  const baseNom = (base.nom ?? "").toString().replace(/\s*\([^)]*\)\s*/g, "").trim();

  const rows = group
    .map((p) => {
      const sprite = spriteUrl(p);
      const img = sprite
        ? `<img src="${sprite}" alt="${p.nom ?? ""}" width="72" height="72" style="image-rendering:pixelated" />`
        : "";

      const nom = p.nom ?? "";
      const tipus = fmtTipus(p.tipus);
      const reg = (p.regio ?? "").toString().trim();
      const joc = (p.joc ?? "").toString().trim();
      const natura = (p.naturalesa ?? "").toString().trim();
      const rol = (p.rol ?? "").toString().trim();

      const movs = Array.isArray(p.moviments)
        ? p.moviments.filter(Boolean).filter((m) => m !== "_No response_")
        : [];
      const movTxt = movs.length ? `<div><b>Moviments:</b> ${movs.join(", ")}</div>` : "";

      const line1 = `<div><b>${nom}</b>${tipus}${reg ? ` · ${reg}` : ""}${joc ? ` — ${joc}` : ""}</div>`;
      const line2 = `<div>${rol ? `· ${rol}` : ""}${natura ? ` · ${natura}` : ""}</div>`;

      return `
<div style="display:flex; gap:12px; align-items:flex-start; padding:12px 0; border-top:1px solid #eee;">
  <div style="width:84px">${img}</div>
  <div style="flex:1">
    ${line1}
    ${line2}
    ${movTxt}
  </div>
</div>`;
    })
    .join("");

  openModal(`
<div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
  <div>
    <div style="font-size:20px; font-weight:700">${dexText}${baseNom}</div>
    <div style="margin-top:4px; opacity:.75">Formes capturades: ${group.length}</div>
  </div>
  <button id="modal-close" style="padding:6px 10px; cursor:pointer">Tancar</button>
</div>
<div style="margin-top:12px">
  ${rows}
</div>
`);
}

function render(listEl, countEl, data, query) {
  const q = normalize(query);
  const pokemons = Array.isArray(data) ? data : (data.pokemon ?? []);

  // filtre per cerca (sobre nom)
  const filtered = pokemons.filter((p) => normalize(p.nom).includes(q));

  // agrupació per formes (per mostrar 1 sola entrada i “+N forma/es”)
  const groups = buildGroups(filtered);

  countEl.textContent = `${groups.length} / ${buildGroups(pokemons).length} Pokémon mostrats`;

  renderAnalysis(pokemons);

  listEl.innerHTML = "";

  for (const group of groups) {
    const p = group[0];
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "12px";
    li.style.cursor = "pointer";

    const img = document.createElement("img");
    img.alt = p.nom ?? "";
    img.width = 64;
    img.height = 64;

    const sprite = spriteUrl(p);
    if (sprite) img.src = sprite;
    else img.style.display = "none";

    const text = document.createElement("div");

    const d = dexNum(p.dex);
    const dexText = d ? `#${d} ` : "";

    const tipus = fmtTipus(p.tipus);
    const joc = p.joc ? ` — ${p.joc}` : "";
    const reg = p.regio ? ` · ${p.regio}` : "";
    const rol = fmt(p.rol);
    const natura = fmt(p.naturalesa);
    const notes = fmt(p.notes);

    const extraForms = group.length > 1 ? ` · +${group.length - 1} forma/es` : "";

    const baseNom = (p.nom ?? "").toString().replace(/\s*\([^)]*\)\s*/g, "").trim();

    text.textContent = `${dexText}${baseNom}${tipus}${joc}${reg}${rol}${natura}${notes}${extraForms}`;

    li.appendChild(img);
    li.appendChild(text);

    li.onclick = () => renderModalForGroup(group);

    listEl.appendChild(li);
  }
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

  render(listEl, countEl, data, "");

  qEl.addEventListener("input", () => {
    render(listEl, countEl, data, qEl.value);
  });
})();