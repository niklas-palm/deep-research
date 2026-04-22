# Scandinavian Design System — Unified Reference

A design system for building polished, Scandinavian-styled artifacts in React. Covers **presentations** (slide decks) and **dashboards** (data-dense single-page apps). Both share a single visual philosophy; this document defines the shared foundation and the format-specific rules.

**Tech stack**: React 18, Tailwind CSS, Recharts, Lucide React icons. No animation libraries.

---

## 1. Design Philosophy

The guiding principles across all artifacts:

- **Warm neutrals everywhere.** Backgrounds, cards, borders, and loading states sit in the warm yellow-brown hue range (36–40° HSL). This distinguishes it from cold blue-grey defaults.
- **Generous whitespace.** Every element earns its space. Layouts feel airy, not packed.
- **Quiet hierarchy.** No bold accent colors competing for attention. Dark elements used sparingly and deliberately. The design trusts content to speak — the chrome gets out of the way.
- **Minimal ornamentation.** No gradients on surfaces. Shadows only where depth is physically meaningful (slide canvas, modals/tooltips — never on cards). No sharp corners anywhere.
- **Muted, desaturated color.** No pure blues, no saturated primaries, no neons. Every color would look natural on a linen swatch.
- **Precise, craft-level spacing.** Small measurements are exact and intentional. Consistent use of Tailwind's spacing scale.

---

## 2. Typography

### Font Selection

| Artifact | Font | Import |
|---|---|---|
| Presentations | **DM Sans** (geometric humanist, softer/rounder) | `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap')` |
| Dashboards | **Inter** (neutral, precise, optimized for UI) | `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')` |

Both fonts use weights 300–700. **Never use `font-extrabold` (800) or `font-black` (900).** The heaviest weight is `font-bold` (700), reserved for large stat numbers only.

Apply with `-webkit-font-smoothing: antialiased`.

### Weight Rules (both formats)

| Weight | Usage |
|---|---|
| **700 (bold)** | Large stat numbers only |
| **600 (semibold)** | Titles, card headings, emphasized values |
| **500 (medium)** | Labels, nav buttons, captions, secondary values |
| **400 (regular)** | Body text, descriptions |

### Typographic Signatures

- **Titles**: `tracking-tight` — tightened letter-spacing for large text
- **Uppercase micro-labels**: `tracking-wide`, `tracking-wider`, or `tracking-widest` at very small sizes (`text-[10px]` to `text-xs`). Used on KPI labels, section dividers, category identifiers, column headers. This is a defining stylistic signature — labels that serve as categories or identifiers are **always** uppercase with wide tracking. Body text and values are **never** uppercased.

### Dashboard Type Scale

| Element | Classes |
|---|---|
| Page title | `text-lg font-semibold tracking-tight` |
| Page subtitle | `text-xs tracking-wide` |
| Chart card title | `text-sm font-semibold` |
| Chart card subtitle | `text-[11px] text-muted-foreground` |
| KPI big number | `text-2xl font-semibold tracking-tight` |
| KPI label | `text-[11px] font-medium uppercase tracking-wider` |
| Section divider | `text-[10px] font-semibold uppercase tracking-widest` |
| Table cells | `text-xs` |

### Presentation Type Scale

| Element | Classes |
|---|---|
| Slide title | `text-5xl font-bold tracking-tight` |
| Slide subtitle | `text-lg text-stone-400` |
| Date/micro-label | `text-[10px] tracking-[0.25em] uppercase text-stone-400` |
| Card heading | `font-semibold` |
| Body text | `font-normal` |

---

## 3. Color System

### Shared Palette Philosophy

Every color is warm, muted, and desaturated. The palette creates a warm-surface / cool-text contrast that defines the Scandinavian feel. Surfaces sit in the warm yellow-brown hue range; text is slightly cooler for readability.

### Surface & Text Colors

