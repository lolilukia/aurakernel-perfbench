const state = {
  data: null,
  rankMetric: 'perf_score',
  family: 'all',
  weights: 'all',
  search: '',
  scatterX: 'cost',
  heatMetric: 'tokens_k',
  gainModel: 'gpt-5-6-sol',
  durationModel: 'gpt-5-6-sol',
  durationOperator: 'FlashAttention',
  durationView: 'absolute',
  utilOperator: 'FlashAttention',
  drawerModel: null
};

const metricMeta = {
  perf_score: { label: 'PerfScore', short: 'SCORE', unit: '', direction: 'up', decimals: 1 },
  e2e_pass: { label: 'E2E Pass Rate', short: 'E2E %', unit: '%', direction: 'up', decimals: 1 },
  perf_gain_median: { label: 'Performance Gain', short: 'GAIN %', unit: '%', direction: 'up', decimals: 1 },
  cost_efficiency: { label: 'Cost-efficiency', short: 'GAIN / $', unit: '×/$', direction: 'up', decimals: 1 },
  task_duration_median_us: { label: 'Median Task Duration', unit: 'µs', direction: 'down', decimals: 1 },
  tokens_total_k: { label: 'Total Tokens', unit: 'k', direction: 'down', decimals: 0 },
  api_cost_usd: { label: 'Total API Cost', unit: 'USD', direction: 'down', decimals: 2 },
  compile_pass: { label: 'Compilation Pass Rate', unit: '%', direction: 'up', decimals: 1 },
  rounds_median: { label: 'Optimization Rounds', unit: '', direction: 'down', decimals: 0 },
  profiling_runs_median: { label: 'Profiling Runs', unit: '', direction: 'down', decimals: 0 },
  tool_call_acc: { label: 'Tool-Call Accuracy', unit: '%', direction: 'up', decimals: 1 }
};

const processMeta = {
  tokens_k: { label: 'Token Consumption', unit: 'k tokens', shortUnit: 'k' },
  rounds: { label: 'Optimization Rounds', unit: 'rounds', shortUnit: '' },
  wall_time_s: { label: 'Optimization Wall-Time', unit: 's', shortUnit: 's' },
  profiling_runs: { label: 'Profiling Runs', unit: 'runs', shortUnit: '' }
};

const utilizationKeys = [
  { key: 'aic', label: 'AIC' },
  { key: 'aiv', label: 'AIV' },
  { key: 'l2_bw', label: 'L2 BW' },
  { key: 'hbm_bw', label: 'HBM BW' },
  { key: 'overlap', label: 'Overlap' }
];

const vendorAssetMap = {
  OpenAI: 'openai.svg',
  Anthropic: 'anthropic.svg',
  Google: 'google.svg',
  DeepSeek: 'deepseek.svg',
  Alibaba: 'alibabacloud.svg',
  Zhipu: 'zai.svg',
  Moonshot: 'kimi.svg'
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (['dark', 'light'].includes(params.get('theme'))) document.documentElement.dataset.theme = params.get('theme');
    if (params.get('export') === '1') document.body.classList.add('export-mode');
    if (['default', 'loading', 'empty'].includes(params.get('state'))) document.body.dataset.previewState = params.get('state');
    const exportBreakpoints = { tablet: { width: 834, height: 1000 }, mobile: { width: 390, height: 844 } };
    const exportBreakpoint = exportBreakpoints[params.get('breakpoint')];
    if (exportBreakpoint) {
      document.documentElement.classList.add(`export-${params.get('breakpoint')}`);
    }
    state.data = window.AURAKERNEL_MOCK_DATA || null;
    if (window.location.protocol !== 'file:') {
      try {
        const response = await fetch('mock-data.json');
        if (!response.ok) throw new Error(`Dataset request failed: ${response.status}`);
        state.data = await response.json();
      } catch (fetchError) {
        if (!state.data) throw fetchError;
        console.warn('Using the embedded offline dataset fallback.', fetchError);
      }
    }
    if (!state.data) throw new Error('No embedded or fetched mock dataset is available.');
    populateControls();
    bindControls();
    renderAll();
    configureExportPage(params, exportBreakpoint);
  } catch (error) {
    console.error(error);
    document.body.dataset.previewState = 'empty';
    showToast('Mock dataset could not be loaded');
  }
}

function configureExportPage(params, exportBreakpoint) {
  if (params.get('export') !== '1') return;
  requestAnimationFrame(() => {
    const width = exportBreakpoint?.width || 1440;
    // Desktop paged media expands vertical rhythm more than responsive page sizes.
    // Keep a bounded allowance per export route so each long-scroll master remains one page.
    const breakpointName = params.get('breakpoint');
    const printAllowance = breakpointName === 'mobile' ? 0.68 : breakpointName === 'tablet' ? 0.92 : 1.45;
    const height = Math.max(Math.ceil(document.documentElement.scrollHeight * printAllowance), exportBreakpoint?.height || 1000);
    const printOverride = document.createElement('style');
    printOverride.id = 'export-page-size';
    printOverride.textContent = `@page{size:${width / 96}in ${height / 96}in;margin:0}@media print{html,body{width:${width}px!important}.site-header,.section,.site-footer{width:${width}px!important}}`;
    document.head.append(printOverride);
  });
}

function populateControls() {
  const { models, meta } = state.data;
  const families = [...new Set(models.map(model => model.family))];
  const familySelect = document.querySelector('#family-filter');
  familySelect.insertAdjacentHTML('beforeend', families.map(family => `<option value="${escapeHTML(family)}">${escapeHTML(family)}</option>`).join(''));

  const modelOptions = models.map(model => `<option value="${model.id}">${escapeHTML(model.name)}</option>`).join('');
  document.querySelector('#gain-model').innerHTML = modelOptions;
  document.querySelector('#duration-model').innerHTML = modelOptions;

  const operatorOptions = meta.operators.map(operator => `<option value="${escapeHTML(operator)}">${escapeHTML(operator)}</option>`).join('');
  document.querySelector('#duration-operator').innerHTML = operatorOptions;
  document.querySelector('#util-operator').innerHTML = operatorOptions;

  document.querySelector('#gain-model').value = state.gainModel;
  document.querySelector('#duration-model').value = state.durationModel;
  document.querySelector('#duration-operator').value = state.durationOperator;
  document.querySelector('#util-operator').value = state.utilOperator;
}

