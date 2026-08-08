export function photoTransitionName(id: string) {
  return `nhb-photo-${id.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
}