| Role | Presentation Hex | Dashboard HSL | Usage |
|---|---|---|---|
| Page background | `#f7f3ec` (parchment) | `40 20% 97%` | Outer container |
| Slide/Card surface | `#fdfbf7` (warmWhite) | `40 25% 99%` | Primary content surface — never pure `#fff` |
| Darkest text | `#2c2926` (charcoal) | `220 20% 14%` | Headings, primary values |
| Secondary text | `#7a7568` (slate) | `220 8% 50%` | Labels, subtitles, metadata |
| Muted text | `#b5b0a6` (fog) | — | Captions, placeholders, resting states |
| Border | — | `36 12% 88%` | Card borders, dividers, grid lines |
| Muted fill | — | `38 14% 93%` | Loading skeletons, pill backgrounds, subtle fills |

### Tailwind Text Color Mapping

In **presentations**, use Tailwind's `stone-*` scale (warm greys):
- Headings: `text-stone-800`
- Body/labels: `text-stone-600` or `text-stone-500`
- Muted/captions: `text-stone-400`
- Very faint: `text-stone-300`

**Never use `slate-*` or `gray-*`.** Always `stone-*`.

In **dashboards**, use CSS custom properties: `text-foreground`, `text-muted-foreground`, etc.

### Accent / Chart Palette

Ten muted, desaturated colors shared across both formats. Every color would look natural on a linen swatch:

```js
const PALETTE = {
  sea:    '#2d7d9a',  // brand teal — most saturated color in the system
  warm:   '#c4956a',  // terracotta/amber
  sage:   '#7a9e7e',  // grey-green (success, completion)
  blush:  '#c88b8b',  // muted rose
  mist:   '#8faabe',  // light steel blue
  clay:   '#b8917a',  // warm taupe
  sky:    '#4a90a4',  // dusty teal
  stone:  '#6b7b8d',  // medium blue-grey
  sand:   '#d4a574',  // light caramel
  slate:  '#3d4f5f',  // dark blue-grey
}
```

Charts cycle through: **sea → warm → sage → blush → mist → clay → sky → stone → sand → slate**. Most charts use just 1–3 colors. The first three (sea, warm, sage) do the heavy lifting.

### Presentation-Specific Extended Palette

Presentations may use these additional warm tones for cards, fills, and decorative elements:

```js
const P = {
  warmWhite:  '#fdfbf7',
  parchment:  '#f7f3ec',
  charcoal:   '#2c2926',
  slateDark:  '#3d3a34',
  slate:      '#7a7568',
  fog:        '#b5b0a6',
  muted:      '#9c968b',
  accent1:    '#8b6f52',  // warm brown (primary chart accent)
  accent2:    '#6b7c5e',  // muted forest green
  accent3:    '#c17c5a',  // terracotta
  accent4:    '#a39171',  // dusty gold
  accent5:    '#8a9a9e',  // sage grey
  accent6:    '#d4c4af',  // light clay
  sand:       '#c8b89a',
  sandLight:  '#e8dfcf',
  clay:       '#a0876c',
  clayLight:  '#d4c4af',
}
```

### Semantic Color Assignment (Dashboards)

Color meaning is consistent across a dashboard — not arbitrary:

| Color | Semantic role |
|---|---|
| **sea** | Primary metric, SLA, total volume, brand accent, CTAs |
| **sage** | Success, completion, "direct routing", positive indicators |
| **warm** | Acknowledgment time, topics, secondary ranking |
| **sand** | Win rate, deal outcomes |
| **blush** | Cancellation, specific categories |
| **clay** | Resolve time, reassignment reasons |
| **mist** | SLA in grouped bars, industry comparisons |
| **#c05050** | Standalone muted red — exclusively for negative/warning metrics |

---

## 4. Surfaces, Borders & Depth

### Cards

| Property | Presentation | Dashboard |
|---|---|---|
| Background | `bg-white/60` | `bg-card` (CSS var) |
| Border | `border border-stone-200/60` | `border` (uses `--border`) |
| Radius | `rounded-2xl` | `rounded-xl` (12px from `--radius`) |
| Padding | `p-5` | `p-4` to `p-5` |
| Shadow | **None** (or `shadow-sm` maximum) | **None** |

**Shadows are reserved for**: the slide canvas (`shadow-xl`), modals (`shadow-xl`), and tooltips. Never on cards.

### Dark Elements (used sparingly)

Only these elements use near-black backgrounds — creating stark but elegant contrast:

