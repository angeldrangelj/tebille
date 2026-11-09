// Cloudflare Pages Function: /api/sms
// Recibe el texto de un SMS o notificación del banco (desde una automatización del iPhone o de Android),
// saca el valor, si es gasto o ingreso, el comercio y la categoría, y lo guarda en Firestore como /api/gasto.
// Uso: GET /api/sms?u=<usuario>&k=<clave>&texto=<mensaje>   o   POST con los campos u, k y texto (formulario o JSON)
// Con &probar=1 solo muestra lo que entendió, sin guardar nada.

const PROJECT = "tebille-app-co-e6f6a";
const API_KEY = "AIzaSyDQTeDjABhINqRKIZa4Jra3JCT3YTpIMUk"; // clave pública de la app web (no es secreta)

const texto = (msg, status = 200) =>
  new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
const hoyColombia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const BANCOS = ["Bancolombia", "Davivienda", "Nequi", "Daviplata", "Nu", "BBVA", "Banco de Bogota", "Banco de Occidente", "Banco Popular",
  "Banco Caja Social", "Scotiabank Colpatria", "Colpatria", "Itau", "Banco Falabella", "Falabella", "AV Villas", "Lulo", "Pibank",
  "RappiPay", "Movii", "Dale", "Banco Agrario", "GNB Sudameris", "Finandina", "Bancoomeva", "Banco Pichincha", "Mibanco", "Uala"];

const REGLAS = [
  [/rappi|\bd1\b|exito|carulla|olimpica|\bara\b|jumbo|mcdonald|kfc|frisby|crepes|restaurante|panaderia|domicilio|ifood|oxxo|justo y bueno|isimo|surtimax|subway|burger|pizza|cafe|juan valdez|tostao/, "Comida"],
  [/uber|didi|cabify|indriver|terpel|primax|texaco|biomax|mobil|peaje|transmilenio|metro|sitp|parqueadero|gasolina|esso|flypass/, "Transporte"],
  [/netflix|spotify|disney|hbo|\bmax\b|prime video|youtube|steam|playstation|xbox|cine|cinemark|apple\.com|icloud|google play/, "Ocio"],
  [/claro|movistar|tigo|\bwom\b|\betb\b|\bepm\b|enel|codensa|vanti|gases|acueducto|emcali|air-e|essa|celsia|internet/, "Servicios"],
  [/drogueria|farmacia|cruz verde|farmatodo|\beps\b|sura|colsanitas|clinica|medic|odontolog/, "Salud"],
  [/arriendo|arrendamiento|administracion|inmobiliaria/, "Vivienda"],
  [/universidad|udes|colegio|matricula|curso|platzi|udemy|coursera|libreria/, "Educación"],
  [/amazon|mercadolibre|mercado libre|falabella|zara|h&m|alkosto|ktronix|homecenter|shein|temu|tienda/, "Compras"],
];

// "$45.900,00" · "$ 1.200.000" · "COP 50.000" · "por 45900"
function valor(s) {
  const m = s.match(/(?:\$|cop|valor de|por)\s*([\d.,]+\d)/i);
  if (!m) return NaN;
  let n = m[1];
  const c = n.lastIndexOf(","), p = n.lastIndexOf(".");
  if (c > -1 && p > -1) n = c > p ? n.replace(/\./g, "").replace(",", ".") : n.replace(/,/g, "");
  else if (c > -1) n = /,\d{3}$/.test(n) ? n.replace(/,/g, "") : n.replace(",", ".");
  else if (p > -1) n = /\.\d{3}$/.test(n) ? n.replace(/\./g, "") : n;
  return Math.round(parseFloat(n));
}

