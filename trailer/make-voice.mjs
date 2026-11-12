// Turns narration.json into one audio file per beat, plus the timing of every word.
// Needs an ElevenLabs API key in ELEVENLABS_API_KEY.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const here = new URL('.', import.meta.url).pathname;
const { voice, beats } = JSON.parse(readFileSync(here + 'narration.json', 'utf8'));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Set ELEVENLABS_API_KEY first.');
const only = process.argv.slice(2);
mkdirSync(here + 'audio', { recursive: true });

for (const [i, beat] of beats.entries()) {
  if (only.length && !only.includes(beat.id)) continue;
  const body = JSON.stringify({
    text: beat.text,
    model_id: voice.model,
    previous_text: beats[i - 1]?.text,
    next_text: beats[i + 1]?.text,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, speed: voice.speed },
  });
  // curl is used so that the request follows the machine's proxy settings.
  const out = execFileSync('curl', ['-sS', '--fail-with-body', '-X', 'POST',
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`,
    '-H', `xi-api-key: ${key}`, '-H', 'Content-Type: application/json', '-d', body],
    { maxBuffer: 1 << 28 });
  const reply = JSON.parse(out.toString());
  writeFileSync(`${here}audio/${beat.id}.mp3`, Buffer.from(reply.audio_base64, 'base64'));

  // Group the per-letter timings into words.
  const a = reply.alignment;
  const words = [];
  let word = null;
  a.characters.forEach((ch, n) => {
    if (/\s/.test(ch)) { word = null; return; }
    if (!word) { word = { w: '', start: a.character_start_times_seconds[n], end: 0 }; words.push(word); }
    word.w += ch;
    word.end = a.character_end_times_seconds[n];
  });
  writeFileSync(`${here}audio/${beat.id}.json`, JSON.stringify({ id: beat.id, text: beat.text, words }, null, 1));
  console.log(beat.id, words.at(-1).end.toFixed(1) + 's', words.length, 'words');
}
