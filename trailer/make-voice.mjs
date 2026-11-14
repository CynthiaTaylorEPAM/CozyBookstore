// Turns narration.json into audio files, plus the timing of every word.
// A beat is spoken by the narrator unless one of its parts names another voice.
// Needs an ElevenLabs API key in ELEVENLABS_API_KEY.
//   node make-voice.mjs              every beat
//   node make-voice.mjs trouble      only that beat
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { partsOf } from './parts.mjs';

const here = new URL('.', import.meta.url).pathname;
const { voices, beats } = JSON.parse(readFileSync(here + 'narration.json', 'utf8'));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('Set ELEVENLABS_API_KEY first.');
const only = process.argv.slice(2);
mkdirSync(here + 'audio', { recursive: true });

// Every spoken part in order, so each recording can be told what the same voice says before and after it.
const all = beats.flatMap((beat) => partsOf(beat));

for (const [i, part] of all.entries()) {
  if (only.length && !only.includes(part.beat)) continue;
  const voice = voices[part.voice];
  const sameVoice = (other) => (other && other.voice === part.voice ? other.text : undefined);
  const body = JSON.stringify({
    text: part.text,
    model_id: voice.model,
    previous_text: sameVoice(all[i - 1]),
    next_text: sameVoice(all[i + 1]),
    voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25, speed: voice.speed },
  });
  // curl is used so that the request follows the machine's proxy settings.
  const out = execFileSync('curl', ['-sS', '--fail-with-body', '-X', 'POST',
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/with-timestamps?output_format=mp3_44100_128`,
    '-H', `xi-api-key: ${key}`, '-H', 'Content-Type: application/json', '-d', body],
    { maxBuffer: 1 << 28 });
  const reply = JSON.parse(out.toString());
  writeFileSync(`${here}audio/${part.file}.mp3`, Buffer.from(reply.audio_base64, 'base64'));

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
  writeFileSync(`${here}audio/${part.file}.json`, JSON.stringify({ id: part.file, voice: part.voice, text: part.text, words }, null, 1));
  console.log(part.file.padEnd(12), voice.name.padEnd(8), words.at(-1).end.toFixed(1) + 's', words.length, 'words');
}
