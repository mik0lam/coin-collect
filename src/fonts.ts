/** Retro terminal — readable on HUD, menus, and canvas at most sizes. */
export const FONT_UI = '"VT323", monospace';

/** Classic pixel display — titles and primary buttons only. */
export const FONT_DISPLAY = '"Press Start 2P", cursive';

export function fontUi(size: number, bold = false) {
  return `${bold ? "bold " : ""}${size}px ${FONT_UI}`;
}

export function fontDisplay(size: number) {
  return `${size}px ${FONT_DISPLAY}`;
}
