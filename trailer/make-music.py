"""Writes a quiet harp-and-pad underscore (audio/music.wav), shaped to the timeline.

This is a stand-in made with plain arithmetic, so the trailer has music without
needing any outside service. Replace audio/music.wav with a proper score at any time.
"""
import json, os, wave
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(here, 'timeline.json')))
SR = 44100
total = tl['duration'] + 2
out = np.zeros((int(total * SR), 2))
rng = np.random.default_rng(7)

NOTE = {'C': 0, 'C#': 1, 'D': 2, 'E': 4, 'F#': 6, 'G': 7, 'A': 9, 'B': 11}
def hz(name, octave): return 440 * 2 ** ((NOTE[name] + (octave - 4) * 12 - 9) / 12)

def pluck(t0, f, vol=1.0, decay=2.6, pan=0.5, bright=1.0):
    n = int(min(decay * 3, total - t0) * SR)
    if n <= 0: return
    t = np.arange(n) / SR
    tone = sum((bright ** k) / (k + 1) ** 1.6 * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (k + 1) ** 0.8 / decay * 2.2) for k in range(6))
    tone *= np.minimum(1, t / 0.006) * vol
    i = int(t0 * SR)
    out[i:i + n, 0] += tone * (1 - pan); out[i:i + n, 1] += tone * pan

def pad(t0, dur, freqs, vol):
    n = int(min(dur + 2, total - t0) * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 1.8) * np.minimum(1, np.maximum(0, (dur + 2 - t) / 2.0))
    tone = sum(np.sin(2 * np.pi * f * t + i) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for i, f in enumerate(freqs))
    tone *= env * vol * (0.85 + 0.15 * np.sin(2 * np.pi * 0.13 * t))
    i = int(t0 * SR)
    out[i:i + n, 0] += tone; out[i:i + n, 1] += tone

CH = {  # root, third, fifth
    'D': ('D', 'F#', 'A'), 'Bm': ('B', 'D', 'F#'), 'G': ('G', 'B', 'D'), 'A': ('A', 'C#', 'E'), 'Em': ('E', 'G', 'B'), 'F#m': ('F#', 'A', 'C#'),
}
b = tl['beats']
def said(beat, word, n=0):
    return [w for w in b[beat]['words'] if w['w'].strip('.,:;!?') == word][n]['t0']
wraith, pip = said('trouble', 'Then') - 0.6, said('trouble', 'Pip') - 0.9
sections = [  # start, end, chords, mood
    (0.5, b['shop']['end'], ['D', 'Bm', 'G', 'A'], 'gentle'),
    (b['pests']['start'], b['pests']['end'], ['G', 'D', 'Em', 'A'], 'playful'),
    (b['mirabel']['start'], b['mirabel']['end'], ['D', 'Bm', 'G', 'A'], 'gentle'),
    (b['trouble']['start'], wraith, ['Bm', 'G', 'Em', 'F#m'], 'playful'),
    (wraith, pip, ['Bm', 'F#m'], 'dark'),
    (pip, b['trouble']['end'], ['Bm', 'G', 'Em', 'F#m'], 'playful'),
    (b['guild']['start'], b['guild']['end'], ['Em', 'A'], 'sparse'),
    (b['factory']['start'], b['delivered']['end'], ['D', 'A', 'Bm', 'G', 'G', 'D', 'A', 'D'], 'hopeful'),
    (b['request']['start'], b['request']['end'], ['G', 'D', 'Bm', 'A'], 'gentle'),
    (b['chaptertwo']['start'], b['chaptertwo']['end'] - 8, ['D', 'A', 'Bm', 'G', 'G', 'D', 'A', 'D'], 'hopeful'),
]
BAR = 4.0
for start, end, chords, mood in sections:
    k = 0
    t = start
    while t < end - 1:
        root, third, fifth = CH[chords[k % len(chords)]]
        low = 2 if root in ('G', 'A', 'B') else 3
        pad(t, BAR, [hz(root, low), hz(fifth, low), hz(third, low + 1)], 0.035 if mood not in ('sparse', 'dark') else 0.055)
        if mood == 'gentle':
            seq = [(0, root, low, .9), (0.66, fifth, low, .6), (1.33, root, low + 1, .7), (2.0, third, low + 1, .7), (2.66, fifth, low + 1, .55)]
            if k % 2 == 1: seq.append((3.33, third, low + 2, .4))
        elif mood == 'playful':
            seq = [(i * 0.5, n, o, v) for i, (n, o, v) in enumerate([(root, low, .8), (fifth, low + 1, .5), (third, low + 1, .5), (fifth, low + 1, .5), (root, low, .7), (third, low + 2, .45), (fifth, low + 1, .5), (root, low + 2, .4)])]
        elif mood == 'dark':
            low = 2
            seq = [(0, root, low, .9), (1.5, third, low, .5), (3.0, fifth, low - 1, .7)]
        elif mood == 'sparse':
            seq = [(0, root, low, .9), (2.0, fifth, low, .6)]
        else:
            seq = [(0, root, low, 1), (0.5, fifth, low, .6), (1.0, root, low + 1, .7), (1.5, third, low + 1, .7), (2.0, fifth, low + 1, .7), (2.5, root, low + 2, .55), (3.0, third, low + 2, .5), (3.5, fifth, low + 1, .5)]
        for dt, n, o, v in seq:
            if t + dt < end:
                pluck(t + dt + rng.uniform(-0.012, 0.012), hz(n, o), v * 0.32, decay=0.5 if mood == 'playful' else 2.4, pan=rng.uniform(0.3, 0.7), bright=0.6 if mood == 'playful' else 0.35 if mood == 'dark' else 0.8)
        if mood in ('gentle', 'hopeful') and k % 2 == 0:  # a bell-like note high above
            n = [third, fifth, root][(k // 2) % 3]
            pluck(t + 2.0, hz(n, 6), 0.07, decay=3.5, pan=0.65, bright=0.3)
        t += BAR; k += 1
# the last chord, left to ring
t = b['chaptertwo']['end'] - 8
for i, (n, o) in enumerate([('D', 2), ('A', 2), ('D', 3), ('F#', 3), ('A', 3), ('D', 4), ('F#', 4), ('D', 5)]):
    pluck(t + i * 0.16, hz(n, o), 0.36, decay=5.0, pan=0.3 + 0.05 * i)
pad(t, 6, [hz('D', 3), hz('A', 3), hz('F#', 4)], 0.04)

# a little room: mix in a soft echo tail
n = int(2.6 * SR)
tail = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 2.6)[:, None]
size = 1 << int(np.ceil(np.log2(len(out) + n)))
wet = np.stack([np.fft.irfft(np.fft.rfft(out[:, c], size) * np.fft.rfft(tail[:, c], size))[:len(out)] for c in range(2)], axis=1)
out = out + 0.5 * wet / np.abs(wet).max() * np.abs(out).max()
out = out / np.abs(out).max() * 0.7
with wave.open(os.path.join(here, 'audio', 'music.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('music.wav', round(total, 1), 's')
