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

// Barra de progrés: intenta trobar elements típics sense dependre d’un sol id
function setProgress(capturedUnique, total) {
  const pct = total > 0 ? Math.round((capturedUnique / total) * 100) : 0;

  // possibles IDs (per si el teu HTML ha anat canviant)
  const txt =
    document.getElementById("progressText") ||
    document.getElementById("progress-text") ||
    document.getElementById("progress_label") ||
    document.getElementById("progressLabel");

  const bar =
    document.getElementById("progressBar") ||
    document.getElementById("progress-bar") ||
    document.getElementById("progress") ||
    document.querySelector("progress");

  const pctEl =
    document.getElementById("percent") ||
    document.getElementById("progressPercent") ||
    document.getElementById("progress-percent");

  if (txt) txt.textContent = `${capturedUnique}/${total}`;
  if (pctEl) pctEl.textContent = `${pct}%`;

  // Si és <progress>
  if (bar && bar.tagName?.toLowerCase() === "progress") {
    bar.max = total;
    bar.value = capturedUnique;
    return;
  }

  // Si és una barra "div" amb width
  if (bar && bar.style) {
    bar.style.width = `${pct}%`;
    bar.setAttribute("aria-valuenow", String(capturedUnique));
    bar.setAttribute("aria-valuemax", String(total));
  }
}

function render(listEl, countEl, data, query) {
  const q = normalize(query);
  const items = data.filter(p => normalize(p.nom).includes(q));

  // Comptador de llista filtrada / capturats
  countEl.textContent = `${items.length} / ${data.length} Pokémon mostrats`;

  // Total Nacional (fix)
  const TOTAL_DEX = 1025;

  // “capturats” únics per espècie (dex)
  const uniqueDex = new Set(
    data.map(p => dexNum(p.dex)).filter(Boolean)
  ).size;

  setProgress(uniqueDex, TOTAL_DEX);

  // Anàlisi ràpida per rol (si no hi ha rol, "sense rol")
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

  // Render llista (capturats)
  listEl.innerHTML = "";
  for (const p of items.sort((a,b) => (dexNum(a.dex) ?? 99999) - (dexNum(b.dex) ?? 99999))) {
    const li = document.createElement("li");

    const dex = dexNum(p.dex);
    const dexText = dex ? `#${dex} ` : "";

    const img = document.createElement("img");
    img.alt = p.nom;
    img.width = 64;
    img.height = 64;

    // sprite (si tens pokeapiId, usa’l; si no, dex; si no, amaga)
    const spriteId = p.pokeapiId ?? dex;
    if (spriteId) {
      img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
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

    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "12px";

    li.appendChild(img);
    li.appendChild(text);
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

  if (qEl) {
    qEl.addEventListener("input", () => {
      render(listEl, countEl, data, qEl.value);
    });
  }
})();