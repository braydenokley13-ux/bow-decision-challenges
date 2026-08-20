#!/usr/bin/env python3
"""
Direction A mock builder.

Emits ../scene.html (the 20:40 hero moment) and ../states.html (three world states) from one
board template, embedding the baked lane plates as data URIs so both files open standalone from
file:// with no build step. In the shipped product the plates are /assets/*.webp asset URLs and
the board is RunSaturday.tsx; this script exists so the two mock files cannot drift apart.
"""
import base64, pathlib

HERE = pathlib.Path(__file__).parent
def uri(name):
    return "data:image/webp;base64," + base64.b64encode((HERE / name).read_bytes()).decode()

PLATES = {"dusk": uri("lane-dusk.webp"), "mid": uri("lane-mid.webp"), "late": uri("lane-late.webp")}

CSS = """
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #0b0705; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  button { font: inherit; }

  .board { position: relative; width: 1366px; height: 768px; overflow: hidden; background: #0b0705; }

  /* ------------------------------------------------ shell strip */
  .shell { position: relative; z-index: 3; display: flex; align-items: center; gap: 28px;
    height: 44px; padding: 0 20px; background: #140d0a; border-bottom: 2px solid #f0a94a; }
  .shell .mark { display: flex; align-items: baseline; gap: 8px; color: #fbf3e4; font-weight: 800; letter-spacing: .04em; }
  .shell .mark .star { color: #f0a94a; }
  .shell .where { color: #bda795; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  .shell .hud { margin-left: auto; display: flex; gap: 26px; color: #d8c4a4; font-size: 12px; font-weight: 700;
    letter-spacing: .1em; font-variant-numeric: tabular-nums; }
  .shell .hud b { color: #fbf3e4; }

  /* ------------------------------------------------ the lane, seen through the window */
  .lane { position: relative; z-index: 1; height: 460px; background-size: 1366px 460px; background-repeat: no-repeat; }
  .lane::after { content: ""; position: absolute; inset: auto 0 0 0; height: 64px;
    background: linear-gradient(180deg, transparent, rgba(5,3,2,.55)); }
  .queue-fig { position: absolute; bottom: -6px; }
  .queue-fig.blur { filter: blur(1.1px); }

  /* ------------------------------------------------ the counter: the interface plane */
  .counter { position: relative; z-index: 2; height: 264px; }
  .bullnose { height: 12px;
    background: linear-gradient(180deg, #ffdca6 0, #c99354 22%, #6b4a28 55%, #241709 82%, #120b06 100%); }
  .bullnose::after { content: ""; display: block; height: 1px; background: rgba(0,0,0,.8); }
  .steel { position: relative; height: 252px; padding: 8px 44px 10px;
    display: flex; flex-direction: column; gap: 4px;
    background:
      radial-gradient(130% 100% at 50% -40%, rgba(255,190,110,.26), rgba(255,170,80,.05) 55%, transparent 78%),
      repeating-linear-gradient(180deg, rgba(255,236,200,.016) 0 2px, transparent 2px 5px),
      linear-gradient(180deg, #2e2016, #1d140c 55%, #130d08);
  }
  .steel::before, .steel::after { content: ""; position: absolute; top: 0; bottom: 0; width: 90px; pointer-events: none; }
  .steel::before { left: 0; background: linear-gradient(90deg, rgba(0,0,0,.5), transparent); }
  .steel::after  { right: 0; background: linear-gradient(270deg, rgba(0,0,0,.5), transparent); }

  .counter-head { display: flex; align-items: baseline; justify-content: space-between; }
  .counter-head h2 { color: #f6ead8; font-size: 15.5px; font-weight: 800; letter-spacing: .07em;
    text-transform: uppercase; text-shadow: 0 1px 3px rgba(0,0,0,.7); }
  .counter-head h2:focus-visible { outline: 2px solid #ffcf8a; outline-offset: 4px; }
  .clock { color: #ffcf8a; font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;
    text-shadow: 0 0 14px rgba(255,178,71,.5); }

  .zones { flex: 1; min-height: 0; display: grid; grid-template-columns: 288px minmax(0,1fr) 292px; gap: 42px; align-items: start; }
  .zone-label { color: #d8c4a4; font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }

  /* the lane, counted in people */
  .waiting-line { margin: 3px 0 7px; color: #bda795; font-size: 13.5px; }
  .waiting-line b { color: #fbf3e4; font-size: 19px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .rail { position: relative; height: 66px; }
  .rail .bar { position: absolute; top: 0; left: 0; right: 26px; height: 5px; border-radius: 3px;
    background: linear-gradient(180deg, #8a6a49, #3a2a1e 70%, #191008); }
  .chit { position: absolute; top: 6px; width: 58px; height: 50px; padding: 6px 7px 0;
    background: linear-gradient(175deg, #efe3c8, #e2d4b4 70%, #d5c5a2);
    border-radius: 2px; box-shadow: 0 3px 6px rgba(0,0,0,.55);
    color: #2b1c10; font-variant-numeric: tabular-nums; }
  .chit::before { content: ""; position: absolute; top: -4px; left: 50%; width: 10px; height: 12px; margin-left: -5px;
    background: linear-gradient(180deg, #191008, #4d372b); border-radius: 2px; }
  .chit .num { display: block; font-size: 13px; font-weight: 800; }
  .chit .qty { display: block; margin-top: 3px; font-size: 11px; color: #6b4a28; }
  .chit:nth-child(3) { left: 68px; transform: rotate(-1.6deg); filter: brightness(.94); }
  .chit:nth-child(4) { left: 136px; transform: rotate(1.2deg); filter: brightness(.88); }
  .chit:nth-child(5) { left: 204px; transform: rotate(-.8deg); filter: brightness(.82); }
  .chit.next { left: 0; transform: rotate(.9deg) scale(1.05); transform-origin: bottom left; }
  .rail .empty { position: absolute; top: 16px; color: #8f7a62; font-size: 13px; font-style: italic; }

  /* the counter itself */
  .plates-line { display: flex; align-items: baseline; gap: 9px; margin: 2px 0 7px; }
  .plates-line b { color: #fbf3e4; font-size: 34px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums;
    text-shadow: 0 2px 8px rgba(0,0,0,.6); }
  .plates-line b[data-bare="true"] { color: #ff8574; }
  .plates-line span { color: #bda795; font-size: 14px; }
  .trays { display: flex; gap: 22px; }
  .tray { display: grid; grid-template-columns: repeat(5, 24px); grid-auto-rows: 24px; gap: 5px 6px; }
  .plate, .gone { width: 24px; height: 24px; border-radius: 50%; }
  .plate { background: radial-gradient(circle at 50% 28%, #fff3dd, #ecd2a2 42%, #c39359 74%, #8a6238 100%);
    box-shadow: 0 3px 5px rgba(0,0,0,.55), inset 0 -3px 4px rgba(90,50,20,.45); }
  .plate::after { content: ""; display: block; width: 13px; height: 13px; margin: 5px auto 0; border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #f7e3bd, #d9b276 70%, #b98d55); }
  .gone { border: 1.5px solid rgba(255,215,160,.16);
    background: radial-gradient(circle at 50% 42%, rgba(0,0,0,.32), rgba(0,0,0,.06) 75%, transparent); }
  .tray-sheen { margin-top: 8px; height: 16px; border-radius: 50%;
    background: radial-gradient(50% 100% at 50% 0%, rgba(255,190,110,.12), transparent 75%); }

  /* the till */
  .till dl { display: grid; gap: 6px; margin-top: 5px; }
  .till div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
  .till dt { color: #bda795; font-size: 13px; }
  .till dd { color: #fbf3e4; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .till dd.money { color: #4ecf95; font-size: 17px; }
  .till dd[data-loss="true"] { color: #ff8574; }

  /* something true, said once */
  .alert { margin: 0 0 2px; padding: 5px 13px; align-self: start;
    color: #ffb5a9; font-size: 13.5px; background: rgba(60,23,18,.85); border-left: 3px solid #ff8574; border-radius: 3px; }
  .alert b { color: #ffd2c9; }

  /* controls: real, semantic, seated on the counter */
  .controls { display: flex; align-items: center; gap: 14px; }
  .serve { min-height: 42px; padding: 0 26px; border: 0; border-radius: 10px; cursor: pointer;
    color: #241309; background: linear-gradient(180deg, #ffc267, #f0a94a 60%, #d98d2e);
    font-size: 15px; font-weight: 800; letter-spacing: .01em;
    box-shadow: 0 1px 0 rgba(255,236,200,.5) inset, 0 6px 18px -6px rgba(240,169,74,.55), 0 2px 4px rgba(0,0,0,.5); }
  .serve:focus-visible, .auto:focus-visible { outline: 2px solid #ffcf8a; outline-offset: 3px; }
  .auto { min-height: 42px; padding: 0 20px; border: 1px solid #6d4e3c; border-radius: 10px; cursor: pointer;
    color: #e4d5c4; background: rgba(20,12,8,.5); font-size: 14px; font-weight: 600; }
  .progress { margin-left: auto; color: #bda795; font-size: 13.5px; font-variant-numeric: tabular-nums; }

  /* steam off our own griddle, static — motion would add nothing a Chromebook should pay for */
  .steam-wisp { position: absolute; z-index: 2; pointer-events: none; filter: blur(7px); opacity: .5;
    background: radial-gradient(50% 60% at 50% 60%, rgba(255,222,170,.4), transparent 75%); }

  /* nothing on this screen moves; the shipped version's only motion (steam drift, the serve
     tick) is compositor-only and this rule removes it entirely for reduced-motion readers */
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }

  /* page vignette; kept off the text zones by its inner radius */
  .vig { position: absolute; inset: 0; z-index: 4; pointer-events: none;
    background: radial-gradient(150% 120% at 50% 40%, transparent 60%, rgba(0,0,0,.32) 100%); }
"""

