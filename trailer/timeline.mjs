// Works out when everything happens: lays the narration beats end to end, adds the
// silences set in narration.json, and writes timeline.js for the animation and the sound mix.
import { readFileSync, writeFileSync } from 'node:fs';

const here = new URL('.', import.meta.url).pathname;
const { beats } = JSON.parse(readFileSync(here + 'narration.json', 'utf8'));

let clock = 0;
const out = { beats: {}, order: [], audio: [], captions: [] };
for (const beat of beats) {
  const { words } = JSON.parse(readFileSync(`${here}audio/${beat.id}.json`, 'utf8'));
  const start = clock;
  clock += beat.lead;
  let shift = clock;       // time in the film = time in the recording + shift
  let cutFrom = 0;         // where the current slice of the recording begins
  const placed = [];
  words.forEach((word, i) => {
    placed.push({ w: word.w, t0: word.start + shift, t1: word.end + shift });
    const pause = beat.pauses.find(([after]) => after === word.w);
    if (pause && words[i + 1]) {
      const cut = (word.end + words[i + 1].start) / 2;
      out.audio.push({ file: `audio/${beat.id}.mp3`, from: cutFrom, to: cut, at: cutFrom + shift });
      cutFrom = cut;
      shift += pause[1];
    }
  });
  const speechEnd = words.at(-1).end + 0.4;
  out.audio.push({ file: `audio/${beat.id}.mp3`, from: cutFrom, to: speechEnd, at: cutFrom + shift });
  clock = words.at(-1).end + shift + beat.tail;
  out.beats[beat.id] = { start, end: clock, words: placed };
  out.order.push(beat.id);

  // Captions: split into short phrases at punctuation.
  let phrase = [];
  placed.forEach((word, i) => {
    phrase.push(word);
    const last = i === placed.length - 1;
    const stop = /[.?!:]$/.test(word.w);
    const comma = /,$/.test(word.w);
    if (last || stop || (comma && phrase.length >= 5 && placed.length - i > 3)) {
      out.captions.push({ t0: phrase[0].t0, t1: word.t1, text: phrase.map((p) => p.w).join(' ') });
      phrase = [];
    }
  });
}
out.duration = clock;
writeFileSync(here + 'timeline.js', 'window.TL = ' + JSON.stringify(out) + ';\n');
writeFileSync(here + 'timeline.json', JSON.stringify(out));
for (const id of out.order) console.log(id.padEnd(10), out.beats[id].start.toFixed(1), '->', out.beats[id].end.toFixed(1));
console.log('total', clock.toFixed(1) + 's');