- **Presentation**: Slide header icon box, active nav tab, occasional callout cards → `bg-stone-800 text-stone-100`
- **Dashboard**: None by default. The brand teal (`#2d7d9a`) is the strongest visual anchor.

### Border Radius Scale

| Element | Radius |
|---|---|
| Cards (presentation) | `rounded-2xl` (16px) |
| Cards (dashboard) | `rounded-xl` (12px) |
| Modals | `rounded-2xl` (16px) |
| Icon boxes, pills, smaller elements | `rounded-lg` (8px) |
| Buttons | `rounded-lg` (8px) |
| Progress bars, bar chart corners | `rounded-full` or small fixed radius |

No sharp corners anywhere.

---

## 5. Recharts Styling (Shared)

All charts across both formats follow these conventions:

### Axes

```jsx
<XAxis
  dataKey="label"
  tick={{ fontSize: 10, fill: '#b5b0a6' }}
  axisLine={false}
  tickLine={false}
/>
<YAxis
  tick={{ fontSize: 10 }}
  axisLine={false}
  tickLine={false}
  width={35}  // 35–40 for numbers, 90–140 for category labels
/>
```

Always `axisLine={false} tickLine={false}`. Muted tick label color.

### Gridlines

```jsx
<CartesianGrid strokeDasharray="3 3" stroke="#eee9df" />
```

Always dashed. Very faint warm beige. For time-series (horizontal category axis): `vertical={false}`. For horizontal bar charts: `horizontal={false}`.

### Bars

```jsx
// Vertical bars — rounded top corners
<Bar fill="#8b6f52" radius={[4, 4, 0, 0]} barSize={26} />

// Horizontal bars — rounded right corners
<Bar fill="#2d7d9a" radius={[0, 4, 4, 0]} layout="vertical" />
```

### Area Charts

```jsx
<defs>
  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor="#8b6f52" stopOpacity={0.15} />
    <stop offset="95%" stopColor="#8b6f52" stopOpacity={0} />
  </linearGradient>
</defs>
<Area type="monotone" stroke="#8b6f52" strokeWidth={2} fill="url(#areaGrad)" />
```

Gradient fills: 15–20% opacity at top, fading to 0% at bottom. This grounds the line without filling the chart with solid color blocks.

### Line Charts

```jsx
<Line type="monotone" strokeWidth={2} dot={false} />
```

**Always `dot={false}`** — clean, continuous strokes only. No dots on any line chart. Secondary/comparison lines use `strokeWidth={1.5}` + `strokeDasharray="4 2"` (dashed, thinner = clear hierarchy without color alone).

### Pie / Donut Charts

```jsx
<Pie innerRadius={45} outerRadius={78} paddingAngle={2} strokeWidth={0}
     cx="50%" cy="50%">
  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
</Pie>
```

~53% donut hole ratio keeps them airy. `paddingAngle={2}` creates hairline gaps. `strokeWidth={0}` removes default white stroke.

### Radar Charts

```jsx
<Radar stroke="#8b6f52" fill="#8b6f52" fillOpacity={0.1} strokeWidth={2} />
<PolarGrid stroke="#eee9df" />
```

### Tooltips

Always provide a custom tooltip. Warm, rounded, minimal:

```jsx
// Presentation
<div className="bg-white rounded-xl shadow-lg border border-stone-200/60 px-4 py-2.5 text-xs" />

// Dashboard
// Uses CSS override: border-radius 8px, warm border, shadow 0 4px 20px rgba(0,0,0,0.06)
```

### Legends

Only include when multiple series are present. `fontSize: 10` or `11`.

### Stacked Area Convention

All areas share `stackId="1"`. `fillOpacity={0.6}` for primary categories, `0.4` for "Other" to recede. `strokeWidth={1.5}` (1 for "Other").

---

## 6. Spacing & Layout

### Dashboard

- Container: `max-w-[1600px] mx-auto px-6`
- Vertical rhythm: `space-y-6` (24px) between major blocks
- KPI grids: `gap-3` (12px) — compact grouping for small cards
- Chart grids: `gap-4` (16px) — more breathing room for larger cards
- Responsive breakpoints: everything stacks to single column on mobile; `lg` (1024px) is the primary breakpoint for multi-column layouts

