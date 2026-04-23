export function normalizeStoredText(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function normalizeStoredStringArray(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((item) => normalizeStoredText(item))
    .filter(Boolean);
}
