// scripts/normalize-pokedex.mjs
// Normalitza data/pokedex.json perquè:
// - sempre sigui un ARRAY d'entrades
// - asseguri camps coherents (nom, dex, regió, joc, moviments...)
// - netegi "_No response_" i valors buits
// - identifiqui "forma" (ex: "Typhlosion (Hisui)") i "baseName" (ex: "Typhlosion")
// - opcionalment agrupi formes en un camp forms[] (sense perdre la llista plana)

import fs from "node:fs";

const INPUT = "data/pokedex.json";

function toStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function cleanNoResponse(v) {
  const s = toStr(v);
  if (!s) return "";
  const lowered = s.toLowerCase();
  if (lowered === "_no response_" || lowered === "no response" || lowered === "n/a") return "";
  return s;
}

function splitList(v) {
  // accepta array o string "a, b" o línies
  if (Array.isArray(v)) {
    return [...new Set(v.map(x => cleanNoResponse(x)).map(x => x.trim()).filter(Boolean))];
  }
  const s = cleanNoResponse(v);
  if (!s) return [];
  const parts = s
    .split(/\n|,/)
    .map(x => x.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

function parseName(nomRaw) {
  // "Typhlosion (Hisui)" -> baseName "Typhlosion", form "Hisui"
  const nom = toStr(nomRaw);
  const m = nom.match(/^(.*?)\s*\((.*?)\)\s*$/);
  if (!m) return { nom, baseName: nom, form: "" };
  return { nom, baseName: m[1].trim(), form: m[2].trim() };
}

function normalizeRegion(p) {
  // si hi ha p.regio/regió, la fem servir; si no, si hi ha forma entre parèntesis, la podem usar com a pista
  const r = cleanNoResponse(p.regio ?? p["regió"] ?? p.region);
  if (r) return r;

  const { form } = parseName(p.nom);
  // Heurística: si la forma és una regió coneguda, la posem com a regió
  const known = new Set([
    "Kanto","Johto","Hoenn","Sinnoh","Hisui","Teselia","Unova","Kalos","Alola","Galar","Paldea"
  ]);
  if (known.has(form)) return form;

  return "";
}

function normalizeDex(p) {
  // dex ha de ser número o "" si no hi és
  const d = p.dex ?? p.pokedex ?? p.id ?? "";
  if (typeof d === "number" && Number.isFinite(d)) return d;
  const s = toStr(d);
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}

function normalizeEntry(p) {
  const { nom, baseName, form } = parseName(p.nom);

  return {
    nom,
    baseName,           // per agrupar formes
    forma: form,        // "Hisui" si ve de (Hisui)
    dex: normalizeDex(p),
    regio: normalizeRegion(p),
    joc: cleanNoResponse(p.joc),
    naturalesa: cleanNoResponse(p.naturalesa),
    moviments: splitList(p.moviments),
    notes: cleanNoResponse(p.notes),
    // tipus/rol poden existir a entrades antigues; els mantenim si hi són (per no perdre info)
    tipus: Array.isArray(p.tipus) ? p.tipus : splitList(p.tipus),
    rol: cleanNoResponse(p.rol),
    // qualsevol altre camp queda fora (intencionadament)
  };
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.pokemon)) return data.pokemon;
  return [];
}

function groupForms(entries) {
  // Retorna una llista "agrupada" on cada baseName apareix 1 cop,
  // i si té múltiples formes, les posa a forms[].
  const byBase = new Map();

  for (const e of entries) {
    const key = (e.baseName || e.nom).toLowerCase();
    if (!byBase.has(key)) {
      byBase.set(key, { ...e, forms: [] });
    } else {
      const cur = byBase.get(key);
      cur.forms.push({ ...e });
    }
  }

  // només mantenim forms[] quan n'hi ha
  const out = [];
  for (const v of byBase.values()) {
    if (!v.forms.length) {
      delete v.forms;
      out.push(v);
    } else {
      // El "principal" és el que no té forma, si existeix; sinó el primer
      const all = [{ ...v, forms: undefined }, ...v.forms].filter(Boolean);
      const main = all.find(x => !x.forma) || all[0];
      const rest = all.filter(x => x !== main).map(x => {
        const copy = { ...x };
        delete copy.forms;
        return copy;
      });

      const mainClean = { ...main };
      delete mainClean.forms;
      if (rest.length) mainClean.forms = rest;

      out.push(mainClean);
    }
  }

  // ordena per dex si hi és, sinó per nom
  out.sort((a, b) => {
    const ad = a.dex === "" ? 1e12 : a.dex;
    const bd = b.dex === "" ? 1e12 : b.dex;
    if (ad !== bd) return ad - bd;
    return a.nom.localeCompare(b.nom, "ca");
  });

  return out;
}

function main() {
  const raw = fs.readFileSync(INPUT, "utf8");
  const data = JSON.parse(raw);

  const arr = toArray(data).map(normalizeEntry);

  // Neteja duplicats exactes (mateix nom + joc + forma)
  const seen = new Set();
  const dedup = [];
  for (const e of arr) {
    const key = `${e.nom}||${e.joc}||${e.forma}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(e);
  }

  // Escriu la versió plana
  fs.writeFileSync(INPUT, JSON.stringify(dedup, null, 2) + "\n", "utf8");

  // Escriu una versió agrupada (opcional) per usar-la més endavant a la web
  const grouped = groupForms(dedup);
  fs.writeFileSync("data/pokedex.grouped.json", JSON.stringify(grouped, null, 2) + "\n", "utf8");

  console.log(`OK: ${dedup.length} entrades -> data/pokedex.json`);
  console.log(`OK: ${grouped.length} grups  -> data/pokedex.grouped.json`);
}

main();