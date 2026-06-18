// Recuracion Bullpadel + Nox: insignias + gama por nivel (ver memoria paletaiq-curacion-catalogo).
// Uso: node --env-file=.env scripts/recurate-bullpadel-nox.mjs [--apply]
import mysql from "mysql2/promise";
const apply = process.argv.includes("--apply");
const c = await mysql.createConnection({ uri: process.env.DATABASE_URL });

// Bullpadel: fuera entrada/descontinuadas (K2, BP10, Icon), entran insignias.
const bpOff = [43, 53, 291];                 // K2 Power, BP10 Evo, Icon Cloud
const bpOn  = [12, 8, 11, 66, 21];           // Hack04 TF, Neuron02 TF, Vertex05 TF, Elite W MX, Pearl MX

// Nox: bajar monocultivo AT10 + entrada X-ONE; sumar ML10/Quantum/Equation.
const noxOff = [357, 360, 456];              // 2 AT10 12K redundantes + X-ONE entrada
const noxOn  = [159, 177, 164];              // ML10 Ventus Control, Quantum 12K Carbon, Equation HARD

const q = async (sql,p=[]) => (await c.query(sql,p))[0];
const names = async (ids) => ids.length? (await q(`SELECT id,name FROM paddles WHERE id IN (${ids.map(()=>'?').join(',')})`,ids)) : [];

console.log("Bullpadel OFF:", (await names(bpOff)).map(r=>`[${r.id}] ${r.name}`));
console.log("Bullpadel ON :", (await names(bpOn)).map(r=>`[${r.id}] ${r.name}`));
console.log("Nox OFF:", (await names(noxOff)).map(r=>`[${r.id}] ${r.name}`));
console.log("Nox ON :", (await names(noxOn)).map(r=>`[${r.id}] ${r.name}`));

if (apply) {
  const off=[...bpOff,...noxOff], on=[...bpOn,...noxOn];
  await q(`UPDATE paddles SET is_active=0 WHERE id IN (${off.map(()=>'?').join(',')})`, off);
  await q(`UPDATE paddles SET is_active=1 WHERE id IN (${on.map(()=>'?').join(',')})`, on);
  console.log(`\nAPLICADO: ${off.length} desactivadas, ${on.length} activadas.`);
} else {
  console.log("\n(dry-run, usar --apply para ejecutar)");
}
await c.end();
