// Netlify Function: recibe {prompt} y devuelve {image} (data URL) generada con Gemini.
// Variables de entorno en Netlify: GEMINI_API_KEY (obligatoria), GEMINI_MODEL (opcional).
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "Usa POST" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return resp(500, { error: "Falta GEMINI_API_KEY en Netlify" });

  let prompt = "";
  try { prompt = String(JSON.parse(event.body || "{}").prompt || "").slice(0, 1200); } catch (e) {}
  if (!prompt) return resp(400, { error: "Falta el prompt" });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-image";
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const data = await r.json();
    if (!r.ok) return resp(r.status, { error: data.error?.message || "Error de Gemini" });
    const parts = data.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData || p.inline_data);
    const d = img && (img.inlineData || img.inline_data);
    if (!d) return resp(502, { error: "Gemini no devolvió imagen" });
    return resp(200, { image: `data:${d.mimeType || d.mime_type || "image/png"};base64,${d.data}` });
  } catch (e) {
    return resp(500, { error: "No se pudo contactar a Gemini" });
  }
};

function resp(status, body) {
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