# --------------------------------------------------------------------------- queue figures
FIG_DEFS = """
  <defs>
    <radialGradient id="chestglow" cx=".5" cy="1.05" r=".95">
      <stop offset="0" stop-color="#c2712e" stop-opacity=".42"/>
      <stop offset=".5" stop-color="#8a4d1e" stop-opacity=".16"/>
      <stop offset="1" stop-color="#8a4d1e" stop-opacity="0"/>
    </radialGradient>
    <filter id="qb1" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.1"/></filter>

    <!-- adult, short-cropped hair, jacket: the head has an ear and the neck is a real neck -->
    <g id="q-adult">
      <!-- torso: shoulders slope from the neck, arms read as seams, waist tapers -->
      <path d="M-44,-2 C-47,-78 -45,-146 -38,-180 C-33,-192 -22,-198 -10,-201 L10,-201 C22,-198 33,-192 38,-180 C45,-146 47,-78 44,-2 Z" fill="#150d08"/>
      <path d="M-44,-2 C-47,-78 -45,-146 -38,-180 C-33,-192 -22,-198 -10,-201 L10,-201 C22,-198 33,-192 38,-180 C45,-146 47,-78 44,-2 Z" fill="url(#chestglow)"/>
      <path d="M-27,-8 C-30,-70 -29,-134 -24,-172" stroke="#0d0803" stroke-width="3.6" opacity=".65" fill="none"/>
      <path d="M27,-8 C30,-70 29,-134 24,-172" stroke="#0d0803" stroke-width="3.6" opacity=".65" fill="none"/>
      <path d="M-42,-86 C-20,-90 20,-90 42,-86" stroke="#0b0704" stroke-width="3" opacity=".55" fill="none"/>
      <path d="M0,-86 C1,-60 1,-30 0,-8" stroke="#0b0704" stroke-width="2.6" opacity=".5" fill="none"/>
      <!-- collar V, faintly catching the hatch light -->
      <path d="M-11,-199 C-5,-184 5,-184 11,-199 L5,-166 -5,-166 Z" fill="#a05a24" opacity=".3"/>
      <!-- neck, then head with a jaw and an ear -->
      <rect x="-8" y="-216" width="16" height="18" fill="#150d08"/>
      <path d="M-16,-238 C-16,-252 -9,-260 0,-260 C9,-260 17,-252 17,-239 C17,-228 12,-219 5,-216 L-6,-216 C-12,-219 -16,-228 -16,-238 Z" fill="#150d08"/>
      <ellipse cx="-15" cy="-233" rx="3.4" ry="5" fill="#150d08"/>
      <!-- the light from the pass: under the jaw, on the collar line -->
      <path d="M-10,-219 C-4,-213 6,-213 12,-220" stroke="#e8a763" stroke-width="2.4" opacity=".75" fill="none" filter="url(#qb1)"/>
      <path d="M-14,-228 C-13,-223 -11,-219 -8,-217" stroke="#c98a52" stroke-width="1.4" opacity=".45" fill="none" filter="url(#qb1)"/>
    </g>

    <!-- adult, jaw-length bob, bag strap; a head the hair defines -->
    <g id="q-bob">
      <path d="M-38,-2 C-41,-72 -39,-132 -32,-164 C-28,-175 -19,-181 -9,-184 L9,-184 C19,-181 28,-175 32,-164 C39,-132 41,-72 38,-2 Z" fill="#130c07"/>
      <path d="M-38,-2 C-41,-72 -39,-132 -32,-164 C-28,-175 -19,-181 -9,-184 L9,-184 C19,-181 28,-175 32,-164 C39,-132 41,-72 38,-2 Z" fill="url(#chestglow)"/>
      <path d="M-32,-162 L26,-118 L26,-105 L-35,-149 Z" fill="#0b0704"/>
      <path d="M-32,-160 L25,-117" stroke="#c98f4a" stroke-width="1.1" opacity=".28"/>
      <path d="M-36,-72 C-18,-76 18,-76 36,-72" stroke="#0a0603" stroke-width="2.8" opacity=".5" fill="none"/>
      <path d="M0,-72 C1,-50 1,-26 0,-8" stroke="#0a0603" stroke-width="2.2" opacity=".45" fill="none"/>
      <rect x="-7" y="-198" width="14" height="16" fill="#130c07"/>
      <!-- bob: wider at the jaw, tucked at the neck -->
      <path d="M-15,-222 C-15,-236 -8,-243 0,-243 C9,-243 16,-236 16,-222 C16,-214 18,-207 20,-202 C13,-206 10,-204 8,-200 L-8,-200 C-11,-204 -14,-206 -20,-201 C-18,-207 -15,-213 -15,-222 Z" fill="#130c07"/>
      <path d="M-8,-203 C-3,-198 5,-198 10,-204" stroke="#e8a763" stroke-width="2.2" opacity=".7" fill="none" filter="url(#qb1)"/>
    </g>

    <!-- kid: big round head, small shoulders, chin just over the counter -->
    <g id="q-kid">
      <path d="M-22,-2 C-24,-34 -22,-60 -18,-76 C-15,-84 -9,-88 -4,-90 L4,-90 C9,-88 15,-84 18,-76 C22,-60 24,-34 22,-2 Z" fill="#140d08"/>
      <path d="M-22,-2 C-24,-34 -22,-60 -18,-76 C-15,-84 -9,-88 -4,-90 L4,-90 C9,-88 15,-84 18,-76 C22,-60 24,-34 22,-2 Z" fill="url(#chestglow)"/>
      <rect x="-6" y="-100" width="12" height="12" fill="#140d08"/>
      <path d="M-14,-116 C-14,-128 -7,-134 0,-134 C8,-134 14,-127 14,-116 C14,-108 10,-101 4,-99 L-4,-99 C-10,-101 -14,-108 -14,-116 Z" fill="#140d08"/>
      <ellipse cx="-13" cy="-113" rx="2.8" ry="4" fill="#140d08"/>
      <ellipse cx="13" cy="-113" rx="2.8" ry="4" fill="#140d08"/>
      <path d="M-8,-102 C-3,-97 4,-97 9,-103" stroke="#e8a763" stroke-width="2" opacity=".75" fill="none" filter="url(#qb1)"/>
    </g>

    <!-- further back, out of the light: one hood up, one bare-headed -->
    <g id="q-hoodback">
      <path d="M-32,-2 C-35,-66 -33,-122 -27,-152 C-23,-162 -13,-167 -6,-169 L6,-169 C13,-167 23,-162 27,-152 C33,-122 35,-66 32,-2 Z" fill="#100b06"/>
      <path d="M-15,-168 C-17,-186 -8,-196 2,-196 C11,-196 19,-187 17,-170 C14,-162 -11,-161 -15,-168 Z" fill="#100b06"/>
      <path d="M-30,-64 C-14,-68 14,-68 30,-64" stroke="#090502" stroke-width="2.6" opacity=".5" fill="none"/>
    </g>
    <g id="q-back">
      <path d="M-28,-2 C-31,-62 -29,-114 -24,-142 C-20,-152 -12,-156 -6,-158 L6,-158 C12,-156 20,-152 24,-142 C29,-114 31,-62 28,-2 Z" fill="#120d08"/>
      <rect x="-6" y="-170" width="12" height="14" fill="#120d08"/>
      <path d="M-12,-186 C-12,-196 -6,-202 1,-202 C8,-202 13,-196 13,-186 C13,-178 9,-172 4,-170 L-4,-170 C-9,-172 -12,-178 -12,-186 Z" fill="#120d08"/>
    </g>
  </defs>
"""

