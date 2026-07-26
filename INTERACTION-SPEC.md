# Interaction, responsive, and accessibility specification

## V2 visual contract

- V2 preserves the V1 information architecture, copy, values, chart encodings, controls and breakpoints.
- Both color-profile states remain dark: terminal and deep-terminal.
- Display headings, controls, labels and data use a coding-oriented monospace rhythm; body explanations remain readable sans serif.
- Syntax accents supplement meaning but never replace exact labels, values, signed directions or shapes.
- The new AuraKernel mark combines a command prompt, 3×3 kernel matrix and interrupted diagnostic orbit.

## Linked model behavior

- Every model owns one stable color across the ranked core field, tables, Pareto constellation, heatmap labels, best-by-operator list, signal fingerprint, unit lanes, and drawer.
- Hovering any element with a model identity dims the other models across the page.
- Clicking a model in the leaderboard, Pareto constellation, rubric, heatmap label, best-by-operator list, fingerprint legend, or utilization lanes opens the same detail drawer.
- Local vendor SVG marks always precede model names; Pareto nodes and ranked cores use the same marks instead of initials.

## Ranking and filtering

- Re-rank by PerfScore, Performance Gain, Cost-efficiency, or E2E Pass Rate.
- Search matches model, vendor, or family; `/` focuses the search field.
- Filter by model family and open/closed weights.
- Chip selection is provided as a data-binding control for real benchmark integration.
- Leaderboard rows and orbital core marks share one ordering after every change.

## Chart controls

- Scatter x-axis toggles between Total API Cost and Total Tokens; both use log scales.
- Process heatmap toggles between Token Consumption, Optimization Rounds, Optimization Wall-Time, and Profiling Runs. All four invert the ramp so low values are good.
- Performance Gain selects one model and keeps zero as the explicit pulse origin for directional gain vectors.
- Duration selects model and operator, and toggles timing race tracks between absolute microseconds and normalized fastest-cell units.
- Utilization selects an operator and overlays the top three visible models as concentric fingerprint signals and exact-value beads.

## Detail drawer

- Desktop/tablet: right-side slide-over.
- Mobile: full-screen sheet.
- Contains six summary metrics, ten operator rows and trajectories, an illustrative AscendC snippet, and tool-call diagnostics.
- Close with the close button, backdrop, or `Escape`.

## State model

- The prototype strip switches all major sections between default, loading, and empty states.
- Hover/active is demonstrated by live controls and linked highlighting.
- Terminal and deep-terminal are parity profiles controlled by the header toggle.
- URL export parameters allow deterministic capture of theme and state.

## Responsive behavior

- Desktop: 1440px reference frame, 1240px content maximum.
- Tablet: 834px; navigation condenses, split views stack, tables remain scrollable.
- Mobile: 390px; the leaderboard table becomes cards, rubric/heatmap remain horizontally scrollable, split charts stack, and the drawer becomes a full-screen sheet.
- Scatter preserves its log axis on mobile and scrolls inside its own bounded surface instead of overflowing the page.

## Accessibility

- English semantic headings, landmarks, table captions, labels, and chart `aria-label` descriptions.
- Visible keyboard focus and a skip link for keyboard users.
- Tabular monospace numerals for all data values.
- Text labels, vendor marks, signed values, baselines, and shapes supplement color; color is never the only critical encoding.
- Sequential ramps use low-saturation teal, neutral, and amber with direction stated in copy.
- Utilization uses a neutral/dual-hue treatment and includes a bottleneck-context note.
- Motion respects `prefers-reduced-motion`; normal transitions are 150–220ms.
- Key text and controls target WCAG AA contrast in both terminal profiles.