function bindControls() {
  document.querySelector('#rank-metric').addEventListener('change', event => {
    state.rankMetric = event.target.value;
    renderLeaderboard();
  });
  document.querySelector('#family-filter').addEventListener('change', event => {
    state.family = event.target.value;
    renderAllDataViews();
  });
  document.querySelector('#model-search').addEventListener('input', event => {
    state.search = event.target.value.trim().toLowerCase();
    renderAllDataViews();
  });
  document.querySelectorAll('[data-weights]').forEach(button => button.addEventListener('click', () => {
    state.weights = button.dataset.weights;
    setActive(button, '[data-weights]');
    renderAllDataViews();
  }));
  document.querySelectorAll('[data-scatter]').forEach(button => button.addEventListener('click', () => {
    state.scatterX = button.dataset.scatter;
    setActive(button, '[data-scatter]');
    renderScatter();
  }));
  document.querySelector('#heat-metric').addEventListener('change', event => {
    state.heatMetric = event.target.value;
    renderHeatmap();
  });
  document.querySelector('#gain-model').addEventListener('change', event => {
    state.gainModel = event.target.value;
    renderGainViews();
  });
  document.querySelector('#duration-model').addEventListener('change', event => {
    state.durationModel = event.target.value;
    renderDurationViews();
  });
  document.querySelector('#duration-operator').addEventListener('change', event => {
    state.durationOperator = event.target.value;
    renderDurationViews();
  });
  document.querySelector('#util-operator').addEventListener('change', event => {
    state.utilOperator = event.target.value;
    renderUtilization();
  });
  document.querySelectorAll('[data-duration-view]').forEach(button => button.addEventListener('click', () => {
    state.durationView = button.dataset.durationView;
    setActive(button, '[data-duration-view]');
    renderDurationBars();
  }));
  document.querySelectorAll('[data-state]').forEach(button => button.addEventListener('click', () => {
    document.body.dataset.previewState = button.dataset.state;
    setActive(button, '[data-state]');
  }));

  document.querySelector('#theme-toggle').addEventListener('click', toggleTheme);
  document.querySelector('#search-shortcut').addEventListener('click', focusSearch);
  document.addEventListener('keydown', event => {
    const target = event.target;
    if (event.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(target.tagName)) {
      event.preventDefault();
      focusSearch();
    }
    if (event.key === 'Escape' && state.drawerModel) closeDrawer();
  });

  document.querySelector('#copy-dataset').addEventListener('click', () => copyText('node scripts/build-data.mjs', 'Data generation command copied'));
  document.querySelector('#copy-bibtex').addEventListener('click', () => copyText(document.querySelector('#bibtex').innerText, 'BibTeX copied'));
  document.querySelector('#drawer-close').addEventListener('click', closeDrawer);
  document.querySelector('#drawer-backdrop').addEventListener('click', closeDrawer);

  document.querySelector('#leader-table thead').addEventListener('click', event => {
    const button = event.target.closest('[data-sort]');
    if (!button) return;
    state.rankMetric = button.dataset.sort;
    if ([...document.querySelector('#rank-metric').options].some(option => option.value === state.rankMetric)) document.querySelector('#rank-metric').value = state.rankMetric;
    renderLeaderboard();
  });

  document.body.addEventListener('pointerover', event => {
    const target = event.target.closest('[data-model-id]');
    if (!target) return;
    document.body.dataset.highlightModel = target.dataset.modelId;
  });
  document.body.addEventListener('pointerout', event => {
    const target = event.target.closest('[data-model-id]');
    if (!target || (event.relatedTarget && target.contains(event.relatedTarget))) return;
    delete document.body.dataset.highlightModel;
  });
  document.body.addEventListener('click', event => {
    const target = event.target.closest('[data-open-drawer]');
    if (target) openDrawer(target.dataset.modelId);
  });
  document.body.addEventListener('pointermove', event => {
    const target = event.target.closest('[data-tooltip-html]');
    if (target) showTooltip(target.dataset.tooltipHtml, event.clientX, event.clientY);
    else hideTooltip();
  });
  document.body.addEventListener('pointerleave', hideTooltip);
}

function setActive(active, selector) {
  active.closest('.segmented, .filter-group')?.querySelectorAll(selector).forEach(button => button.classList.toggle('is-active', button === active));
}

function renderAll() {
  renderHeadlineStats();
  renderAllDataViews();
}

function renderAllDataViews() {
  renderLeaderboard();
  renderScatter();
  renderRubric();
  renderHeatmap();
  renderGainViews();
  renderDurationViews();
  renderUtilization();
}

function visibleModels() {
  const filtered = state.data.models.filter(model => {
    const matchesFamily = state.family === 'all' || model.family === state.family;
    const matchesWeights = state.weights === 'all' || model.weights === state.weights;
    const haystack = `${model.name} ${model.vendor} ${model.family}`.toLowerCase();
    return matchesFamily && matchesWeights && (!state.search || haystack.includes(state.search));
  });
  return filtered.sort((a, b) => modelMetric(b, state.rankMetric) - modelMetric(a, state.rankMetric));
}

function modelMetric(model, key) {
  if (key === 'cost_efficiency') return model.overall.perf_gain_median / model.overall.api_cost_usd;
  return model.overall[key];
}

