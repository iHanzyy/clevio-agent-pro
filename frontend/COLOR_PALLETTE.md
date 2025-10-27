# Color Palette & Usage Guidelines

## 1. Cover
- **Tagline:** Natural Tech — calm, natural base with a creative tech accent
- **Version:** 1.0
- **Date:** 27 Oct 2025
- **Maintainer:** Design System

## 2. Palette Overview (60/30/10)
Apply the 60/30/10 balance so that 60% of the interface feels spacious and neutral, 30% adds gentle structure, and the final 10% provides the energetic tech accent for focus and action cues.

| Role | Name | Hex | RGB | HSL | Preview |
| --- | --- | --- | --- | --- | --- |
| Main (60%) | Snow / Off-White | #F9F9F9 | RGB(249,249,249) | HSL(0,0%,98%) | Swatch<br><span style="display:inline-block;width:24px;height:24px;border:1px solid #E2E8F0;background:#F9F9F9;"></span> |
| Secondary (30%) | Sage Green | #A8C2B1 | RGB(168,194,177) | HSL(141,18%,71%) | Swatch<br><span style="display:inline-block;width:24px;height:24px;border:1px solid #E2E8F0;background:#A8C2B1;"></span> |
| Accent (10%) | Vibrant Blue | #3B82F6 | RGB(59,130,246) | HSL(217,91%,60%) | Swatch<br><span style="display:inline-block;width:24px;height:24px;border:1px solid #E2E8F0;background:#3B82F6;"></span> |
| Neutral Text | Dark Slate | #2D3748 | RGB(45,55,72) | HSL(218,23%,23%) | Swatch<br><span style="display:inline-block;width:24px;height:24px;border:1px solid #E2E8F0;background:#2D3748;"></span> |

> Note: Optional accent (playful): Coral #FF7B54 (use sparingly; not part of primary UI).

## 3. Roles & Usage
- **Main / Background (60%) — #F9F9F9:** Page backgrounds, large whitespace zones, and layout breathing room.
- **Secondary / Panels & Cards (30%) — #A8C2B1:** Sidebars, supporting panels, contextual info blocks, onboarding frames.
- **Accent / CTAs & Links (10%) — #3B82F6:** Primary actions, key links, progress highlights, data points requiring attention.
- **Neutral Text — #2D3748:** Body copy, headings, subtitles, and iconography on Sage backgrounds.
- **Contrast tip:** Never place white text on Sage; choose Dark Slate on Sage to meet WCAG AA.

## 4. Accessibility & Contrast (WCAG 2.1)
- **Target:** AA for normal text (≥4.5:1); AAA for large text optional.

