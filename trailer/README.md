# The trailer

A film of just under three minutes (2 minutes 57 seconds) that opens the leadership session. It tells Mirabel's story, shows how EPAM and its "scriptorium that never sleeps" delivered chapter one, and ends by handing chapter two to the room: first the bounty board together, then Mirabel's list.

**To watch it, open [`gilded-griffin-trailer.mp4`](gilded-griffin-trailer.mp4).** It is a normal video file (1920 × 1080, with sound and captions) and plays in any video player or slide deck.

The brief it was made to, and the story behind it, are in [`docs/story.md`](../docs/story.md).

## What is in the film

| Time | Beat | What is on screen |
|---|---|---|
| 0:00 | The shop | Night over Emberhollow, down to the shop front. An elf, a dwarf and a halfling with scones arrive |
| 0:29 | Mirabel | The kitchen table, tea, her aunt's portrait, and a ledger that cannot say what the shop took this month |
| 0:52 | The trouble | An empty shelf, a queue (shown, not narrated; one of them is on fire), a sleeping bookwyrm. Then the mimic bites Sir Aldric, and Pip runs to the tavern to haggle. Nobody writes it down |
| 1:26 | The old way | The Scribes' Guild quotation: twelve scribes, a year and a day |
| 1:40 | EPAM and the scriptorium | A small team, and five desks of enchanted quills: elaboration, planning, development, testing, deployment. A person sends a page back |
| 2:12 | Chapter one delivered | The real system: the landing page, the counter and the incident board |
| 2:30 | The handover | Mirabel's list, with the bounty board request at the top. "Today, you run the scriptorium" |

The words the narrator speaks are in [`narration.json`](narration.json), one entry per beat.

## How it was made

Nothing here is filmed or drawn by hand. The pictures are drawn by a small program in the shop's own colours and typefaces, reusing the shop front and crest from the portal and the screenshots in `docs/screenshots/`. The narrator is a synthetic voice from ElevenLabs. The music is a simple harp line produced by a short script.

| File | What it is |
|---|---|
| `gilded-griffin-trailer.mp4` | The finished film |
| `narration.json` | The script, the narrator's voice settings, and the silences before, within and after each beat |
| `audio/*.mp3`, `audio/*.json` | The recorded narration for each beat, and the moment each word is spoken |
| `audio/music.wav` | The music |
| `trailer.html`, `trailer.js` | The animation. Open `trailer.html` in a browser to play or scrub through it |
| `make-voice.mjs` | Records the narration from `narration.json` (needs an ElevenLabs key) |
| `timeline.mjs` | Works out when everything happens, from the recordings and the silences |
| `make-music.py` | Produces the music |
| `render.mjs` | Captures the animation frame by frame and joins it to the sound |

## Changing it

Everything on screen is timed to the narrator's words, so a change to the script flows through by itself.

- **Change the wording.** Edit the beat in `narration.json`, then record that beat again and rebuild:

  ```bash
  ELEVENLABS_API_KEY=your-key node make-voice.mjs trouble
  ```

  ```bash
  node timeline.mjs && python3 make-music.py && node render.mjs
  ```

  Pictures are tied to particular words (for example the mimic opens its mouth on "bit"). If one of those words is removed, the build stops and names it; change the matching `cue(...)` in `trailer.js`.
- **Change the pacing.** The `lead`, `tail` and `pauses` numbers in `narration.json` are seconds of silence. Rebuild with the second command above. Keep the total under 180 seconds; `timeline.mjs` prints it.
- **Use a different voice.** Change `voice.id` in `narration.json` and record all the beats again by running `make-voice.mjs` with no beat name.
- **Use different music.** Replace `audio/music.wav` with any recording at least three minutes long, then run `node render.mjs`. The music is turned down automatically while the narrator speaks.

Rebuilding needs Node.js 22, Python 3 with `numpy`, `ffmpeg`, and Playwright with its Chromium browser. Rendering takes several minutes.

## Things to know

- **The voice and music are machine-made.** The narrator is the ElevenLabs voice "George". The music is a plain stand-in; a composed or licensed piece would be an easy upgrade.
- **The screenshots are of the system as it was on 12 November 2026.** If the landing page, counter or incident board change noticeably before the session, refresh `docs/screenshots/` and render again.
- **The bounty board is not shown built**, only asked for. It stays reserved for the session.