def figures(state):
    """The queue as bodies at the window, clustered the way people actually stand. Density is
    bucketed (none/few/some), never countable — the number itself is printed in the queue zone
    exactly as the shipped component prints it."""
    if state == "dusk":   # first customers walking up
        return """
  <svg class="queue-fig" style="left:508px" width="360" height="280" viewBox="0 0 360 280" aria-hidden="true">
    <use href="#q-adult" x="150" y="282"/>
    <use href="#q-back" x="258" y="276" opacity=".85"/>
  </svg>"""
    if state == "mid":    # peak: the window is full
        return """
  <svg class="queue-fig" style="left:376px" width="660" height="300" viewBox="0 0 660 300" aria-hidden="true">
    <use href="#q-hoodback" x="96" y="288" opacity=".9"/>
    <use href="#q-bob" x="384" y="296"/>
    <use href="#q-adult" x="238" y="302"/>
    <use href="#q-kid" x="308" y="298"/>
    <use href="#q-back" x="512" y="284" opacity=".9"/>
    <use href="#q-hoodback" x="592" y="278" opacity=".7"/>
  </svg>"""
    if state == "late":   # 20:40 — order #21 wants three plates: three people at the pass
        return """
  <svg class="queue-fig" style="left:430px" width="600" height="300" viewBox="0 0 600 300" aria-hidden="true">
    <use href="#q-hoodback" x="98" y="282" opacity=".8"/>
    <use href="#q-bob" x="374" y="296"/>
    <use href="#q-adult" x="252" y="302"/>
    <use href="#q-kid" x="318" y="298"/>
    <use href="#q-back" x="500" y="280" opacity=".75"/>
  </svg>"""
    # bare: the lane is thinning; two still at the window
    return """
  <svg class="queue-fig" style="left:486px" width="440" height="300" viewBox="0 0 440 300" aria-hidden="true">
    <use href="#q-adult" x="160" y="300"/>
    <use href="#q-bob" x="262" y="294"/>
    <use href="#q-hoodback" x="360" y="276" opacity=".7"/>
  </svg>"""

