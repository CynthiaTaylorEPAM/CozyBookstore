# The trailer

A film of a little under five minutes (4 minutes 43 seconds) that plays at the leadership offsite as a teaser for the dedicated session. It tells Mirabel's story, sets the Scribes' Guild's traditional bid beside EPAM's "scriptorium that never sleeps", shows chapter one delivered, and ends by handing chapter two to the room: first the bounty board together, then Mirabel's list.

**To watch it, open [`gilded-griffin-trailer.mp4`](gilded-griffin-trailer.mp4).** It is a normal video file (1920 × 1080, with sound and captions) and plays in any video player or slide deck.

The brief it was made to, and the story behind it, are in [`docs/story.md`](../docs/story.md).

## What is in the film

| Time | Beat | What is on screen |
|---|---|---|
| 0:00 | The shop | Night over Emberhollow, down to the shop front. An elf, a dwarf and a halfling arrive. Then inside: an orc with fourteen copies of the same romance, a gnome up a ladder, a goblin on a cushion, a fae by the lantern, a dragonborn author signing |
| 0:45 | The pests | Mirabel's own book, *The Bookwyrm and Other Shelf Pests*, open like a field guide: bookwyrm, poltergeist, ink imp. Then the mimic bites Sir Aldric, he gives five stars, and the mimic becomes the cash box |
| 1:14 | Mirabel | The kitchen table, tea, her aunt's portrait. Then over her shoulder: a ledger that cannot say what the shop took this month |
| 1:38 | The trouble | Three things the ledger cannot tell her: her stock, her patrons, her monsters. Then the seal on the cellar door goes out, a dust wraith comes up the stairs, and Pip runs to the tavern to haggle. Nobody writes it down |
| 2:17 | The traditional answer | The Scribes' Guild quotation: twelve scribes, a year and a day, more gold than a decade's takings, and every change alters the price |
| 2:39 | EPAM and the scriptorium | The two answers side by side. Then five desks of enchanted quills: elaboration, planning, development, testing, deployment. A person sends a page back |
| 3:15 | Chapter one delivered | The real system: the landing page, the counter and the incident board |
| 3:34 | The request | Mirabel's list. In her own voice she reads the request at the top and says what she wants from it. The narrator poses three questions nobody has answered yet |
| 4:05 | Chapter two | "Soon, you run the scriptorium." The bounty board passes through the five stages with the room directing each one; then three more requests from the list to choose from |

The words that are spoken are in [`narration.json`](narration.json), one entry per beat.

## What the fiction stands for

The Scribes' Guild is a competitor bringing a traditional approach to a bid: a large team, a long plan, a high price, and a charge for every change. EPAM wins the work because it brings something different. The film plays the Guild straight and with respect (it is also the shop's book supplier), and no real competitor is named or hinted at.

## How it was made

Nothing here is filmed or drawn by hand. The pictures are drawn by a small program in the shop's own colours and typefaces, reusing the shop front and crest from the portal and the screenshots in `docs/screenshots/`. The voices are synthetic, from ElevenLabs. The music is a simple harp line produced by a short script.

| File | What it is |
|---|---|
| `gilded-griffin-trailer.mp4` | The finished film |
| `narration.json` | The script, the two voices, and the silences before, within and after each beat |
| `audio/*.mp3`, `audio/*.json` | The recorded speech for each beat, and the moment each word is spoken |
| `audio/music.wav` | The music |
| `trailer.html`, `trailer.js` | The animation. Open `trailer.html` in a browser to play or scrub through it |
| `make-voice.mjs` | Records the speech from `narration.json` (needs an ElevenLabs key) |
| `timeline.mjs` | Works out when everything happens, from the recordings and the silences |
| `make-music.py` | Produces the music, shaped to the timeline |
| `render.mjs` | Captures the animation frame by frame and joins it to the sound |

## Changing it

Everything on screen is timed to the spoken words, so a change to the script flows through by itself.

- **Change the wording.** Edit the beat in `narration.json`, then record that beat again and rebuild:

  ```bash
  ELEVENLABS_API_KEY=your-key node make-voice.mjs trouble
  ```

  ```bash
  node timeline.mjs && python3 make-music.py && node render.mjs
  ```

  Pictures are tied to particular words (for example the mimic opens its mouth on "bit"). If one of those words is removed, the build stops and names it; change the matching `cue(...)` in `trailer.js`.
- **Change the pacing.** The `lead`, `tail` and `pauses` numbers in `narration.json` are seconds of silence. Rebuild with the second command above. Keep the total under 4 minutes 45 seconds (285 seconds); `timeline.mjs` prints the total and warns if it is over.
- **Change who speaks.** A beat is spoken by the narrator. A beat can instead be split into `parts`, and a part can name another voice, as the `request` beat does for Mirabel. `gap` is the silence before a part.
- **Use a different voice.** Change the `id` under `voices` in `narration.json` and record again by running `make-voice.mjs` with no beat name.
- **Use different music.** Replace `audio/music.wav` with any recording at least five minutes long, then run `node render.mjs`. The music is turned down automatically while anyone speaks.

Rebuilding needs Node.js 22, Python 3 with `numpy`, `ffmpeg`, and Playwright with its Chromium browser. Rendering takes several minutes.

## Things to know

- **The voices and music are machine-made.** The narrator is the ElevenLabs voice "George" and Mirabel is "Lily". The music is a plain stand-in; a composed or licensed piece would be an easy upgrade.
- **The screenshots are of the system as it was on 12 November 2026.** If the landing page, counter or incident board change noticeably before the session, refresh `docs/screenshots/` and render again.
- **The bounty board is not shown built**, only asked for. The film names the questions the room will settle (who may post a bounty, who may claim one) without answering them. It stays reserved for the session.
- **The film says "soon", not "today"**, because the date of the session was not fixed when it was made.
