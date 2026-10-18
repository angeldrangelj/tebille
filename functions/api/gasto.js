// Cloudflare Pages Function: /api/gasto
// Recibe un gasto o ingreso desde el atajo del iPhone con un simple enlace (GET) y lo guarda en Firestore.
// No usa credenciales: Firestore solo acepta el movimiento si trae la clave del atajo (ver firestore.rules).
// Uso: /api/gasto?u=<usuario>&k=<clave>&monto=50000&cat=Comida&desc=almuerzo[&tipo=ingreso][&fecha=2026-10-18]

const PROJECT = "tebille-app-co-e6f6a";
const API_KEY = "AIzaSyDQTeDjABhINqRKIZa4Jra3JCT3YTpIMUk"; // clave pública de la app web (no es secreta)

const texto = (msg, status = 200) =>
  new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

// fecha de hoy en Colombia, para que un gasto de las 11 p. m. no quede en el día siguiente
const hoyColombia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

export async function onRequestGet({ request }) {
  const p = new URL(request.url).searchParams;
  const uid = (p.get("u") || "").trim();
  const clave = (p.get("k") || "").trim();
  if (!/^[A-Za-z0-9]{10,64}$/.test(uid) || clave.length < 20) return texto("Falta tu usuario o tu clave. Copia el código del atajo otra vez desde Tebille.", 400);

  // el iPhone puede mandar "50.000" o "50,000": nos quedamos solo con los dígitos (montos enteros)
  const monto = Number(String(p.get("monto") || "").replace(/\D/g, ""));
  if (!(monto > 0)) return texto("Escribe un monto mayor que cero.", 400);

  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(p.get("fecha") || "") ? p.get("fecha") : hoyColombia();
  const fields = {
    tipo: { stringValue: (p.get("tipo") || "").trim().toLowerCase() === "ingreso" ? "ingreso" : "gasto" },
    monto: { doubleValue: monto },
    categoria: { stringValue: (p.get("cat") || "Otros").slice(0, 30) },
    descripcion: { stringValue: (p.get("desc") || "").slice(0, 80) },
    fecha: { stringValue: fecha },
    metodo: { stringValue: "Atajo" },
    origen: { stringValue: "atajo" },
    clave: { stringValue: clave },
  };

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}/movs?key=${API_KEY}`;
  let r;
  try {
    r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  } catch {
    return texto("No se pudo conectar con la base de datos. Inténtalo de nuevo.", 502);
  }
  if (r.status === 403) return texto("La clave del atajo no es válida. En Tebille crea o copia la clave de nuevo.", 403);
  if (!r.ok) return texto(`No se pudo guardar (error ${r.status}). Inténtalo de nuevo.`, 502);

  const pesos = new Intl.NumberFormat("es-CO").format(monto);
  const cat = fields.categoria.stringValue;
  return texto(fields.tipo.stringValue === "ingreso"
    ? `Listo: ingreso de ${pesos} (${cat}) guardado en Tebille`
    : `Listo: gasto de ${pesos} en ${cat} guardado en Tebille`);
}
