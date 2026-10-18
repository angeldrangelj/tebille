// Cloudflare Pages Function: /api/tasas
// Tasa promedio que cobra cada banco en tarjetas de crédito de consumo, según datos abiertos de la
// Superintendencia Financiera (datos.gov.co, conjunto qzsc-9esp, actualizado cada semana).
// Se excluyen las compras sin intereses (1 cuota, promociones) porque bajan el promedio y no
// reflejan lo que cobra la tarjeta al diferir una compra. Ponderado por monto prestado, últimas 4 semanas.

const DATASET = "https://www.datos.gov.co/resource/qzsc-9esp.json";
const CACHE_SEG = 12 * 60 * 60; // se consulta la fuente a lo sumo cada 12 horas

// Nombres oficiales → nombres como los conoce la gente
const ALIAS = {
  "Banco Davivienda": "Davivienda", "BBVA Colombia": "BBVA", "Banagrario": "Banco Agrario",
  "Nu Colombia": "Nu", "Banco Davibank": "Davibank (antes Scotiabank Colpatria)",
};
const limpiarNombre = n => {
  const base = String(n).replace(/\s+(S\.A\.|C\.F\.|S\.A)$/i, "").trim();
  return ALIAS[base] || base;
};

const json = (data, maxAge) => new Response(JSON.stringify(data), {
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${maxAge}` },
});

async function consultar() {
  const desde = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
  const q = new URLSearchParams({
    $select: "nombre_entidad, sum(tasa_efectiva_promedio::number * montos_desembolsados::number) / sum(montos_desembolsados::number) as tasa, sum(montos_desembolsados::number) as monto, max(fecha_corte) as corte",
    $where: `tipo_de_cr_dito='Consumo' AND starts_with(producto_de_cr_dito,'Tarjeta de cr') AND fecha_corte >= '${desde}' AND montos_desembolsados::number > 0 AND tasa_efectiva_promedio::number >= 5`,
    $group: "nombre_entidad",
    $order: "monto DESC",
    $limit: "80",
  });
  const r = await fetch(`${DATASET}?${q}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`datos.gov.co respondió ${r.status}`);
  const filas = await r.json();
  if (!Array.isArray(filas) || !filas.length) throw new Error("sin datos");
  const bancos = filas
    .map(f => ({ nombre: limpiarNombre(f.nombre_entidad), tasa: Math.round(Number(f.tasa) * 100) / 100 }))
    .filter(b => b.tasa > 0 && b.tasa < 100)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const corte = filas.map(f => f.corte).sort().pop().slice(0, 10);
  return { fuente: "Superintendencia Financiera de Colombia (datos.gov.co)", corte, consultado: new Date().toISOString(), bancos };
}

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default;
  const clave = new Request(new URL("/api/tasas", request.url).toString());
  const guardada = await cache.match(clave);
  if (guardada) return guardada;
  try {
    const resp = json(await consultar(), CACHE_SEG);
    waitUntil(cache.put(clave, resp.clone()));
    return resp;
  } catch (e) {
    // la app usa sus valores guardados si esto falla
    return new Response(JSON.stringify({ error: "No se pudieron consultar las tasas en este momento." }), {
      status: 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