export function entender(msg) {
  const t = String(msg || "").replace(/\s+/g, " ").trim(), n = norm(t);
  if (!t) return { error: "El mensaje llegó vacío." };
  if (/codigo|clave dinamica|otp|token|contrasena/.test(n) && !/compra|pago|transferi|retir|recibi/.test(n))
    return { error: "Ese mensaje es un código de seguridad, no un movimiento." };
  if (/rechazad|declinad|no aprobad|fallid|no exitos/.test(n)) return { error: "La transacción fue rechazada: no se anota." };
  const monto = valor(t);
  if (!(monto > 0)) return { error: "No encontré un valor en el mensaje." };

  const ingreso = /recibiste|te (enviaron|transfirieron|consignaron|llego|llegaron)|abono|consignacion (a|en) tu|deposito|pago de nomina|nomina|te pagaron|reembolso|devolucion/.test(n)
    && !/compraste|compra |pagaste|retiraste|retiro|transferiste|enviaste/.test(n);
  const credito = !ingreso && /t\.? ?cred|tarjeta de credito|tc \*|credito \*|tarj\.? cred/.test(n);
  const banco = BANCOS.find(b => n.includes(norm(b))) || "";

  // comercio: lo que viene después de " en " / " a " hasta "con", "el", "a las", fecha o fin
  let desc = "";
  const m = t.match(/\b(?:en|a|de)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9*&.'\- ]{2,40}?)(?=\s+(?:con|el|en|desde|a las|por|tu|t\.?|hora|\d{1,2}[:/])|[.,]|$)/);
  if (m && !/^(tu|su|la|el|cuenta|tarjeta|bancolombia|nequi)\b/i.test(m[1].trim())) desc = m[1].trim();
  if (/retir/.test(n) && !ingreso) desc = "Retiro de cajero";
  if (!desc) desc = ingreso ? "Ingreso del banco" : /retir/.test(n) ? "Retiro de cajero" : /transfer|enviaste/.test(n) ? "Transferencia" : "Gasto del banco";

  let categoria = ingreso ? (/nomina|salario|sueldo/.test(n) ? "Salario" : /reembolso|devolucion/.test(n) ? "Reembolsos" : /interes|rendimiento/.test(n) ? "Rendimientos" : "Otros ingresos") : "Otros";
  if (!ingreso) for (const [re, c] of REGLAS) if (re.test(norm(desc)) || re.test(n.replace(norm(banco), ""))) { categoria = c; break; }

  return { tipo: ingreso ? "ingreso" : "gasto", monto, descripcion: desc.slice(0, 80), categoria, credito, banco };
}

async function datos(request) {
  const url = new URL(request.url), p = Object.fromEntries(url.searchParams);
  if (request.method !== "POST") return p;
  const ct = request.headers.get("content-type") || "";
  try {
    if (ct.includes("json")) return { ...p, ...(await request.json()) };
    if (ct.includes("form")) return { ...p, ...Object.fromEntries(await request.formData()) };
    return { ...p, texto: await request.text() };
  } catch { return p; }
}

async function manejar(request) {
  const p = await datos(request);
  const uid = String(p.u || "").trim(), clave = String(p.k || "").trim();
  const r = entender(p.texto);
  if (p.probar) return texto(r.error ? `No se anotaría: ${r.error}` : `Entendí: ${r.tipo} de ${new Intl.NumberFormat("es-CO").format(r.monto)} · ${r.descripcion} · ${r.categoria}${r.credito ? " · tarjeta de crédito" : ""}${r.banco ? " · " + r.banco : ""}`);
  if (!/^[A-Za-z0-9]{10,64}$/.test(uid) || clave.length < 20) return texto("Falta tu usuario o tu clave. Copia la dirección otra vez desde Tebille.", 400);
  if (r.error) return texto(`No se anotó: ${r.error}`, 422);

  const fields = {
    tipo: { stringValue: r.tipo }, monto: { doubleValue: r.monto }, categoria: { stringValue: r.categoria },
    descripcion: { stringValue: r.descripcion }, fecha: { stringValue: hoyColombia() },
    metodo: { stringValue: r.credito ? "Crédito" : "Débito" }, origen: { stringValue: "sms" }, clave: { stringValue: clave },
  };
  if (r.credito) fields.credito = { booleanValue: true };
  if (r.banco) fields.banco = { stringValue: r.banco.slice(0, 30) };

  let res;
  try {
    res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/movs?key=${API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  } catch { return texto("No se pudo conectar con la base de datos.", 502); }
  if (res.status === 403) return texto("La clave no es válida. En Tebille copia la dirección de nuevo.", 403);
  if (!res.ok) return texto(`No se pudo guardar (error ${res.status}).`, 502);
  const pesos = new Intl.NumberFormat("es-CO").format(r.monto);
  return texto(r.tipo === "ingreso" ? `Tebille: ingreso de ${pesos} anotado` : `Tebille: ${pesos} en ${r.descripcion} (${r.categoria}) anotado`);
}

export const onRequestGet = ({ request }) => manejar(request);
export const onRequestPost = ({ request }) => manejar(request);
