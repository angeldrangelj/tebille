// Cloudflare Pages Function: /api/usura
// Tasa de usura vigente para crédito de consumo y ordinario (incluye tarjetas de crédito).
// Fuente: Superintendencia Financiera, "Tasa de interés bancario corriente - TIBC" (datos.gov.co, pare-7x5i).
// La usura es 1,5 veces el interés bancario corriente certificado para el periodo.

const DATASET = "https://www.datos.gov.co/resource/pare-7x5i.json";
const CACHE_SEG = 12 * 60 * 60;

const json = (data, status = 200, maxAge = CACHE_SEG) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": status === 200 ? `public, max-age=${maxAge}` : "no-store" },
});

async function consultar() {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
  const q = new URLSearchParams({
    $where: `modalidad='CONSUMO Y ORDINARIO' AND vigencia_desde <= '${hoy}T23:59:59'`,
    $order: "vigencia_desde DESC",
    $limit: "1",
  });
  const r = await fetch(`${DATASET}?${q}`, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`datos.gov.co respondió ${r.status}`);
  const [fila] = await r.json();
  if (!fila) throw new Error("sin datos");
  const ibc = parseFloat(String(fila.interes_bancario_corriente).replace("%", "").replace(",", "."));
  if (!(ibc > 0)) throw new Error("dato inválido");
  return {
    fuente: "Superintendencia Financiera de Colombia (datos.gov.co)",
    resolucion: fila.resolucion,
    vigenciaDesde: fila.vigencia_desde.slice(0, 10),
    vigenciaHasta: fila.vigencia_hasta.slice(0, 10),
    interesBancarioCorriente: ibc,
    usura: Math.round(ibc * 1.5 * 100) / 100,
  };
}

export async function onRequestGet({ request, waitUntil }) {
  const cache = caches.default;
  const clave = new Request(new URL("/api/usura", request.url).toString());
  const guardada = await cache.match(clave);
  if (guardada) return guardada;
  try {
    const resp = json(await consultar());
    waitUntil(cache.put(clave, resp.clone()));
    return resp;
  } catch {
    return json({ error: "No se pudo consultar la tasa de usura en este momento." }, 503);
  }
}
