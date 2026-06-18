import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const INPUT_PATH = path.resolve("src/paletas.json");

const BRAND_TO_SLUG = {
  Bullpadel: "bullpadel",
  Nox: "nox",
  Adidas: "adidas",
  Head: "head",
  Babolat: "babolat",
  Siux: "siux",
  StarVie: "starvie",
  DropShot: "dropshot",
  Wilson: "wilson",
  Kombat: "kombat",
  Vairo: "vairo",
  Royal_Padel: "royal",
  Black_Crown: "blackcrown",
  Akkeron: "akkeron",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split("=")[1] : undefined;
  };

  const minPerBrand = Number(get("min-per-brand") ?? 6);
  const maxPerBrand = Number(get("max-per-brand") ?? 10);
  const includeEmerging = args.includes("--include-emerging");
  const apply = args.includes("--apply");

  if (!Number.isFinite(minPerBrand) || minPerBrand < 1) {
    throw new Error("--min-per-brand debe ser >= 1");
  }
  if (!Number.isFinite(maxPerBrand) || maxPerBrand < minPerBrand) {
    throw new Error("--max-per-brand debe ser >= min-per-brand");
  }

  return { minPerBrand, maxPerBrand, includeEmerging, apply };
}

function getGroupsNode(brandNode) {
  if (!brandNode || typeof brandNode !== "object") return {};
  if (brandNode.groups && typeof brandNode.groups === "object") return brandNode.groups;
  return brandNode;
}

function getModels(groupNode) {
  if (!Array.isArray(groupNode)) return [];
  return groupNode
    .map((item) => {
      if (typeof item === "string") return { model: item, match: null };
      if (item && typeof item === "object" && typeof item.model === "string") return item;
      return null;
    })
    .filter(Boolean);
}

async function main() {
  const { minPerBrand, maxPerBrand, includeEmerging, apply } = parseArgs();

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL no esta definida");

  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const paletas = JSON.parse(raw);

  const conn = await mysql.createConnection({ uri: dbUrl });

  try {
    const [brandRows] = await conn.query("SELECT id, slug FROM brands");
    const brandIdBySlug = new Map(brandRows.map((b) => [String(b.slug), Number(b.id)]));

    const actions = [];

    for (const [brandKey, brandNode] of Object.entries(paletas)) {
      const brandSlug = BRAND_TO_SLUG[brandKey] || String(brandKey).toLowerCase();
      const brandId = brandIdBySlug.get(brandSlug);
      if (!brandId) {
        actions.push({ brand: brandKey, brandSlug, skipped: true, reason: "brand_missing_in_db" });
        continue;
      }

      const groups = getGroupsNode(brandNode);
      const targetIds = new Set();
      const models = [];

      for (const groupNode of Object.values(groups)) {
        for (const modelEntry of getModels(groupNode)) {
          models.push(modelEntry.model);
          const matched = Boolean(modelEntry.match?.matched);
          const matchedId = modelEntry.match?.db_paddle_id;
          if (matched && Number.isFinite(Number(matchedId))) {
            targetIds.add(Number(matchedId));
          }
        }
      }

      const [rankedRows] = await conn.query(
        `SELECT id, name, year, popularity, is_active
         FROM paddles
         WHERE brand_id = ?
         ORDER BY popularity DESC, COALESCE(year, 0) DESC, id DESC`,
        [brandId],
      );

      const rankedIds = rankedRows.map((r) => Number(r.id));
      const keepIds = new Set(targetIds);

      if (keepIds.size < minPerBrand) {
        for (const id of rankedIds) {
          keepIds.add(id);
          if (keepIds.size >= minPerBrand) break;
        }
      }

      if (includeEmerging && keepIds.size < maxPerBrand) {
        const [emergingRows] = await conn.query(
          `SELECT id
           FROM paddles
           WHERE brand_id = ?
             AND (year >= YEAR(CURDATE()) OR popularity >= 4)
           ORDER BY COALESCE(year, 0) DESC, popularity DESC, id DESC`,
          [brandId],
        );
        for (const row of emergingRows) {
          keepIds.add(Number(row.id));
          if (keepIds.size >= maxPerBrand) break;
        }
      }

      const finalKeep = Array.from(keepIds).slice(0, maxPerBrand);
      const finalKeepSet = new Set(finalKeep);

      const deactivateIds = rankedIds.filter((id) => !finalKeepSet.has(id));

      actions.push({
        brand: brandKey,
        brandSlug,
        brandId,
        totalInDb: rankedIds.length,
        modelsInJson: models.length,
        matchedFromJson: targetIds.size,
        keep: finalKeep.length,
        deactivate: deactivateIds.length,
        keepIds: finalKeep,
      });

      if (apply) {
        if (deactivateIds.length > 0) {
          const placeholders = deactivateIds.map(() => "?").join(",");
          await conn.query(
            `UPDATE paddles SET is_active = 0 WHERE id IN (${placeholders})`,
            deactivateIds,
          );
        }

        if (finalKeep.length > 0) {
          const placeholders = finalKeep.map(() => "?").join(",");
          await conn.query(
            `UPDATE paddles SET is_active = 1 WHERE id IN (${placeholders})`,
            finalKeep,
          );
        }
      }
    }

    console.log(`mode=${apply ? "apply" : "dry-run"} minPerBrand=${minPerBrand} maxPerBrand=${maxPerBrand} includeEmerging=${includeEmerging}`);
    console.table(
      actions.map((a) => ({
        brand: a.brand,
        slug: a.brandSlug,
        totalInDb: a.totalInDb ?? 0,
        modelsInJson: a.modelsInJson ?? 0,
        matchedFromJson: a.matchedFromJson ?? 0,
        keep: a.keep ?? 0,
        deactivate: a.deactivate ?? 0,
        skipped: Boolean(a.skipped),
      })),
    );

    const outPath = path.resolve("src/paletas.curate-plan.json");
    await fs.writeFile(outPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), apply, minPerBrand, maxPerBrand, includeEmerging, actions }, null, 2)}\n`, "utf8");
    console.log(`Plan guardado en ${outPath}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
