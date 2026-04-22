const MOJIBAKE_PATTERN = /(?:Ã.|Â|â.|ðŸ|�)/;

function maybeDecodeUtf8FromLatin1(value) {
  try {
    const decoded = Buffer.from(value, "latin1").toString("utf8");
    return decoded.includes("\u0000") ? value : decoded;
  } catch {
    return value;
  }
}

export function normalizeStoredText(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  let normalized = trimmed;

  if (MOJIBAKE_PATTERN.test(normalized)) {
    const decoded = maybeDecodeUtf8FromLatin1(normalized);
    if (decoded && decoded !== normalized) normalized = decoded;
  }

  return normalized
    .replace(/Ã¡/g, "á")
    .replace(/Ã¢/g, "â")
    .replace(/Ã£/g, "ã")
    .replace(/Ã§/g, "ç")
    .replace(/Ã©/g, "é")
    .replace(/Ãª/g, "ê")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ã´/g, "ô")
    .replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã€/g, "À")
    .replace(/Ã/g, "Ã")
    .replace(/Â/g, "");
}

export function normalizeStoredStringArray(values) {
  if (!Array.isArray(values)) return [];
  return values.map((item) => normalizeStoredText(String(item || ""))).filter(Boolean);
}
