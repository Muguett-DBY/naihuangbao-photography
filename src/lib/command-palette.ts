export const OPEN_COMMAND_PALETTE_EVENT = "nhb:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}
