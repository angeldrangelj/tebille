// Cloudflare Pages Function: /api/categorias
// Devuelve la lista de categorías para el atajo del iPhone como JSON.
// Atajos convierte la respuesta en una lista, y "Elegir de la lista" la muestra tal cual,
// así el atajo no necesita armar ni dividir texto (Jellycuts no lo compila bien).
// Uso: /api/categorias?tipo=Gasto  |  /api/categorias?tipo=Ingreso

const CATEGORIAS = {
  gasto: ["Comida", "Transporte", "Vivienda", "Servicios", "Salud", "Ocio", "Compras", "Educación", "Otros"],
  ingreso: ["Salario", "Negocio", "Trabajos extra", "Regalos", "Reembolsos", "Rendimientos", "Otros ingresos"],
};

export async function onRequestGet({ request }) {
  const tipo = (new URL(request.url).searchParams.get("tipo") || "").trim().toLowerCase() === "ingreso" ? "ingreso" : "gasto";
  return new Response(JSON.stringify(CATEGORIAS[tipo]), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
