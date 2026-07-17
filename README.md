# FATBACK

A drunk side-scrolling beat 'em up. The street doesn't end.

**The drunker you get, the harder you hit. And the less you land.**

---

## Play

Open `index.html`. That's it — no server, no build, no install. The spritesheet is
baked into the file as base64, so it runs off a double-click, a USB stick, or GitHub
Pages identically.

Hosted, it's also an installable PWA (**Add to Home Screen**). Fullscreen is the only
place the landscape lock behaves properly, so on a phone, install it.

## Controls

| | Keyboard | Xbox | Touch |
|---|---|---|---|
| Move | `WASD` / arrows | Stick / D-pad | Left stick |
| Punch | `J` | **X** (or RB / RT) | PUNCH |
| Jump | `K` | **A** | JUMP |
| Drink | `L` | **B** | DRINK |
| Talk / Eat | `E` | **Y** | TALK |
| Pause | `Esc` | Menu | `⏸` |

Plug in a pad and the touch controls hide themselves. Unplug and they come back.

**Mash punch** — it's a 4-hit string, not one button. **Jump then punch** is a dive attack.

## The design

Two meters that both cost you something. That's the whole game.

**DRUNK** buys crit chance. It charges you accuracy, control, and judgment.

| drunk | what it does |
|---|---|
| 0–38 | clean |
| 30–60 | **the sweet spot** — real crit, no penalty. Landing hits sobers you 0.5, so a good player *rides* this band. |
| 38+ | the lean. You physically cannot hold a straight line. |
| 55+ | punches start whiffing |
| 60+ | the tell on a woman starts lying to you |
| 78+ | stumbles |
| 22+ | the screen: saturation → ghosting → roll → slice warp → triple vision → tunnel |

**CONFIDENCE** buys damage and access to higher tiers. It charges you money and pride.

The trap: **liquid courage is the only way to reach the top tier, and it's the same
thing that ruins your ability to evaluate her.** Drunk inflates her *apparent* rating
(`shown = true + drunk/25`), so "10/10" is frequently a lie you told yourself. Talking
takes 170 ticks of standing still in a street fight — enemies do 1.5× to you and close
2.5× faster while you do it. Get knocked down in front of her and she's done with you
permanently.

**LIVER** at the burger shop is the signature upgrade. It doesn't add a number — it
widens the sweet spot from 38% of the meter to 59%.

## Build

```bash
python3 src/build.py        # pack art -> inline atlas -> index.html -> run tests
```

Needs Python 3 + Pillow, and Node for the test harness. The build **fails if the
harness fails**, which is deliberate.

```bash
node src/harness.js index.html    # tests only
```

The harness stubs the DOM, canvas, gamepad and audio, then actually *executes* the
game headless and drives it through 18 scenarios: 4000 ticks of walking, the full
combo, drinking dry, drunk at 100, fire rats, the big rat, the talk channel completing
and being interrupted, buying every upgrade, dying, and 600 frames of full render.

This exists because syntax-checking isn't testing. Every real bug in this project
shipped as a black screen first: a TDZ violation, a `const` shadowing a parameter.
The harness has since caught fire rats that could never breathe fire and burger shops
that rolled but never spawned.

## Layout

```
index.html               the game — built, single file, ~290KB
manifest.webmanifest     PWA manifest
sw.js                    service worker (offline + installability)
icon-*.png               app icons, cut from the spritesheet
src/
  game.html              source template (__ATLAS__ / __INDEX__ placeholders)
  build.py               pack + inject + test
  pack.py                spritesheet packer
  harness.js             headless test harness
  atlas.png              packed spritesheet (generated)
  atlas.json             frame index (generated)
art/
  This_character_is_5_11_._He/   player — walk, cross punch, drinking, jumping, scary walk
  This_character_is_a_6_3/       vampire enemy — walk, hurricane kick
  Smoking_a_cigarette./          bystander (crowd outside the clubs)
```

Everything under `art/` is the raw generator export, untouched. `pack.py` is the only
thing that reads it.

## Art pipeline — read this before generating more

Frames are 92×92 with **feet on row 70 and the crown on row 23**. `game.html` hardcodes
`FOOT=70, HEAD=47` and everything (ground contact, health bar placement, shadows) hangs
off those two numbers. The generator has been consistent about it across all three
characters. **If you regenerate art with different framing, re-measure and update those
constants** — this is what caused every sprite to float 16px above its own shadow for
several builds.

East-facing frames are mirrored in-engine for west. The atlas mirrors each cell *in
place*, so the flipped sheet uses identical coordinates.

### What's still missing

The player has exactly **one** attack animation (`Cross_Punch`, 6 frames, contact on
frame 5). The 4-hit combo currently fakes variety through timing, step distance, frame
subsets, and by borrowing the south-facing punch for the hook. It works, but four
punches are still four punches.

Generate at the same 92×92 and the same baseline:

| animation | frames | why |
|---|---|---|
| **Knockdown / fall** | 6 | highest priority — currently faked with a rotated jump frame |
| **Hit stagger** | 4 | there is no hit reaction at all right now |
| Jab | 4 | so hits 1–2 aren't the cross |
| Uppercut | 6 | a real combo finisher |
| Kick | 6 | |
| Bottle smash | 6 | the broken-bottle throwable that doesn't exist yet |

Also missing entirely: **a woman sprite.** The NPCs are magenta placeholder boxes. The
tell system needs two 4-frame loops — *on phone* (scammer) and *watching the fight*
(legit) — because the read is the mechanic, and right now it's rectangles.

The big rat is drawn procedurally from rectangles. It reads fine, but it's not art.

## Known issues

- Burger shops appear on 55% of chunks (~1378px mean gap), but the worst case is a
  4.6-block dry spell.
- The hook borrowing the south-facing punch sheet is a guess. One word in the `COMBO`
  table turns it off.
- Rats are procedural boxes.
- Deploying to a subpath (e.g. `user.github.io/fatback/`) works; the manifest and SW
  use relative paths.

## Credits

Character sprites generated, then packed and animated by hand. Everything else —
street, buildings, club lighting, traffic, rats, fire, UI — is drawn procedurally
in canvas.
