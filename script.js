async function loadPokedex() {
  const res = await fetch("./data/pokedex.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No s'ha pogut carregar pokedex.json");
  return res.json();
}

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function render(listEl, countEl, data, query) {
  const q = normalize(query);
  const items = (data.pokemon ?? []).filter(p => normalize(p.nom).includes(q));

  countEl.textContent = `${items.length} / ${(data.pokemon ?? []).length} Pokémon mostrats`;
const analysisEl = document.getElementById("analysis");

const countsByRole = {};
for (const p of (data.pokemon ?? [])) {
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
  listEl.innerHTML = "";
  for (const p of items) {
    const li = document.createElement("li");
    const joc = p.joc ? ` — ${p.joc}` : "";
const tipus = p.tipus ? ` [${p.tipus.join(", ")}]` : "";
const rol = p.rol ? ` · ${p.rol}` : "";
const notes = p.notes ? ` · ${p.notes}` : "";

li.textContent = `${p.nom}${tipus}${joc}${rol}${notes}`;
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