function renderHeadlineStats() {
  const { meta } = state.data;
  const stats = [
    ['Models evaluated', String(meta.models_evaluated).padStart(2, '0')],
    ['Operators', String(meta.operators.length).padStart(2, '0')],
    ['Ascend chips', String(meta.chips.length).padStart(2, '0')],
    ['Device-hours', `${meta.device_hours} h`]
  ];
  document.querySelector('#headline-stats').innerHTML = stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function renderLeaderboard() {
  const models = visibleModels();
  document.querySelector('#rank-count').textContent = models.length;
  renderRankChart(models);
  renderLeaderTable(models);
  document.querySelector('.chart-surface .surface-title-row h3').textContent = `${metricMeta[state.rankMetric]?.label || 'PerfScore'} core field`;
}

function renderRankChart(models) {
  const root = document.querySelector('#rank-chart');
  if (!models.length) { root.innerHTML = ''; return; }
  const width = 1080;
  const height = 330;
  const left = 52;
  const right = 18;
  const top = 42;
  const baseline = 236;
  const values = models.map(model => modelMetric(model, state.rankMetric));
  const metric = metricMeta[state.rankMetric] || metricMeta.perf_score;
  const maximum = state.rankMetric === 'perf_score' || state.rankMetric === 'e2e_pass' ? 100 : niceMax(Math.max(...values));
  const step = (width - left - right) / Math.max(models.length, 1);
  const plotHeight = baseline - top;
  const y = value => baseline - (value / maximum) * plotHeight;
  const costMax = Math.max(...models.map(model => modelMetric(model, 'cost_efficiency')));
  const grid = [0, .25, .5, .75, 1].map(tick => {
    const tickY = y(maximum * tick);
    return `<path class="rank-field-rail" d="M${left} ${tickY}H${width - right}"/><rect class="rank-field-node" x="${left - 3}" y="${tickY - 3}" width="6" height="6"/><text class="chart-tick" x="${left - 11}" y="${tickY + 3}" text-anchor="end">${formatNumber(maximum * tick, metric.decimals > 0 && maximum < 100 ? 1 : 0)}</text>`;
  }).join('');
  const circuit = models.slice(0, -1).map((model, index) => {
    const x1 = left + step * index + step / 2;
    const x2 = left + step * (index + 1) + step / 2;
    const mid = (x1 + x2) / 2;
    return `<path class="rank-circuit" d="M${x1} ${baseline + 2}H${mid - 8}l8 8 8-8H${x2}"/>`;
  }).join('');
  const cores = models.map((model, index) => {
    const x = left + step * index + step / 2;
    const value = values[index];
    const topY = y(value);
    const e2eEnd = -220 + model.overall.e2e_pass / 100 * 280;
    const costEnd = -220 + (modelMetric(model, 'cost_efficiency') / costMax) * 280;
    const shortName = model.name.replace('Claude ', '').replace('Gemini ', '').replace('DeepSeek ', 'DS ').replace('GPT-', 'GPT ');
    const tooltip = `<strong>#${index + 1} · ${model.name}</strong><br>${metric.label}: <span class=&quot;tooltip-value&quot;>${formatMetric(value, state.rankMetric, false)}</span><br>E2E Pass: ${model.overall.e2e_pass.toFixed(1)}% · Gain/$: ${modelMetric(model, 'cost_efficiency').toFixed(1)}`;
    return `<g class="rank-core" data-model-id="${model.id}" data-open-drawer data-tooltip-html="${attributeEscape(tooltip)}">
      <path class="rank-lane" d="M${x} ${baseline}V${topY + 38}" stroke="${model.color}"/>
      <circle class="rank-lane-node" cx="${x}" cy="${baseline}" r="3" fill="${model.color}"/>
      <circle class="core-orbit core-orbit-base" cx="${x}" cy="${topY}" r="35"/>
      <path class="core-orbit core-orbit-cost" d="${svgArcPath(x, topY, 35, -220, costEnd)}" stroke="var(--cost)"/>
      <circle class="core-orbit core-orbit-base" cx="${x}" cy="${topY}" r="29"/>
      <path class="core-orbit" d="${svgArcPath(x, topY, 29, -220, e2eEnd)}" stroke="${model.color}"/>
      <circle cx="${x}" cy="${topY}" r="22" fill="#fff" stroke="color-mix(in srgb, ${model.color} 35%, #d6d6cf)"/>
      <image href="${vendorLogoPath(model)}" x="${x - 11}" y="${topY - 11}" width="22" height="22" preserveAspectRatio="xMidYMid meet"/>
      <text class="rank-value" x="${x}" y="${topY - 46}" text-anchor="middle">${formatMetric(value, state.rankMetric, false)}</text>
      <text class="chart-label" x="${x}" y="${baseline + 44}" text-anchor="middle">${escapeHTML(shortName)}</text>
      <text class="chart-tick" x="${x}" y="${baseline + 60}" text-anchor="middle">CORE ${String(index + 1).padStart(2, '0')}</text>
    </g>`;
  }).join('');
  root.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.label} ranking for ${models.length} models">
    <defs><filter id="core-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${grid}${circuit}<line class="chart-axis" x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}"/>
    <text class="chart-tick" x="${left}" y="17">${metric.label}${metric.unit ? ` (${metric.unit})` : ''} · CORE POSITION = VALUE · INNER ORBIT = E2E · OUTER ORBIT = GAIN/$</text>${cores}
  </svg>`;
}

function renderLeaderTable(models) {
  const tbody = document.querySelector('#leader-table tbody');
  tbody.innerHTML = models.map((model, index) => `<tr data-model-id="${model.id}" data-open-drawer tabindex="0">
    <td><span class="rank-badge ${index < 3 ? 'top' : ''}">${index + 1}</span></td>
    <td>${modelLabel(model, 'sm')}</td>
    <td class="score-cell">${model.overall.perf_score.toFixed(1)}</td>
    <td>${model.overall.e2e_pass.toFixed(1)}%</td>
    <td>${signed(model.overall.perf_gain_median)}%</td>
    <td>${model.overall.task_duration_median_us.toFixed(1)} µs</td>
    <td>${formatInteger(model.overall.tokens_total_k)}k</td>
    <td>$${model.overall.api_cost_usd.toFixed(2)}</td>
    <td>${sparkline(model)}</td>
  </tr>`).join('');

  document.querySelector('#leader-cards').innerHTML = models.map((model, index) => `<article class="leader-card" data-model-id="${model.id}" data-open-drawer tabindex="0">
    <div class="leader-card-head"><div class="model-label"><span class="rank-badge ${index < 3 ? 'top' : ''}">${index + 1}</span>${modelLabel(model, 'sm')}</div><div class="leader-card-score">${model.overall.perf_score.toFixed(1)}<small>PerfScore</small></div></div>
    <div class="leader-card-grid"><div><span>E2E pass</span><b>${model.overall.e2e_pass.toFixed(1)}%</b></div><div><span>Perf gain</span><b>${signed(model.overall.perf_gain_median)}%</b></div><div><span>API cost</span><b>$${model.overall.api_cost_usd.toFixed(2)}</b></div></div>
  </article>`).join('');
}

function sparkline(model, operatorName = 'FlashAttention') {
  const operator = model.per_operator.find(item => item.operator === operatorName) || model.per_operator[0];
  const points = operator.trajectories;
  const width = 92;
  const height = 26;
  const max = Math.max(...points.map(point => point.perf_gain), 1);
  const min = Math.min(...points.map(point => point.perf_gain), 0);
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 0 : index / (points.length - 1) * width;
    const y = height - 3 - ((point.perf_gain - min) / Math.max(max - min, 1)) * (height - 6);
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="Performance gain by optimization round"><line x1="0" y1="${height - 2}" x2="${width}" y2="${height - 2}" stroke="var(--border)"/><path d="${path}" fill="none" stroke="${model.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${width}" cy="${path.split(',').at(-1)}" r="2.5" fill="${model.color}"/></svg>`;
}

