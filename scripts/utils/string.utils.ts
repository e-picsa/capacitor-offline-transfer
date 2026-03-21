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

export function boxLine(content: string, width: number, leftPad = 2): string {
  const innerWidth = width - leftPad - 1;
  return `║${' '.repeat(leftPad)}${pad(content, innerWidth)}║`;
}
