// Captures the animation frame by frame and joins it with the soundtrack.
//   node render.mjs              the whole film  -> gilded-griffin-trailer.mp4
//   node render.mjs stills 5 40  single pictures at 5s and 40s -> out/still-*.png
//   node render.mjs sound        keep the pictures of the existing film, rebuild only the sound
import { readFileSync, mkdirSync, rmSync, renameSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Playwright may be installed for the whole machine rather than in this folder.
const { chromium } = createRequire(import.meta.url)('playwright');

const here = new URL('.', import.meta.url).pathname;
const TL = JSON.parse(readFileSync(here + 'timeline.json', 'utf8'));
const FPS = 30, WORKERS = 6;
const out = here + 'out/';
mkdirSync(out, { recursive: true });

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Page error:', e.message); process.exitCode = 1; });
  await page.goto(`file://${here}trailer.html?capture`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => i.decode())); });
  return page;
}

const browser = await chromium.launch();

if (process.argv[2] === 'stills') {
  const page = await openPage(browser);
  for (const t of process.argv.slice(3).map(Number)) {
    await page.evaluate((x) => window.draw(x), t);
    await page.screenshot({ path: `${out}still-${String(t).padStart(5, '0')}.png` });
  }
  await browser.close();
  process.exit();
}

// 1. the pictures
const soundOnly = process.argv[2] === 'sound';
const film = here + 'gilded-griffin-trailer.mp4';
const frames = out + 'frames/';
if (!soundOnly) {
const total = Math.ceil(TL.duration * FPS);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames);
let done = 0;
await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
  const page = await openPage(browser);
  for (let f = w; f < total; f += WORKERS) {
    await page.evaluate((x) => window.draw(x), f / FPS);
    await page.screenshot({ path: `${frames}${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (++done % 300 === 0) console.log(`${done} / ${total} frames`);
  }
}));
await browser.close();
}
else await browser.close();

// 2. the sound: narration slices placed on the timeline, over the music if there is any
const inputs = [], filters = [], labels = [];
TL.audio.forEach((a, i) => {
  inputs.push('-i', here + a.file);
  filters.push(`[${i}:a]atrim=${a.from.toFixed(3)}:${a.to.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,adelay=${Math.round(a.at * 1000)}:all=1[v${i}]`);
  labels.push(`[v${i}]`);
});
filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0,volume=1.8,apad=whole_dur=${TL.duration.toFixed(2)},asplit[voice][key]`);
const music = here + 'audio/music.wav';
if (existsSync(music)) {
  inputs.push('-i', music);
  const n = TL.audio.length, end = TL.duration;
  // the music dips whenever the narrator speaks
  filters.push(`[${n}:a]atrim=0:${end.toFixed(2)},afade=t=in:d=2,afade=t=out:st=${(end - 3).toFixed(2)}:d=3,volume=0.8[m]`);
  filters.push(`[m][key]sidechaincompress=threshold=0.02:ratio=5:attack=120:release=900[duck]`);
  filters.push(`[voice][duck]amix=inputs=2:normalize=0,volume=1.25,alimiter=limit=0.95[mix]`);
} else {
  filters.push(`[key]anullsink`, `[voice]alimiter=limit=0.95[mix]`);
}
execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[mix]', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', here + 'audio/soundtrack.m4a']);

// 3. together
const pictures = soundOnly ? ['-i', film] : ['-framerate', String(FPS), '-i', frames + '%05d.jpg'];
const encode = soundOnly ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p'];
execFileSync('ffmpeg', ['-y', '-v', 'error', ...pictures, '-i', here + 'audio/soundtrack.m4a', '-map', '0:v', '-map', '1:a', ...encode,
  '-c:a', 'copy', '-movflags', '+faststart', '-shortest', out + 'film.mp4'], { stdio: 'inherit' });
renameSync(out + 'film.mp4', film);
rmSync(frames, { recursive: true, force: true });
console.log('Wrote gilded-griffin-trailer.mp4');
