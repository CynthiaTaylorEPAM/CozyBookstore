// Works out when everything happens: lays the narration beats end to end, adds the
// silences set in narration.json, and writes timeline.js for the animation and the sound mix.
import { readFileSync, writeFileSync } from 'node:fs';
import { partsOf } from './parts.mjs';

const here = new URL('.', import.meta.url).pathname;
const { beats } = JSON.parse(readFileSync(here + 'narration.json', 'utf8'));
const CEILING = 285; // seconds: 4 minutes 45

let clock = 0;
const out = { beats: {}, order: [], audio: [], captions: [] };
for (const beat of beats) {
  const start = clock;
  clock += beat.lead;
  const placed = [];
  for (const part of partsOf(beat)) {
    const { words } = JSON.parse(readFileSync(`${here}audio/${part.file}.json`, 'utf8'));
    const file = `audio/${part.file}.mp3`;
    clock += part.gap;
    let shift = clock;       // time in the film = time in the recording + shift
    let cutFrom = 0;         // where the current slice of the recording begins
    const said = [];
    words.forEach((word, i) => {
      said.push({ w: word.w, t0: word.start + shift, t1: word.end + shift, who: part.voice });
      const pause = beat.pauses.find(([after]) => after === word.w);
      if (pause && words[i + 1]) {
        const cut = (word.end + words[i + 1].start) / 2;
        out.audio.push({ file, from: cutFrom, to: cut, at: cutFrom + shift });
        cutFrom = cut;
        shift += pause[1];
      }
    });
    out.audio.push({ file, from: cutFrom, to: words.at(-1).end + 0.4, at: cutFrom + shift });
    clock = words.at(-1).end + shift;
    placed.push(...said);

    // Captions: split into short phrases at punctuation.
    let phrase = [];
    said.forEach((word, i) => {
      phrase.push(word);
      const last = i === said.length - 1;
      const stop = /[.?!:;]$/.test(word.w);
      const comma = /,$/.test(word.w);
      if (last || stop || (comma && phrase.length >= 5 && said.length - i > 3)) {
        out.captions.push({ t0: phrase[0].t0, t1: word.t1, text: phrase.map((p) => p.w).join(' '), who: part.voice });
        phrase = [];
      }
    });
  }
  clock += beat.tail;
  out.beats[beat.id] = { start, end: clock, words: placed };
  out.order.push(beat.id);
}
out.duration = clock;
writeFileSync(here + 'timeline.js', 'window.TL = ' + JSON.stringify(out) + ';\n');
writeFileSync(here + 'timeline.json', JSON.stringify(out));
for (const id of out.order) console.log(id.padEnd(11), out.beats[id].start.toFixed(1).padStart(6), '->', out.beats[id].end.toFixed(1).padStart(6));
const mins = `${Math.floor(clock / 60)} min ${Math.round(clock % 60)} s`;
console.log('total', clock.toFixed(1) + 's', `(${mins})`);
if (clock > CEILING) console.warn(`WARNING: longer than the ${CEILING} second ceiling. Trim the script or the silences in narration.json.`);