### Presentation

- Slide canvas: `max-w-1100px`, `aspect-[16/9]`
- Content padding: `px-10 py-8`
- Grid gaps: `gap-5` between cards within slides

---

## 7. Component Patterns

### Shared: Section Divider

```
────────── SECTION LABEL ──────────
```

`flex items-center gap-3` — two `h-px flex-1 bg-border` lines flanking a `text-[10px] font-semibold uppercase tracking-widest text-muted-foreground` label.

### Dashboard Components

**KpiCard** — Icon container (28×28px, `rounded-lg`, color at 9% opacity background + full-color icon) + uppercase label + large value. Container: `bg-card border rounded-xl p-4 flex flex-col gap-2`.

**MiniKpi** — Single horizontal row: icon + label on left, value on right. Container: `bg-card border rounded-xl px-4 py-3 flex items-center justify-between`.

**ChartCard** — Title (14px semibold) + optional subtitle (11px muted) + chart content. Container: `bg-card border rounded-xl p-5`, header has `mb-4`.

**LeaderboardRow** — Rank + name + count + progress bar. Bar track: `h-1.5 bg-secondary rounded-full`. Fill: `transition-all duration-500` (animates on load).

**Loading States** — Every data-driven component has one. KPI values: `bg-secondary rounded animate-pulse` rectangles. Charts: 9 bars of varying heights with staggered `animationDelay: i * 75ms` creating a wave pulse effect.

### Dashboard Modals

Backdrop: `fixed inset-0`, overlay `bg-foreground/20 backdrop-blur-sm`. Card: `bg-card border rounded-2xl shadow-xl`. This is the **only** place shadows appear.

### Dashboard Interactive Elements

- Filter dropdowns: native `<select>` + `appearance-none` + positioned chevron. Active: teal-tinted border. Focus: `ring-2 ring-[#2d7d9a]/20`.
- Primary CTA: `bg-[#2d7d9a] text-white rounded-lg hover:bg-[#256b84]`. Simple darken on hover, no scale or shadow.
- Icon buttons: `w-6 h-6 rounded-md hover:bg-secondary transition-colors`.
- All buttons: `transition-colors`.

### Dashboard Scrollbar

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(220 8% 78%); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: hsl(220 8% 64%); }
```

---

## 8. Presentation-Specific: Slide System

### Slide Structure

Slides are defined as an array of `{ id, label, component }`. Each slide component fills its parent (`h-full`).

**Reusable SlideHeader**: Dark `rounded-xl` icon box + title/subtitle, aligned horizontally.

**Common content skeleton**:

```jsx
<div className="h-full flex flex-col px-10 py-8" style={{ background: '#fdfbf7' }}>
  <SlideHeader icon={...} title="..." subtitle="..." />
  <div className="flex-1 grid grid-cols-{N} gap-5 mt-4">
    {/* cards / charts / tables */}
  </div>
</div>
```

### Slide Layout Templates

| Type | Layout |
|---|---|
| **Title / Closing** | Centered (`flex flex-col items-center justify-center text-center`). Logo icon, headline, subtitle, row of 3–4 stat boxes at bottom. |
| **KPI Grid** | 3×2 grid of identical cards (icon box, large number, label, description) |
| **Chart + Sidebar** | 5-col grid — chart spans 3, sidebar spans 2 (chart on top, dark callout card below) |
| **Side-by-side Charts** | 2-col grid, optional full-width bottom row |
| **Table** | Single card filling slide, styled `<table>` with parchment header row |
| **Insights / Text** | 2-col, 3-row grid. Alternate `bg-white/60` and `bg-stone-50/80` |
| **Recommendations** | Vertical stack of equal-height cards with faded number + title + body |

### Slide Transition System (Critical)

A single-layer, three-phase animation using **inline styles** on one absolutely-positioned div. No CSS classes, no animation libraries.

#### State

```jsx
const [current, setCurrent] = useState(0)       // nav highlighting
const [rendered, setRendered] = useState(0)      // which slide is mounted
const [animClass, setAnimClass] = useState('')   // '' | 'exit' | 'enter-start' | 'enter-end'
const [direction, setDirection] = useState('next')
const lockRef = useRef(false)                    // prevents overlapping transitions
```

#### Transition Orchestrator

```jsx
const goTo = useCallback((idx) => {
  if (idx === current || lockRef.current) return
  lockRef.current = true
  setDirection(idx > current ? 'next' : 'prev')

  // PHASE 1: Exit old content
  setAnimClass('exit')

  setTimeout(() => {
    // PHASE 2: Swap content (invisible — opacity is 0)
    setCurrent(idx)
    setRendered(idx)
    setAnimClass('enter-start')  // position off-screen, NO transition

    // Double rAF forces browser to paint position before adding transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // PHASE 3: Animate in
        setAnimClass('enter-end')
        setTimeout(() => {
          setAnimClass('')
          lockRef.current = false
        }, 360)
      })
    })
  }, 280)
}, [current])
```

#### Style Computation

```jsx
const exitX  = direction === 'next' ? '-40px' : '40px'
const enterX = direction === 'next' ? '40px'  : '-40px'

