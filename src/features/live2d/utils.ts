export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  const characters = Array.from(text);
  return characters.length > maxLength ? `${characters.slice(0, maxLength).join('')}${suffix}` : text;
}
