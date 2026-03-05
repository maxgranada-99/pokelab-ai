const fs = require("fs");

const regionByDex = [
  { max: 151, region: "Kanto" },
  { max: 251, region: "Johto" },
  { max: 386, region: "Hoenn" },
  { max: 493, region: "Sinnoh" },
  { max: 649, region: "Unova" },
  { max: 721, region: "Kalos" },
  { max: 809, region: "Alola" },
  { max: 905, region: "Galar" },
  { max: 1025, region: "Paldea" }
];

function regionFromDex(dex) {
  for (const r of regionByDex) {
    if (dex <= r.max) return r.region;
  }
  return "Unknown";
}

const path = "data/pokedex.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

for (const p of data) {
  if (!p.regio || p.regio === "Base") {
    p.regio = regionFromDex(p.dex);
  }
}

fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");

console.log("Regions actualitzades correctament.");