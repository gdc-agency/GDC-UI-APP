/** Join NativeWind class names, skipping falsy entries. */
export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
