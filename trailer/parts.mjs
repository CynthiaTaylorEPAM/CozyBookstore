// A beat in narration.json is either one piece of narration ("text") or several
// "parts", each of which may be spoken by a different voice. This gives both the same shape.
export function partsOf(beat) {
  const parts = beat.parts ?? [{ text: beat.text }];
  return parts.map((part, n) => ({
    beat: beat.id,
    file: parts.length === 1 ? beat.id : `${beat.id}-${n + 1}`,
    voice: part.voice ?? 'narrator',
    gap: n === 0 ? 0 : part.gap ?? 0.6,   // seconds of silence before this part
    text: part.text,
  }));
}