let style
if (animClass === 'exit') {
  style = { opacity: 0, transform: `translateX(${exitX})`,
    transition: 'opacity 0.28s ease-in-out, transform 0.28s ease-in-out' }
} else if (animClass === 'enter-start') {
  style = { opacity: 0, transform: `translateX(${enterX})` }  // NO transition
} else if (animClass === 'enter-end') {
  style = { opacity: 1, transform: 'translateX(0)',
    transition: 'opacity 0.34s ease-out, transform 0.34s ease-out' }
} else {
  style = { opacity: 1, transform: 'translateX(0)' }
}
```

#### Why This Works

- `rendered` (mounted slide) only changes **after** the exit fade-out completes
- Content swaps while invisible (opacity: 0)
- New content positioned off-screen with **no transition** (instant)
- Double `requestAnimationFrame` ensures the browser paints position **before** the CSS transition is added
- `lockRef` prevents rapid clicks from overlapping animations

#### Timing

| Phase | Duration | Easing |
|---|---|---|
| Exit (fade out + slide) | 280ms | ease-in-out |
| Enter start (reposition) | 0ms | none |
| Enter (fade in + slide) | 340ms | ease-out |

Enter is slightly slower than exit → gentle arrival. `ease-out` on enter = deceleration (fast in, slow settle).

### Presentation Navigation

**Bottom bar**: `bg-white/50 backdrop-blur-sm border-t border-stone-200/40`

```
[<] [Title] [Slide 2] [Slide 3] ... [>]
```

- Arrows: `w-8 h-8 rounded-lg border border-stone-300/50`, disabled at boundaries
- Tabs: `px-3 py-1.5 rounded-lg text-xs font-medium`
- Active: `bg-stone-800 text-stone-100`
- Inactive: `text-stone-400 hover:bg-stone-100`
- Container: `overflow-x-auto` for many slides

**Keyboard**: Right Arrow / Space → next. Left Arrow → previous. All navigation routes through `goTo()`.

---

## 9. Key Rules Checklist

1. **Warm neutrals only** — no pure white (`#fff`) backgrounds, no cold greys
2. **`stone-*` text colors in presentations** — never `slate-*` or `gray-*`
3. **Font weight ceiling is 700** — never `font-extrabold` or `font-black`
4. **Uppercase + wide tracking on all category labels** — the typographic signature
5. **No shadows on cards** — borders only. Shadows reserved for slide canvas, modals, tooltips
6. **Charts: no axis lines, no tick lines, no dots on lines** — clean and minimal
7. **Dashed lines for secondary series** — `strokeDasharray="4 2"`, thinner stroke
8. **Area fills fade to zero** — gradient from ~15–20% opacity to 0%
9. **Dark elements used sparingly** — only icon boxes, active nav, occasional callout cards
10. **Card styling is consistent** within each format — same radius, border, background, padding
11. **No animation libraries** — presentation transitions are ~40 lines of `setTimeout` + `requestAnimationFrame`
12. **Every loading state uses `animate-pulse`** on warm-grey (`bg-secondary`) skeleton shapes
13. **Consistent rounded corners** — no sharp corners anywhere in the system
14. **The most saturated color in the entire system is the brand teal** — everything else is more muted
