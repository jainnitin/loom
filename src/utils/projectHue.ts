// Curated hue set — warm + cool tones that harmonize with Loom's peach/chocolate
// palette while still giving a scannable per-project signal. No pure green;
// hues are balanced in perceived weight so none dominate the UI.
const PROJECT_HUES = [20, 50, 175, 215, 265, 325] as const

export function hueForProject(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PROJECT_HUES[h % PROJECT_HUES.length]
}
