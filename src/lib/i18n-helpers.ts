export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T,
  lang: string,
  field: string,
): string {
  const langKey = `${field}_${lang}` as keyof T;
  if (lang !== "zh-CN" && obj[langKey]) return String(obj[langKey]);
  return String(obj[field as keyof T] ?? "");
}

export function getTitle<T extends Record<string, unknown>>(obj: T, lang: string): string {
  return getLocalizedField(obj, lang, "title");
}

export function getName<T extends Record<string, unknown>>(obj: T, lang: string): string {
  return getLocalizedField(obj, lang, "name");
}

export function getDesc<T extends Record<string, unknown>>(obj: T, lang: string): string {
  return getLocalizedField(obj, lang, "description");
}
