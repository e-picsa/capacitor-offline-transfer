export const CONSOLE_WIDTH = 62;

export const BOARDER_TOP = `╔${'═'.repeat(CONSOLE_WIDTH)}╗`;
export const BOARDER_MID = `╠${'═'.repeat(CONSOLE_WIDTH)}╣`;
export const BOARDER_BOTTOM = `╚${'═'.repeat(CONSOLE_WIDTH)}╝`;

export function boxLine(content: string): string {
  const innerWidth = CONSOLE_WIDTH - 2;
  return `║  ${pad(content, innerWidth)}║`;
}

export function pad(text: string, width: number, char = ' ', align: 'left' | 'right' | 'center' = 'left'): string {
  const len = text.length;
  if (len >= width) return text;
  const padding = width - len;
  switch (align) {
    case 'right':
      return char.repeat(padding) + text;
    case 'center':
      return char.repeat(Math.floor(padding / 2)) + text + char.repeat(padding - Math.floor(padding / 2));
    case 'left':
    default:
      return text + char.repeat(padding);
  }
}
