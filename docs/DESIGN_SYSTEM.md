# LifeOrbit interface contract

## Direction
Quiet, tactile, restrained. Inspired by the clarity and care of polished native apps, not by decorative dashboards. Do not copy Apple's proprietary visual assets.

## Colour
Light: canvas #F8F8FA, surface #FFFFFF, primary text #202127, secondary #777984, accent #7263D5, subtle lavender #F0EEFF.
Dark: canvas #18191C, surface #24252A, primary text #F4F3F8, accent #B7AFFF.
Use CSS tokens in `src/styles.css`; no literal page-level colours.

## Layout
One shared sidebar in `components/Layout.tsx`. One page heading per screen, no redundant eyebrow above headings. Use comfortable spacing, readable line lengths, balanced card sizes and clear actions. Cards use subtle borders and 16–20px corners.

## Motion
Transitions should communicate navigation or action feedback. Keep them short (roughly 150–260ms). No bouncing backgrounds, decorative continuous animations, or hover scale effects on every card. Respect `prefers-reduced-motion`.

## Review checklist
320px to ultrawide screens, keyboard support and visible focus, contrast, touch targets, dark mode, empty/loading/error states, content overflow, safe input labels. Test real interactions, not just screenshots.

Backend-bound features remain local demo implementations until authenticated Python APIs are ready.
