# Color Guidelines
- **Ivory Background `#F9F9F9`** – default surface for pages and scrollable regions (≈60%). Pair with soft shadows and low-opacity dividers.
- **Sage Surface `#A8C2B1`** – card/panel canvas (≈30%). Use for containers, modals, and subtle highlights. Mix with `surface-strong` tint for borders.
- **Vibrant Accent `#3B82F6`** – interactive elements (≈10%). Apply to primary buttons, focus outlines, data pills, and key status tags. Hover tone: `#2563EB`.
- **Dark Slate Text `#2D3748`** – primary copy color. Use `muted` variant `#4A5568` for secondary and supporting text.
- **Surface Strong `#94AD9E`** – structural borders, chips, and subtle overlays derived from Sage.
- **Overlay rgba(45,55,72,0.6)** – scrims for dialogs and menus.

## Usage Notes
- Build layouts on Ivory then layer Sage panels so the hierarchy stays clear without heavy borders.
- Keep Accent touches purposeful. Reserve full Accent backgrounds for primary CTAs, badges, and success states; use low-opacity Accent fills (`bg-accent/20`) for emphasis or loading.
- Maintain text contrast: Slate on Ivory/Sage; Accent-foreground (white) on Accent backgrounds.
- Borders and dividers should lean on Surface Strong (full or fractional opacity) to avoid harsh contrast.
- For states: loading and informational badges use Accent tints; neutral placeholders fall back to Surface/Surface Strong mixes; destructive states may still use semantic reds for clarity.

## Accessibility Tips
- Minimum contrast ratio for primary text on Ivory/Sage is 4.5:1 (Slate achieves 7+:1).
- When placing Accent on Sage, increase padding or add a white glyph/shadow so focus rings remain visible.
- Always pair Accent backgrounds with Accent-foreground (white) text or icons to keep contrast above 4.5:1.