**Checked combinations**
- Dark Slate (#2D3748) on Snow (#F9F9F9): 11.39:1 — AA/AAA ✔
- Dark Slate (#2D3748) on Sage (#A8C2B1): 6.29:1 — AA ✔ (AAA for large ✔, AAA normal ✖)
- White (#FFFFFF) on Vibrant Blue (#3B82F6): 3.68:1 — AA large only ✔ (normal ✖)
- White (#FFFFFF) on Accent Strong (#2563EB): 5.17:1 — AA normal ✔
- White (#FFFFFF) on Sage (#A8C2B1): 1.91:1 — ✖ Avoid

**Guidance**
- For small-text buttons, prefer Accent Strong (#2563EB) over #3B82F6.
- Reserve #3B82F6 for links, icons, outlines, or large-text CTAs.

## 5. Design Tokens (Light Only)

### Core
| Token | Purpose | Value (Hex) |
| --- | --- | --- |
| --color-bg | Primary background / canvas | #F9F9F9 |
| --color-panel | Panels, cards, secondary surfaces | #A8C2B1 |
| --color-text | Headlines, body, UI text | #2D3748 |
| --color-accent | Primary accent, links, outlines | #3B82F6 |
| --color-accent-strong | Solid CTA backgrounds | #2563EB |
| --color-border | Borders on light surfaces | #E2E8F0 |
| --color-divider | Dividers and subtle separators | #E2E8F0 |
| --color-focus | Focus ring + keylines | #93C5FD |

### Neutrals
| Token | Purpose | Value (Hex) |
| --- | --- | --- |
| --neutral-50 | Subtle hover fills | #F7FAFC |
| --neutral-100 | Alt row backgrounds | #EDF2F7 |
| --neutral-200 | Dividers, input borders | #E2E8F0 |
| --neutral-300 | Disabled borders | #CBD5E0 |
| --neutral-400 | Muted text, icons | #A0AEC0 |
| --neutral-500 | Secondary text | #718096 |
| --neutral-600 | Tertiary buttons | #4A5568 |
| --neutral-700 | Base text anchor | #2D3748 |
| --neutral-800 | Strong emphasis text | #1A202C |
| --neutral-900 | Deep accents / overlays | #171923 |

### States
| Token | Purpose | Value (Hex) |
| --- | --- | --- |
| --success-base | High-emphasis success indicators | #2F855A |
| --success-bg | Success background fills | #DEF7EC |
| --success-bd | Success borders | #9AE6B4 |
| --success-on | Text/icon on success base | #FFFFFF / #F0FFF4 |
| --warning-base | Warning iconography & labels | #92400E |
| --warning-bg | Warning background fills | #FEF3C7 |
| --warning-bd | Warning borders | #F59E0B |
| --warning-on | Text/icon on warning base | #1F2937 |
| --error-base | Error iconography & labels | #991B1B |
| --error-bg | Error background fills | #FEE2E2 |
| --error-bd | Error borders | #FCA5A5 |
| --error-on | Text/icon on error base | #1F2937 |
| --info-base | Informational iconography & labels | #075985 |
| --info-bg | Info background fills | #E0F2FE |
| --info-bd | Info borders | #7DD3FC |
| --info-on | Text/icon on info base | #1F2937 |

> Success: Use for confirmations, healthy system checks, and completion banners.  
> Warning: Use when user attention is required but action risk is moderate.  
> Error: Use for blocking failures, destructive confirmations, and validation errors.  
> Info: Use for neutral tips, system notices, and contextual helper text.

## 6. CSS Variables (Light Theme)
```css
:root {
  --color-bg: #F9F9F9;
  --color-panel: #A8C2B1;
  --color-text: #2D3748;
  --color-accent: #3B82F6;
  --color-accent-strong: #2563EB;
  --color-border: #E2E8F0;
  --color-divider: #E2E8F0;
  --color-focus: #93C5FD;

  --neutral-50:  #F7FAFC;
  --neutral-100: #EDF2F7;
  --neutral-200: #E2E8F0;
  --neutral-300: #CBD5E0;
  --neutral-400: #A0AEC0;
  --neutral-500: #718096;
  --neutral-600: #4A5568;
  --neutral-700: #2D3748;
  --neutral-800: #1A202C;
  --neutral-900: #171923;

  --success-base: #2F855A;
  --success-bg:   #DEF7EC;
  --success-bd:   #9AE6B4;

  --warning-base: #92400E;
  --warning-bg:   #FEF3C7;
  --warning-bd:   #F59E0B;

  --error-base:   #991B1B;
  --error-bg:     #FEE2E2;
  --error-bd:     #FCA5A5;

  --info-base:    #075985;
  --info-bg:      #E0F2FE;
  --info-bd:      #7DD3FC;
}

.divider { border-color: var(--color-divider); }
```

## 7. Tailwind Integration
```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        panel: "var(--color-panel)",
        text: "var(--color-text)",
        accent: "var(--color-accent)",
        accentStrong: "var(--color-accent-strong)",
        border: "var(--color-border)",
        divider: "var(--color-divider)",
        focus: "var(--color-focus)",
        neutral: {
          50:  "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)"
        },
        state: {
          success: { base: "var(--success-base)", bg: "var(--success-bg)", bd: "var(--success-bd)" },
          warning: { base: "var(--warning-base)", bg: "var(--warning-bg)", bd: "var(--warning-bd)" },
          error:   { base: "var(--error-base)",   bg: "var(--error-bg)",   bd: "var(--error-bd)" },
          info:    { base: "var(--info-base)",    bg: "var(--info-bg)",    bd: "var(--info-bd)" }
        }
      }
    }
  }
}
```

**global.css guidance**
- Ensure `@tailwind base; @tailwind components; @tailwind utilities;` exist in that order.
- Load the `:root` variable block before importing Tailwind utilities so class generation inherits correct values.

## 8. Component Examples (Tailwind)

**Primary Button (CTA)**
```html
<div class="flex gap-3">
  <button type="button" class="inline-flex items-center justify-center rounded-md bg-accentStrong px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label="Create new agent">
    Create Agent
  </button>
  <button type="button" class="inline-flex items-center justify-center rounded-md bg-accentStrong px-4 py-2 text-sm font-semibold text-white opacity-70 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label="Creating agent" disabled>
    Saving…
  </button>
</div>
```

**Secondary Button (Outline)**
```html
<button type="button" class="inline-flex items-center justify-center rounded-md border border-accentStrong px-4 py-2 text-sm font-semibold text-accentStrong transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
  View Details
</button>
```

**Card / Panel**
```html
<section class="rounded-xl border border-neutral-200 bg-panel p-6 text-text shadow-sm">
  <h3 class="text-lg font-semibold text-text">Usage Summary</h3>
  <p class="mt-2 text-sm text-neutral-700">Keep panels light and spacious; use Dark Slate text for clarity.</p>
</section>
```

**Link**
```html
<a href="#" class="text-accent font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
  Read documentation
</a>
```

**Alert**
```html
<div class="rounded-lg border border-state-success-bd bg-state-success-bg px-4 py-3 text-sm text-state-success-base">
  <p class="font-semibold">All agents are online.</p>
  <p class="text-neutral-700">Last health check completed 2 minutes ago.</p>
</div>
```

## 9. Do / Don’t

**Do**
- Use Snow (#F9F9F9) for the primary page background.
- Apply Dark Slate text on Sage panels for reliable contrast.
- Select Accent Strong (#2563EB) for small-text CTAs and badges.
- Keep borders and dividers at neutral-200 (#E2E8F0) for cohesion.

**Don’t**
- Don’t place white text on Sage panels.
- Don’t use Vibrant Blue (#3B82F6) for small-text solid buttons.
- Don’t treat Coral as a primary action; keep it playful and optional only.

## 10. Implementation Checklist
- Add the CSS variable block to the global stylesheet before Tailwind utilities.
- Map tokens in `tailwind.config.js` using the provided snippet.
- Replace hardcoded hex values in shared components with the new tokens.
- Validate contrast ratios on custom layouts; maintain AA minimums.
- QA all buttons and links for focus-visible rings and hover states.

## 11. Changelog
- **1.0 (2025-10-27):** Initial light-only “Natural Tech” palette with Tailwind integration.