function renderScatter() {
  const models = visibleModels();
  const root = document.querySelector('#scatter-chart');
  const width = 1120;
  const height = 510;
  const margin = { top: 48, right: 78, bottom: 66, left: 74 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const costMode = state.scatterX === 'cost';
  const xValue = model => costMode ? model.overall.api_cost_usd : model.overall.tokens_total_k * 1000;
  const xDomain = costMode ? [.01, 100] : [100000, 10000000];
  const xTicks = costMode ? [.01, .1, 1, 10, 100] : [100000, 1000000, 10000000];
  const yDomain = [0, 50];
  const x = value => margin.left + ((Math.log10(value) - Math.log10(xDomain[0])) / (Math.log10(xDomain[1]) - Math.log10(xDomain[0]))) * plotW;
  const y = value => margin.top + plotH - ((value - yDomain[0]) / (yDomain[1] - yDomain[0])) * plotH;

  const frontier = [...models].sort((a, b) => xValue(a) - xValue(b)).filter((model, index, array) => {
    const cheaper = array.slice(0, index);
    return !cheaper.some(other => other.overall.perf_gain_median >= model.overall.perf_gain_median);
  });
  const frontierPath = frontier.map((model, index) => `${index ? 'L' : 'M'}${x(xValue(model)).toFixed(1)},${y(model.overall.perf_gain_median).toFixed(1)}`).join(' ');
  const verticals = xTicks.map(tick => `<line class="constellation-tick" x1="${x(tick)}" y1="${height - margin.bottom - 8}" x2="${x(tick)}" y2="${height - margin.bottom + 8}"/><text class="chart-tick" x="${x(tick)}" y="${height - margin.bottom + 25}" text-anchor="middle">${costMode ? `$${formatLogTick(tick)}` : formatTokenTick(tick)}</text>`).join('');
  const horizontals = [0, 10, 20, 30, 40, 50].map(tick => `<line class="constellation-tick" x1="${margin.left - 7}" y1="${y(tick)}" x2="${margin.left + 7}" y2="${y(tick)}"/><text class="chart-tick" x="${margin.left - 12}" y="${y(tick) + 3}" text-anchor="end">${tick}%</text>`).join('');
  const contours = [0, 1, 2, 3].map(index => {
    const startY = y(6 + index * 9);
    const endY = y(31 + index * 5);
    return `<path class="efficiency-contour" d="M${margin.left} ${startY}C${margin.left + plotW * .34} ${startY - 34},${margin.left + plotW * .64} ${endY + 30},${width - margin.right} ${endY}"/><text class="contour-label" x="${width - margin.right - 4}" y="${endY - 7}" text-anchor="end">E${index + 1}</text>`;
  }).join('');

  const points = models.map(model => {
    const px = x(xValue(model));
    const py = y(model.overall.perf_gain_median);
    const isFrontier = frontier.includes(model);
    const tooltip = tooltipModel(model);
    const labelY = isFrontier ? -42 : 43;
    return `<g class="scatter-point" transform="translate(${px} ${py})" data-model-id="${model.id}" data-open-drawer data-tooltip-html="${attributeEscape(tooltip)}">
      <circle class="constellation-halo" r="35" fill="color-mix(in srgb, ${model.color} 7%, transparent)" stroke="color-mix(in srgb, ${model.color} 32%, transparent)"/>
      <path class="constellation-orbit" d="${svgArcPath(0, 0, 29, -210, 60)}" stroke="${model.color}"/>
      <circle r="22" fill="#fff" stroke="${model.color}" stroke-width="2.5"/>
      <image href="${vendorLogoPath(model)}" x="-11" y="-11" width="22" height="22" preserveAspectRatio="xMidYMid meet"/>
      <line x1="0" y1="${isFrontier ? -27 : 27}" x2="0" y2="${isFrontier ? -35 : 35}" stroke="${model.color}"/>
      <text class="scatter-label" x="0" y="${labelY}" text-anchor="middle">${escapeHTML(model.name)}</text>
    </g>`;
  }).join('');
  root.closest('.component-surface').querySelector('h3').textContent = `Pareto constellation · gain vs ${costMode ? 'API cost' : 'tokens'}`;
  root.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Performance gain versus ${costMode ? 'API cost' : 'token consumption'} on a logarithmic x axis">
    <defs><filter id="signal-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>
    ${contours}${verticals}${horizontals}
    <line class="chart-axis" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"/>
    <line class="chart-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"/>
    ${frontierPath ? `<path class="pareto-glow" d="${frontierPath}"/><path class="pareto-line" d="${frontierPath}"/>` : ''}
    ${points}
    <text class="chart-tick" x="${margin.left}" y="20">PERFORMANCE GAIN (%) · HIGHER IS BETTER</text>
    <text class="chart-tick" x="${margin.left + plotW / 2}" y="${height - 14}" text-anchor="middle">${costMode ? 'TOTAL API COST (USD) · LOG SCALE' : 'TOTAL TOKENS · LOG SCALE'}</text>
    <text class="chart-tick" x="${width - margin.right}" y="${height - 14}" text-anchor="end">LOWER IS BETTER ←</text>
  </svg>`;
}

function renderRubric() {
  const models = visibleModels();
  const columns = [
    { key: 'compile_pass', label: 'Compile %', definition: 'Fraction of generated kernels that compile.' },
    { key: 'e2e_pass', label: 'E2E %', definition: 'Fraction passing functional and numerical tests.' },
    { key: 'perf_gain_median', label: 'Perf Gain %', definition: 'Final speedup over baseline.' },
    { key: 'rounds_median', label: 'Rounds', definition: 'Iterations to the best result; lower is better.' },
    { key: 'tokens_total_k', label: 'Tokens (k)', definition: 'Total language-model tokens; lower is better.' },
    { key: 'profiling_runs_median', label: 'Profiling Runs', definition: 'On-device profiler collections; lower is better.' },
    { key: 'tool_call_acc', label: 'Tool-Call %', definition: 'Tool calls with valid arguments that succeed.' },
    { key: 'perf_score', label: 'PerfScore', definition: 'Weighted correctness, gain and cost-efficiency blend.' }
  ];
  const ranges = Object.fromEntries(columns.map(column => {
    const values = models.map(model => model.overall[column.key]);
    return [column.key, [Math.min(...values), Math.max(...values)]];
  }));
  const root = document.querySelector('#rubric-table');
  if (!models.length) { root.innerHTML = ''; return; }
  root.innerHTML = `<table class="rubric-table"><caption class="sr-only">Color-coded model rubric</caption><thead><tr><th>Model</th>${columns.map(column => `<th>${column.label}<button class="metric-help" type="button" aria-label="${attributeEscape(column.definition)}" data-tooltip-html="${attributeEscape(`<strong>${column.label}</strong><br>${column.definition}`)}">?</button></th>`).join('')}</tr></thead><tbody>
    ${models.map(model => `<tr data-model-id="${model.id}" data-open-drawer><td>${modelLabel(model, 'sm')}</td>${columns.map(column => {
      const value = model.overall[column.key];
      const [min, max] = ranges[column.key];
      const meta = metricMeta[column.key];
      let quality = max === min ? .5 : (value - min) / (max - min);
      if (meta.direction === 'down') quality = 1 - quality;
      const litSegments = Math.max(1, Math.round(quality * 5));
      const signal = Array.from({ length: 5 }, (_, index) => `<i class="${index < litSegments ? 'is-on' : ''}"></i>`).join('');
      return `<td><span class="rubric-signal ${column.key === 'perf_score' ? 'rubric-score' : ''}" style="--quality-color:${qualityColor(quality)}"><span class="rubric-bars" aria-hidden="true">${signal}</span><b>${formatMetric(value, column.key, false)}</b></span></td>`;
    }).join('')}</tr>`).join('')}
  </tbody></table>`;
}

function renderHeatmap() {
  const models = visibleModels();
  const { operators } = state.data.meta;
  const meta = processMeta[state.heatMetric];
  const values = models.flatMap(model => model.per_operator.map(item => item[state.heatMetric]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const root = document.querySelector('#process-heatmap');
  if (!models.length) { root.innerHTML = ''; return; }
  root.innerHTML = `<div class="heatmap" role="grid" aria-label="${meta.label} by model and operator">
    <div class="heat-head"><span style="transform:none;left:0;bottom:3px">MODEL / OPERATOR</span></div>
    ${operators.map(operator => `<div class="heat-head" role="columnheader" data-operator="${operator}"><span>${operator}</span></div>`).join('')}
    ${models.map(model => `<div class="heat-row-label" role="rowheader" data-model-id="${model.id}" data-open-drawer>${vendorChip(model, 'sm')}<span>${escapeHTML(model.name)}</span></div>${operators.map(operatorName => {
      const item = model.per_operator.find(operator => operator.operator === operatorName);
      const value = item[state.heatMetric];
      const quality = max === min ? .5 : 1 - (value - min) / (max - min);
      const tooltip = `<strong>${model.name} · ${operatorName}</strong><br>${meta.label}: <span class=&quot;tooltip-value&quot;>${formatNumber(value, state.heatMetric === 'wall_time_s' ? 0 : state.heatMetric === 'tokens_k' ? 0 : 0)} ${meta.unit}</span><br><small>Lower is better</small>`;
      return `<div class="heat-cell" role="gridcell" data-model-id="${model.id}" data-operator="${operatorName}" style="--heat-color:${qualityColor(quality)};--heat-level:${quality.toFixed(3)}" data-tooltip-html="${attributeEscape(tooltip)}"><span class="heat-value">${formatInteger(value)}<span class="heat-unit">${meta.shortUnit}</span></span></div>`;
    }).join('')}`).join('')}
  </div>`;
}

function renderGainViews() {
  renderGainChart();
  renderBestByOperator();
}

function renderGainChart() {
  const model = state.data.models.find(item => item.id === state.gainModel) || state.data.models[0];
  document.querySelector('#gain-model-caption').textContent = `${model.vendor} · ${model.weights} weights`;
  const width = 720;
  const height = 420;
  const margin = { top: 14, right: 55, bottom: 38, left: 138 };
  const plotW = width - margin.left - margin.right;
  const xDomain = [-10, 70];
  const x = value => margin.left + ((value - xDomain[0]) / (xDomain[1] - xDomain[0])) * plotW;
  const zero = x(0);
  const rowH = (height - margin.top - margin.bottom) / model.per_operator.length;
  const ticks = [-10, 0, 20, 40, 60].map(tick => `<line class="${tick === 0 ? 'impulse-zero' : 'impulse-tick'}" x1="${x(tick)}" y1="${margin.top}" x2="${x(tick)}" y2="${height - margin.bottom}"/><text class="chart-tick" x="${x(tick)}" y="${height - 14}" text-anchor="middle">${tick}%</text>`).join('');
  const traces = model.per_operator.map((item, index) => {
    const cy = margin.top + rowH * index + rowH / 2;
    const valueX = x(item.perf_gain);
    const color = item.perf_gain >= 0 ? 'var(--compute)' : 'var(--danger)';
    const direction = item.perf_gain >= 0 ? 1 : -1;
    const mid = (zero + valueX) / 2;
    const pulseNodes = [.25, .5, .75].map((ratio, nodeIndex) => `<circle class="impulse-node" cx="${zero + (valueX - zero) * ratio}" cy="${cy + (nodeIndex % 2 ? 3 : -3)}" r="${nodeIndex === 1 ? 2.5 : 1.7}" fill="${color}"/>`).join('');
    const arrow = `${valueX},${cy} ${valueX - direction * 8},${cy - 5} ${valueX - direction * 6},${cy} ${valueX - direction * 8},${cy + 5}`;
    return `<g class="impulse-row" data-model-id="${model.id}" data-tooltip-html="${attributeEscape(`<strong>${model.name} · ${item.operator}</strong><br>Performance Gain: <span class=&quot;tooltip-value&quot;>${signed(item.perf_gain)}%</span>`)}">
      <text class="chart-label" x="${margin.left - 12}" y="${cy + 3}" text-anchor="end">${item.operator}</text>
      <line class="impulse-rail" x1="${x(xDomain[0])}" y1="${cy}" x2="${x(xDomain[1])}" y2="${cy}"/>
      <path class="impulse-trace" d="M${zero} ${cy}C${mid} ${cy - 9 * direction},${mid} ${cy + 9 * direction},${valueX} ${cy}" stroke="${color}"/>
      ${pulseNodes}<polyline class="impulse-arrow" points="${arrow}" stroke="${color}"/>
      <text class="chart-data" x="${item.perf_gain >= 0 ? valueX + 12 : valueX - 12}" y="${cy + 3}" text-anchor="${item.perf_gain >= 0 ? 'start' : 'end'}">${signed(item.perf_gain)}%</text>
    </g>`;
  }).join('');
  document.querySelector('#gain-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Performance gain signal vectors by operator for ${escapeHTML(model.name)}">${ticks}${traces}<text class="chart-tick" x="${margin.left}" y="10">GAIN VECTOR · PULSE DIRECTION FROM BASELINE</text></svg>`;
}

function renderBestByOperator() {
  const models = visibleModels().length ? visibleModels() : state.data.models;
  document.querySelector('#best-by-operator').innerHTML = `<div class="best-list">${state.data.meta.operators.map(operatorName => {
    const winner = models.map(model => ({ model, item: model.per_operator.find(item => item.operator === operatorName) })).sort((a, b) => b.item.perf_gain - a.item.perf_gain)[0];
    return `<div class="best-row" data-model-id="${winner.model.id}" data-open-drawer><span>${operatorName}</span>${modelLabel(winner.model, 'sm')}<span class="data-value">${signed(winner.item.perf_gain)}%</span></div>`;
  }).join('')}</div>`;
}

function renderDurationViews() {
  renderDurationMatrix();
  renderDurationBars();
}

function selectedDurationData() {
  const model = state.data.models.find(item => item.id === state.durationModel) || state.data.models[0];
  const operator = model.per_operator.find(item => item.operator === state.durationOperator) || model.per_operator[0];
  return { model, operator };
}

function renderDurationMatrix() {
  const { model, operator } = selectedDurationData();
  const values = state.data.meta.dtypes.flatMap(dtype => state.data.meta.chips.map(chip => operator.duration_by_dtype_chip[dtype][chip]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  document.querySelector('#duration-matrix').innerHTML = `<div class="duration-matrix" role="grid" aria-label="Task duration by dtype and Ascend chip for ${escapeHTML(operator.operator)}"><div></div>${state.data.meta.chips.map(chip => `<div class="matrix-head" role="columnheader">${chip}</div>`).join('')}${state.data.meta.dtypes.map(dtype => `<div class="matrix-row-head" role="rowheader">${dtype}</div>${state.data.meta.chips.map(chip => {
    const value = operator.duration_by_dtype_chip[dtype][chip];
    const quality = max === min ? .5 : 1 - (value - min) / (max - min);
    return `<div class="matrix-cell" role="gridcell" style="--dial-color:${qualityColor(quality)}" data-tooltip-html="${attributeEscape(`<strong>${model.name} · ${operator.operator}</strong><br>${dtype} · ${chip}<br>Task Duration: <span class=&quot;tooltip-value&quot;>${value.toFixed(1)} µs</span>`)}"><svg class="timing-dial" viewBox="0 0 44 44" aria-hidden="true"><circle class="timing-dial-base" cx="22" cy="22" r="17"/><circle class="timing-dial-signal" cx="22" cy="22" r="17" pathLength="100" stroke-dasharray="${Math.max(6, quality * 100).toFixed(1)} 100"/></svg><span class="matrix-value">${value.toFixed(1)}<small>µs</small></span><span class="timing-index">T${String(Math.round((1 - quality) * 9)).padStart(2, '0')}</span></div>`;
  }).join('')}`).join('')}</div>`;
}

function renderDurationBars() {
  const { model, operator } = selectedDurationData();
  const width = 760;
  const height = 360;
  const margin = { top: 34, right: 68, bottom: 42, left: 142 };
  const dtypes = state.data.meta.dtypes;
  const chips = state.data.meta.chips;
  const raw = dtypes.flatMap(dtype => chips.map(chip => operator.duration_by_dtype_chip[dtype][chip]));
  const fastest = Math.min(...raw);
  const values = state.durationView === 'absolute' ? raw : raw.map(value => value / fastest);
  const max = niceMax(Math.max(...values));
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const rowH = plotH / (chips.length * dtypes.length);
  const x = value => margin.left + value / max * plotW;
  const colors = ['#67E8D2', '#6CBFFF', '#CBA6FF', '#FFB86C'];
  const axis = [0, .25, .5, .75, 1].map(tick => `<circle class="rail-scale-node" cx="${x(max * tick)}" cy="${height - margin.bottom + 3}" r="2.5"/><text class="chart-tick" x="${x(max * tick)}" y="${height - 14}" text-anchor="middle">${formatNumber(max * tick, state.durationView === 'absolute' ? 0 : 1)}${state.durationView === 'absolute' ? '' : '×'}</text>`).join('');
  const rails = chips.map((chip, chipIndex) => dtypes.map((dtype, dtypeIndex) => {
    const rawValue = operator.duration_by_dtype_chip[dtype][chip];
    const value = state.durationView === 'absolute' ? rawValue : rawValue / fastest;
    const rowIndex = chipIndex * dtypes.length + dtypeIndex;
    const cy = margin.top + rowH * rowIndex + rowH / 2;
    const valueX = x(value);
    const nodes = [.25, .5, .75].map(ratio => `<circle class="duration-pulse" cx="${margin.left + (valueX - margin.left) * ratio}" cy="${cy}" r="1.6" fill="${colors[dtypeIndex]}"/>`).join('');
    return `<g class="duration-rail" data-tooltip-html="${attributeEscape(`<strong>${model.name} · ${operator.operator}</strong><br>${dtype} · ${chip}<br>Task Duration: <span class=&quot;tooltip-value&quot;>${rawValue.toFixed(1)} µs</span>`)}"><text class="chart-label" x="${margin.left - 12}" y="${cy + 3}" text-anchor="end">${dtype}</text><line class="duration-rail-base" x1="${margin.left}" y1="${cy}" x2="${width - margin.right}" y2="${cy}"/><line class="duration-rail-signal" x1="${margin.left}" y1="${cy}" x2="${valueX}" y2="${cy}" stroke="${colors[dtypeIndex]}"/>${nodes}<circle class="duration-bead" cx="${valueX}" cy="${cy}" r="6" fill="#fff" stroke="${colors[dtypeIndex]}"/><circle cx="${valueX}" cy="${cy}" r="2.3" fill="${colors[dtypeIndex]}"/><text class="chart-data" x="${valueX + 11}" y="${cy + 3}">${formatNumber(value, state.durationView === 'absolute' ? 1 : 2)}${state.durationView === 'absolute' ? '' : '×'}</text></g>`;
  }).join('')).join('');
  const chipLabels = chips.map((chip, chipIndex) => {
    const groupCenter = margin.top + rowH * (chipIndex * dtypes.length + dtypes.length / 2);
    const separatorY = margin.top + rowH * chipIndex * dtypes.length;
    return `${chipIndex ? `<line class="chip-rail-separator" x1="12" y1="${separatorY}" x2="${width - margin.right}" y2="${separatorY}"/>` : ''}<text class="chip-rail-label" x="14" y="${groupCenter - 2}">${chip.replace('Ascend ', '')}</text><text class="chart-tick" x="14" y="${groupCenter + 12}">ASCEND</text>`;
  }).join('');
  document.querySelector('#duration-bars').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Task duration race tracks by chip and dtype"><text class="chart-tick" x="${margin.left}" y="15">TIMING RACE TRACK · ENDPOINT = DURATION</text>${chipLabels}${rails}<line class="chart-axis" x1="${margin.left}" y1="${height - margin.bottom + 3}" x2="${width - margin.right}" y2="${height - margin.bottom + 3}"/>${axis}</svg>`;
}

function renderUtilization() {
  renderRadar();
  renderUtilBars();
}

function utilSelection() {
  const models = visibleModels().length ? visibleModels() : state.data.models;
  return models.slice(0, 3).map(model => ({ model, operator: model.per_operator.find(item => item.operator === state.utilOperator) || model.per_operator[0] }));
}

function renderRadar() {
  const selected = utilSelection();
  const width = 520;
  const height = 360;
  const center = { x: 260, y: 165 };
  const radii = [72, 96, 120];
  const sectorStart = index => -112 + index * 72;
  const sectorSweep = 56;
  const baseArcs = selected.map((_, modelIndex) => utilizationKeys.map((metric, metricIndex) => `<path class="fingerprint-base" d="${svgArcPath(center.x, center.y, radii[modelIndex], sectorStart(metricIndex), sectorStart(metricIndex) + sectorSweep)}"/>`).join('')).join('');
  const signalArcs = selected.map(({ model, operator }, modelIndex) => utilizationKeys.map((metric, metricIndex) => {
    const value = operator.utilization[metric.key];
    const start = sectorStart(metricIndex);
    const end = start + sectorSweep * value / 100;
    const [dotX, dotY] = svgPolarPoint(center.x, center.y, radii[modelIndex], end);
    return `<g data-model-id="${model.id}" data-open-drawer data-tooltip-html="${attributeEscape(`<strong>${model.name} · ${state.utilOperator}</strong><br>${metric.label}: <span class=&quot;tooltip-value&quot;>${value}%</span>`)}"><path class="fingerprint-signal" d="${svgArcPath(center.x, center.y, radii[modelIndex], start, end)}" stroke="${model.color}"/><circle class="fingerprint-node" cx="${dotX}" cy="${dotY}" r="3.4" fill="${model.color}"/></g>`;
  }).join('')).join('');
  const labels = utilizationKeys.map((metric, metricIndex) => {
    const [labelX, labelY] = svgPolarPoint(center.x, center.y, 148, sectorStart(metricIndex) + sectorSweep / 2);
    return `<text class="fingerprint-label" x="${labelX}" y="${labelY + 3}" text-anchor="middle">${metric.label}</text>`;
  }).join('');
  const legend = selected.map(({ model }) => `<span data-model-id="${model.id}" data-open-drawer>${vendorChip(model, 'sm')}<i style="background:${model.color}"></i>${escapeHTML(model.name)}</span>`).join('');
  document.querySelector('#radar-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="AI Core utilization signal fingerprint for ${escapeHTML(state.utilOperator)}">${baseArcs}${signalArcs}${labels}<circle class="fingerprint-core" cx="${center.x}" cy="${center.y}" r="42"/><image href="assets/logo/mark-primary.svg" x="${center.x - 22}" y="${center.y - 22}" width="44" height="44"/><text class="chart-tick" x="${center.x}" y="${center.y + 58}" text-anchor="middle">AI CORE SIGNAL</text></svg><div class="util-legend">${legend}</div>`;
}

function renderUtilBars() {
  const selected = utilSelection();
  const width = 650;
  const height = 350;
  const margin = { top: 42, right: 48, bottom: 20, left: 74 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const rowH = plotH / utilizationKeys.length;
  const x = value => margin.left + value / 100 * plotW;
  const scale = [0, 25, 50, 75, 100].map(tick => `<circle class="unit-scale-node" cx="${x(tick)}" cy="${margin.top - 13}" r="2"/><text class="chart-tick" x="${x(tick)}" y="${margin.top - 22}" text-anchor="middle">${tick}</text>`).join('');
  const lanes = utilizationKeys.map((metric, metricIndex) => {
    const cy = margin.top + rowH * metricIndex + rowH / 2;
    const beads = selected.map(({ model, operator }, modelIndex) => {
    const value = operator.utilization[metric.key];
      const beadY = cy + (modelIndex - (selected.length - 1) / 2) * 10;
      const beadX = x(value);
      return `<g data-model-id="${model.id}" data-open-drawer data-tooltip-html="${attributeEscape(`<strong>${model.name} · ${state.utilOperator}</strong><br>${metric.label}: <span class=&quot;tooltip-value&quot;>${value}%</span>`)}"><circle class="unit-bead-halo" cx="${beadX}" cy="${beadY}" r="10" fill="color-mix(in srgb, ${model.color} 13%, transparent)"/><circle class="unit-bead" cx="${beadX}" cy="${beadY}" r="6" fill="#fff" stroke="${model.color}"/><circle cx="${beadX}" cy="${beadY}" r="2.3" fill="${model.color}"/><text class="chart-data" x="${beadX + 11}" y="${beadY + 3}" style="font-size:7px">${value}</text></g>`;
    }).join('');
    const railNodes = [0, 25, 50, 75, 100].map(tick => `<circle class="unit-lane-node" cx="${x(tick)}" cy="${cy}" r="1.7"/>`).join('');
    return `<g><text class="chart-label" x="${margin.left - 14}" y="${cy + 3}" text-anchor="end">${metric.label}</text><line class="unit-lane" x1="${margin.left}" y1="${cy}" x2="${width - margin.right}" y2="${cy}"/>${railNodes}${beads}</g>`;
  }).join('');
  document.querySelector('#util-bars').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Exact hardware utilization signal lanes"><text class="chart-tick" x="${margin.left}" y="12">UTILIZATION UNIT LANES · %</text>${scale}${lanes}</svg>`;
}

function openDrawer(modelId) {
  const model = state.data.models.find(item => item.id === modelId);
  if (!model) return;
  state.drawerModel = modelId;
  const drawer = document.querySelector('#model-drawer');
  document.querySelector('#drawer-identity').innerHTML = modelLabel(model, 'lg');
  document.querySelector('#drawer-content').innerHTML = drawerContent(model);
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.querySelector('#drawer-close').focus();
}

function closeDrawer() {
  const drawer = document.querySelector('#model-drawer');
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  state.drawerModel = null;
  document.body.style.overflow = '';
}

function drawerContent(model) {
  const overall = model.overall;
  const stats = [
    ['PerfScore', overall.perf_score.toFixed(1)],
    ['E2E Pass Rate', `${overall.e2e_pass.toFixed(1)}%`],
    ['Performance Gain', `${signed(overall.perf_gain_median)}%`],
    ['Median Task Duration', `${overall.task_duration_median_us.toFixed(1)} µs`],
    ['Total Tokens', `${formatInteger(overall.tokens_total_k)}k`],
    ['Total API Cost', `$${overall.api_cost_usd.toFixed(2)}`]
  ];
  return `<div class="drawer-stats">${stats.map(([label, value]) => `<div class="drawer-stat"><span>${label}</span><b>${value}</b></div>`).join('')}</div>
    <section class="drawer-section"><h3>Per-operator results</h3><div class="table-wrap"><table class="drawer-op-table"><thead><tr><th>Operator</th><th>Gain</th><th>Duration</th><th>Rounds</th><th>Trajectory</th></tr></thead><tbody>${model.per_operator.map(item => `<tr><td>${item.operator}</td><td>${signed(item.perf_gain)}%</td><td>${item.best_task_duration_us.toFixed(1)} µs</td><td>${item.rounds}</td><td>${sparkline(model, item.operator)}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="drawer-section"><h3>Representative AscendC kernel · illustrative</h3><pre class="drawer-code"><code><span class="code-keyword">extern</span> <span class="code-string">"C"</span> __global__ __aicore__
<span class="code-type">void</span> rms_norm(GM_ADDR x, GM_ADDR weight, GM_ADDR out) {
  <span class="code-comment">// Tile vector work and overlap data movement.</span>
  <span class="code-type">TPipe</span> pipe;
  <span class="code-type">TQue</span>&lt;QuePosition::VECIN, <span class="code-number">2</span>&gt; inQueue;
  <span class="code-type">TQue</span>&lt;QuePosition::VECOUT, <span class="code-number">2</span>&gt; outQueue;
  pipe.InitBuffer(inQueue, <span class="code-number">2</span>, TILE_BYTES);
  pipe.InitBuffer(outQueue, <span class="code-number">2</span>, TILE_BYTES);
  CopyIn(); Compute(); CopyOut();
}</code></pre></section>
    <section class="drawer-section"><h3>Tool-call summary</h3><div class="tool-summary"><div><span>Accuracy</span><b>${overall.tool_call_acc.toFixed(1)}%</b></div><div><span>Median calls</span><b>${overall.profiling_runs_median * 4 + overall.rounds_median}</b></div><div><span>Common failure</span><b style="font-family:var(--font-sans);font-size:10px">shape mismatch</b></div></div></section>`;
}

function modelLabel(model, size = 'sm') {
  return `<span class="model-label"><span class="vendor-chip" data-size="${size}" style="--model-color:${model.color}"><img src="${vendorLogoPath(model)}" alt="" loading="eager"></span><span class="model-text"><strong>${escapeHTML(model.name)}<span class="weight-tag">${escapeHTML(model.weights)}</span></strong><small>${escapeHTML(model.vendor)}</small></span></span>`;
}

function vendorChip(model, size = 'sm') {
  return `<span class="vendor-chip" data-size="${size}" style="--model-color:${model.color}"><img src="${vendorLogoPath(model)}" alt="${escapeHTML(model.vendor)} logo" loading="eager"></span>`;
}

function vendorLogoPath(model) {
  return `assets/vendors/${vendorAssetMap[model.vendor] || 'openai.svg'}`;
}

function svgPolarPoint(cx, cy, radius, angleDegrees) {
  const angle = (angleDegrees - 90) * Math.PI / 180;
  return [(cx + radius * Math.cos(angle)).toFixed(2), (cy + radius * Math.sin(angle)).toFixed(2)];
}

function svgArcPath(cx, cy, radius, startAngle, endAngle) {
  const start = svgPolarPoint(cx, cy, radius, endAngle);
  const end = svgPolarPoint(cx, cy, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? 0 : 1;
  return `M${start[0]} ${start[1]}A${radius} ${radius} 0 ${largeArcFlag} 0 ${end[0]} ${end[1]}`;
}

function tooltipModel(model) {
  return `<div class=&quot;tooltip-title&quot;>${vendorChip(model, 'sm')}<span>${model.name}</span></div><div class=&quot;tooltip-grid&quot;><span>PerfScore</span><span class=&quot;tooltip-value&quot;>${model.overall.perf_score.toFixed(1)}</span><span>Performance Gain</span><span class=&quot;tooltip-value&quot;>${signed(model.overall.perf_gain_median)}%</span><span>Total API Cost</span><span class=&quot;tooltip-value&quot;>$${model.overall.api_cost_usd.toFixed(2)}</span><span>Total Tokens</span><span class=&quot;tooltip-value&quot;>${formatInteger(model.overall.tokens_total_k)}k</span></div>`;
}

function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  root.dataset.theme = next;
  document.querySelector('#theme-toggle').setAttribute('aria-label', `Switch to ${next === 'light' ? 'deep-terminal' : 'graphite-terminal'} color profile`);
}

function focusSearch() {
  document.querySelector('#leaderboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => document.querySelector('#model-search').focus(), 220);
}

async function copyText(text, confirmation) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  showToast(confirmation);
}

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1800);
}

function showTooltip(html, clientX, clientY) {
  const tooltip = document.querySelector('#data-tooltip');
  tooltip.innerHTML = html;
  tooltip.classList.add('is-visible');
  tooltip.setAttribute('aria-hidden', 'false');
  const width = tooltip.offsetWidth || 250;
  const height = tooltip.offsetHeight || 120;
  const x = Math.min(clientX + 14, window.innerWidth - width - 12);
  const y = Math.min(clientY + 14, window.innerHeight - height - 12);
  tooltip.style.left = `${Math.max(10, x)}px`;
  tooltip.style.top = `${Math.max(10, y)}px`;
}

function hideTooltip() {
  const tooltip = document.querySelector('#data-tooltip');
  tooltip.classList.remove('is-visible');
  tooltip.setAttribute('aria-hidden', 'true');
}

function qualityColor(quality) {
  const bad = '#5A2D38';
  const neutral = '#27343E';
  const good = '#164B45';
  if (quality <= .5) return mixHex(bad, neutral, quality * 2);
  return mixHex(neutral, good, (quality - .5) * 2);
}

function mixHex(a, b, amount) {
  const parse = hex => hex.match(/[a-f\d]{2}/gi).map(value => Number.parseInt(value, 16));
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (from, to) => Math.round(from + (to - from) * amount).toString(16).padStart(2, '0');
  return `#${channel(ar, br)}${channel(ag, bg)}${channel(ab, bb)}`;
}

function niceMax(value) {
  if (value <= 10) return Math.ceil(value / 2) * 2;
  if (value <= 100) return Math.ceil(value / 10) * 10;
  if (value <= 1000) return Math.ceil(value / 100) * 100;
  return Math.ceil(value / 1000) * 1000;
}

function signed(value) { return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`; }
function formatInteger(value) { return Math.round(value).toLocaleString('en-US'); }
function formatNumber(value, decimals = 1) { return Number(value).toFixed(decimals); }
function formatLogTick(value) { return value < 1 ? value.toString() : formatInteger(value); }
function formatTokenTick(value) { return value >= 1000000 ? `${value / 1000000}M` : `${value / 1000}k`; }
function formatMetric(value, key, withUnit = true) {
  const meta = metricMeta[key] || { decimals: 1, unit: '' };
  const prefix = key === 'api_cost_usd' ? '$' : '';
  const suffix = withUnit && meta.unit ? ` ${meta.unit}` : (meta.unit === '%' ? '%' : '');
  return `${prefix}${Number(value).toFixed(meta.decimals)}${suffix}`;
}
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }
function attributeEscape(value) { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
