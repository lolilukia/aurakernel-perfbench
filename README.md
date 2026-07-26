# AuraKernel PerfBench

AuraKernel PerfBench is an open-source, dependency-free leaderboard and analysis
interface for comparing AI agents that optimize AscendC operators.

It turns benchmark traces into an explorable view of compilation reliability,
end-to-end correctness, performance gain, latency, token and API cost,
optimization rounds, and hardware utilization. The interface runs entirely in
the browser and can be opened locally without a backend.

> **Project status:** active early-stage prototype. The bundled dataset is
> deterministic illustrative data used to exercise the interface; it is not a
> claim about measured vendor or model performance.

## Why this project exists

AI-assisted kernel optimization is difficult to compare because results are
often scattered across logs, scripts, and one-off reports. AuraKernel PerfBench
provides a reusable, inspectable presentation layer and data contract for:

- comparing optimization agents across operators and hardware;
- reviewing quality, cost, latency, and utilization together;
- identifying Pareto-efficient results instead of relying on a single score;
- sharing reproducible benchmark reports without a proprietary dashboard;
- validating UI behavior with deterministic fixtures before real runs arrive.

## Highlights

- Sortable primary leaderboard with desktop and mobile views
- Quality-versus-cost Pareto constellation
- Direction-aware benchmark rubric
- Operator process heatmap
- Performance gain by operator
- Dtype and chip duration matrix
- AI Core utilization fingerprint
- Linked highlighting, tooltips, state previews, and model detail drawer
- Light, dark, tablet, and mobile layouts
- No runtime package, server, or network dependency

## Run locally

Open `index.html` directly, or serve the directory:

```sh
python3 -m http.server 4174 --bind 127.0.0.1
```

Then visit <http://127.0.0.1:4174>.

## Regenerate the sample dataset

```sh
node scripts/build-data.mjs
```

The generator writes matching `mock-data.json` and `mock-data.js` payloads so
the project works both over HTTP and through `file://`.

## Repository layout

- `index.html`, `styles.css`, `v2-terminal-theme.css` — application shell and themes
- `app.js` — client-side rendering and interactions
- `mock-data.json`, `mock-data.js` — deterministic example benchmark payload
- `scripts/build-data.mjs` — fixture generator
- `tokens.json` — design tokens
- `design-system.html` and related CSS — component and identity reference
- `assets/` — project marks and attributed vendor marks
- `INTERACTION-SPEC.md` — interaction behavior
- `QA-REPORT.md` — validation notes

## Roadmap

- Publish a versioned benchmark data schema
- Add adapters for real AscendC benchmark and profiler output
- Add automated schema, accessibility, and rendering checks
- Support signed run metadata and reproducibility manifests
- Add contribution guidance for new operators and hardware targets

Contributions, issue reports, and benchmark adapter proposals are welcome.

## License

MIT. See [LICENSE](LICENSE).