def chits(items):
    if not items:
        return '<div class="bar"></div><p class="empty">Nobody is waiting.</p>'
    out = ['<div class="bar"></div>']
    for i, (num, qty) in enumerate(items):
        cls = "chit next" if i == 0 else "chit"
        plates = "plate" if qty == 1 else "plates"
        out.append(f'<div class="{cls}"><span class="num">#{num}</span><span class="qty">{qty} {plates}</span></div>')
    return "\n            ".join(out)

def tray_blocks(cooked, left):
    """Plates grouped by the unit the student paid for: one block per tray of ten."""
    gone_upto = cooked - left
    trays = []
    for t in range(cooked // 10):
        cells = []
        for i in range(t * 10, t * 10 + 10):
            cells.append('<i class="gone"></i>' if i < gone_upto else '<i class="plate"></i>')
        trays.append('<div class="tray">' + "".join(cells) + "</div>")
    return "\n            ".join(trays)

def board(s):
    plate_uri = PLATES[s["plate"]]
    bare = s["left"] == 0
    alert = ""
    if bare and s["waiting"] > 0:
        alert = f'<p class="alert" role="status">You have no plates left. <b>{s["waiting"]}</b> people are still waiting.</p>'
    waiting_html = (
        f'<p class="waiting-line"><b>{s["waiting"]}</b> people are waiting</p>'
        if s["waiting"] > 0 else '<p class="waiting-line">Nobody is waiting.</p>')
    return f"""
<section class="board" aria-label="Saturday service, {s['clock']}">
  <header class="shell">
    <span class="mark"><span class="star">&#x2726;</span>BOW</span>
    <span class="where">Riverside Night Market &middot; Middle Row</span>
    <span class="hud"><span>STOCK <b>$180</b> &middot; 3 TRAYS</span><span>SOLD <b>{s['sold']}</b> PLATES</span></span>
  </header>

  <div class="lane" style="background-image:url('{plate_uri}')">
    {figures(s['figs'])}
  </div>

  <div class="counter">
    <div class="bullnose"></div>
    <div class="steel">
      <div class="counter-head">
        <h2 tabindex="-1">{s['headline']}</h2>
        <p class="clock" aria-label="Time at the market">{s['clock']}</p>
      </div>

      <div class="zones">
        <div class="queue-zone">
          <h3 class="zone-label">Waiting to order</h3>
          {waiting_html}
          <div class="rail">
            {chits(s['chits'])}
          </div>
        </div>

        <div class="plates-zone">
          <h3 class="zone-label">Plates on the counter</h3>
          <p class="plates-line"><b data-bare="{str(bare).lower()}">{s['left']}</b><span>{'plate left' if s['left'] == 1 else 'plates left'}</span></p>
          <div class="trays" aria-hidden="true">
            {tray_blocks(30, s['left'])}
          </div>
        </div>

        <div class="till">
          <h3 class="zone-label">Tonight so far</h3>
          <dl>
            <div><dt>Money taken</dt><dd class="money">${s['till']}</dd></div>
            <div><dt>Plates sold</dt><dd>{s['sold']}</dd></div>
            <div><dt>Left without buying</dt><dd data-loss="{str(s['away'] > 0).lower()}">{s['away']}</dd></div>
          </dl>
        </div>
      </div>

      {alert}

      <div class="controls">
        <button type="button" class="serve">Serve the next order</button>
        <button type="button" class="auto" aria-pressed="false">Serve automatically</button>
        <p class="progress">Order {s['order']} of 24.</p>
      </div>
    </div>
  </div>

  <div class="steam-wisp" style="left:1104px; top:420px; width:110px; height:190px; z-index:3"></div>
  <div class="steam-wisp" style="left:1176px; top:350px; width:80px; height:140px; opacity:.3"></div>
  <div class="vig"></div>
</section>"""

HERO = dict(plate="late", figs="late", clock="20:40", headline="You are serving customers.",
            waiting=10, chits=[(21, 3), (22, 2), (23, 3), (24, 2)], left=2, sold=28, till=336, away=0, order=20)

STATES = [
    ("The market opens", "18:05 — thirty plates, the whole lane still to come",
     dict(plate="dusk", figs="dusk", clock="18:05", headline="You are serving customers.",
          waiting=38, chits=[(1, 2), (2, 1), (3, 2), (4, 2)], left=30, sold=0, till=0, away=0, order=0)),
    ("Peak", "19:35 — the window is full and the second tray is going",
     dict(plate="mid", figs="mid", clock="19:35", headline="You are serving customers.",
          waiting=25, chits=[(10, 2), (11, 1), (12, 3), (13, 2)], left=17, sold=13, till=156, away=0, order=9)),
    ("The counter runs bare", "20:55 — the trays are gone before the lane is",
     dict(plate="late", figs="bare", clock="20:55", headline="You are serving customers.",
          waiting=6, chits=[(23, 3), (24, 3)], left=0, sold=30, till=360, away=2, order=22)),
]

SCENE = f"""<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=1366">
<title>The Pass — 20:40, Direction A</title>
<style>{CSS}
  body {{ display: grid; place-items: start; }}
</style>
<body>
<svg width="0" height="0" style="position:absolute">{FIG_DEFS}</svg>
{board(HERO)}
</body>
</html>
"""

state_sections = []
for title, sub, s in STATES:
    state_sections.append(f"""
<article class="state">
  <header class="state-head">
    <h1>{title}</h1>
    <p>{sub}</p>
  </header>
  {board(s)}
</article>""")

STATESHTML = f"""<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=1366">
<title>The Pass — three states, Direction A</title>
<style>{CSS}
  body {{ display: flex; flex-direction: column; gap: 34px; padding: 26px 0 60px; align-items: center; background: #060403; }}
  .state-head {{ width: 1366px; margin: 0 0 10px; color: #bda795; }}
  .state-head h1 {{ color: #f6ead8; font-size: 19px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }}
  .state-head p {{ font-size: 13.5px; margin-top: 3px; }}
  .board {{ box-shadow: 0 24px 80px -20px rgba(0,0,0,.9); }}
</style>
<body>
<svg width="0" height="0" style="position:absolute">{FIG_DEFS}</svg>
{"".join(state_sections)}
</body>
</html>
"""

(HERE.parent / "scene.html").write_text(SCENE)
(HERE.parent / "states.html").write_text(STATESHTML)
print("scene.html", len(SCENE) // 1024, "kB;  states.html", len(STATESHTML) // 1024, "kB")
