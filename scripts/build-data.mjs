import { writeFile } from 'node:fs/promises';

const operators = [
  { name: 'MatMul', bound: 'compute', factor: 1.08 },
  { name: 'FlashAttention', bound: 'mixed', factor: 1.23 },
  { name: 'RMSNorm', bound: 'memory', factor: 0.72 },
  { name: 'Softmax', bound: 'vector', factor: 0.82 },
  { name: 'RoPE', bound: 'vector', factor: 0.66 },
  { name: 'SwiGLU', bound: 'mixed', factor: 0.94 },
  { name: 'LayerNorm', bound: 'memory', factor: 0.78 },
  { name: 'Transpose', bound: 'memory', factor: 0.58 },
  { name: 'GroupedMatMul', bound: 'compute', factor: 1.34 },
  { name: 'Add', bound: 'memory', factor: 0.44 }
];

const modelSeeds = [
  { id: 'gpt-5-6-sol', name: 'GPT-5.6 Sol', vendor: 'OpenAI', vendorMark: 'OA', family: 'GPT-5.6', weights: 'closed', color: '#67E8D2', perf_score: 87.4, compile_pass: 96.0, e2e_pass: 91.2, perf_gain_median: 41.5, task_duration_median_us: 58.3, tokens_total_k: 812, api_cost_usd: 14.90, rounds_median: 6, wall_time_median_s: 210, profiling_runs_median: 5, tool_call_acc: 97.1 },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', vendor: 'Anthropic', vendorMark: 'A', family: 'Claude', weights: 'closed', color: '#FFB86C', perf_score: 85.9, compile_pass: 95.1, e2e_pass: 90.5, perf_gain_median: 39.8, task_duration_median_us: 60.1, tokens_total_k: 690, api_cost_usd: 11.20, rounds_median: 6, wall_time_median_s: 218, profiling_runs_median: 5, tool_call_acc: 96.4 },
  { id: 'gemini-3-1-pro', name: 'Gemini 3.1 Pro', vendor: 'Google', vendorMark: 'G', family: 'Gemini', weights: 'closed', color: '#6CBFFF', perf_score: 83.2, compile_pass: 93.4, e2e_pass: 88.7, perf_gain_median: 37.0, task_duration_median_us: 63.4, tokens_total_k: 940, api_cost_usd: 9.80, rounds_median: 7, wall_time_median_s: 242, profiling_runs_median: 6, tool_call_acc: 95.0 },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4-Pro', vendor: 'DeepSeek', vendorMark: 'DS', family: 'DeepSeek', weights: 'open', color: '#CBA6FF', perf_score: 80.6, compile_pass: 91.2, e2e_pass: 86.0, perf_gain_median: 34.2, task_duration_median_us: 66.9, tokens_total_k: 1180, api_cost_usd: 4.30, rounds_median: 8, wall_time_median_s: 266, profiling_runs_median: 7, tool_call_acc: 93.8 },
  { id: 'qwen3-7-max', name: 'Qwen3.7-Max', vendor: 'Alibaba', vendorMark: 'Q', family: 'Qwen', weights: 'closed', color: '#F6D76B', perf_score: 78.1, compile_pass: 89.9, e2e_pass: 84.3, perf_gain_median: 31.5, task_duration_median_us: 69.2, tokens_total_k: 1050, api_cost_usd: 5.10, rounds_median: 8, wall_time_median_s: 279, profiling_runs_median: 7, tool_call_acc: 92.5 },
  { id: 'glm-5-2', name: 'GLM-5.2', vendor: 'Zhipu', vendorMark: 'Z', family: 'GLM', weights: 'open', color: '#7DD3FC', perf_score: 75.4, compile_pass: 88.1, e2e_pass: 82.1, perf_gain_median: 28.9, task_duration_median_us: 72.6, tokens_total_k: 1220, api_cost_usd: 3.90, rounds_median: 9, wall_time_median_s: 301, profiling_runs_median: 8, tool_call_acc: 90.7 },
  { id: 'kimi-k2-7', name: 'Kimi K2.7', vendor: 'Moonshot', vendorMark: 'K', family: 'Kimi', weights: 'open', color: '#FF79A8', perf_score: 72.0, compile_pass: 86.3, e2e_pass: 79.8, perf_gain_median: 25.4, task_duration_median_us: 76.0, tokens_total_k: 1310, api_cost_usd: 3.40, rounds_median: 10, wall_time_median_s: 328, profiling_runs_median: 9, tool_call_acc: 89.1 }
];

const round1 = value => Math.round(value * 10) / 10;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const dtypeFactor = { fp16: 1, bf16: 1.04, fp32: 1.78, int8: 0.67 };
const chipFactor = { 'Ascend 910B': 1.21, 'Ascend 910C': 1 };

const models = modelSeeds.map((seed, modelIndex) => {
  const per_operator = operators.map((operator, opIndex) => {
    const wave = Math.sin((modelIndex + 1) * (opIndex + 2) * 0.73) * 2.6;
    const harderPenalty = modelIndex * operator.factor * 0.9;
    let perfGain = seed.perf_gain_median + (operator.factor - 0.8) * 17 + wave - harderPenalty;
    if (modelIndex >= 5 && (opIndex === 1 || opIndex === 8)) perfGain -= 19;
    if (modelIndex === 6 && opIndex === 1) perfGain = -3.2;
    perfGain = round1(perfGain);

    const durationBase = seed.task_duration_median_us * operator.factor * (1 - perfGain / 320);
    const bestDuration = round1(Math.max(12, durationBase));
    const rounds = Math.max(3, Math.round(seed.rounds_median + (operator.factor - 0.8) * 2.4 + ((opIndex + modelIndex) % 3) - 1));
    const tokens = Math.round(seed.tokens_total_k / operators.length * (0.68 + operator.factor * 0.42) + ((opIndex * 7 + modelIndex * 11) % 17));
    const profilingRuns = Math.max(2, Math.round(seed.profiling_runs_median + (operator.factor - 0.8) * 2 + ((opIndex + modelIndex) % 2)));
    const wallTime = Math.round(seed.wall_time_median_s * (0.7 + operator.factor * 0.36) + opIndex * 3);

    const utilizationBase = operator.bound === 'compute'
      ? { aic: 82, aiv: 38, l2_bw: 57, hbm_bw: 48, overlap: 49 }
      : operator.bound === 'memory'
        ? { aic: 31, aiv: 52, l2_bw: 76, hbm_bw: 84, overlap: 35 }
        : operator.bound === 'vector'
          ? { aic: 23, aiv: 81, l2_bw: 66, hbm_bw: 58, overlap: 42 }
          : { aic: 72, aiv: 61, l2_bw: 65, hbm_bw: 69, overlap: 64 };
    const utilization = Object.fromEntries(Object.entries(utilizationBase).map(([key, value], utilIndex) => [
      key,
      Math.round(clamp(value - modelIndex * 1.8 + Math.sin(opIndex + utilIndex + modelIndex) * 4, 12, 96))
    ]));

    const duration_by_dtype_chip = Object.fromEntries(Object.entries(dtypeFactor).map(([dtype, factor]) => [
      dtype,
      Object.fromEntries(Object.entries(chipFactor).map(([chip, chipScale]) => [chip, round1(bestDuration * factor * chipScale)]))
    ]));

    const trajectories = [];
    let current = Math.max(-5, perfGain * 0.22);
    for (let round = 1; round <= rounds; round += 1) {
      const remaining = perfGain - current;
      current += remaining * (0.35 + ((round + opIndex) % 3) * 0.05);
      trajectories.push({ round, perf_gain: round1(round === rounds ? perfGain : current) });
    }

    return {
      operator: operator.name,
      bound: operator.bound,
      compile_pass: round1(clamp(seed.compile_pass - opIndex * 0.22 - modelIndex * 0.08, 70, 99)),
      e2e_pass: round1(clamp(seed.e2e_pass - opIndex * 0.31 - modelIndex * 0.1, 65, 98)),
      tokens_k: tokens,
      rounds,
      wall_time_s: wallTime,
      profiling_runs: profilingRuns,
      perf_gain: perfGain,
      best_task_duration_us: bestDuration,
      tool_call_acc: round1(clamp(seed.tool_call_acc - (opIndex % 4) * 0.55, 75, 99)),
      utilization,
      duration_by_dtype_chip,
      trajectories
    };
  });

  return {
    id: seed.id,
    name: seed.name,
    vendor: seed.vendor,
    vendor_mark: seed.vendorMark,
    family: seed.family,
    weights: seed.weights,
    color: seed.color,
    links: { model_card: '#', api: '#', report: '#' },
    overall: {
      perf_score: seed.perf_score,
      compile_pass: seed.compile_pass,
      e2e_pass: seed.e2e_pass,
      perf_gain_median: seed.perf_gain_median,
      task_duration_median_us: seed.task_duration_median_us,
      tokens_total_k: seed.tokens_total_k,
      api_cost_usd: seed.api_cost_usd,
      rounds_median: seed.rounds_median,
      wall_time_median_s: seed.wall_time_median_s,
      profiling_runs_median: seed.profiling_runs_median,
      tool_call_acc: seed.tool_call_acc
    },
    per_operator
  };
});

const data = {
  meta: {
    status: 'illustrative',
    updated: '2026-07-26',
    note: 'All model names and values are illustrative placeholders, not measured benchmark results.',
    models_evaluated: 7,
    operators: operators.map(operator => operator.name),
    chips: ['Ascend 910B', 'Ascend 910C'],
    dtypes: ['fp16', 'bf16', 'fp32', 'int8'],
    device_hours: 0,
    metric_directions: {
      compile_pass: 'up', e2e_pass: 'up', perf_gain: 'up', task_duration: 'down', rounds: 'down', wall_time: 'down', tokens: 'down', api_cost: 'down', profiling_runs: 'down', tool_call_acc: 'up', aic: 'context', aiv: 'context', l2_bw: 'context', hbm_bw: 'context', overlap: 'up'
    }
  },
  models
};

const output = new URL('../mock-data.json', import.meta.url);
await writeFile(output, `${JSON.stringify(data, null, 2)}\n`);
const scriptOutput = new URL('../mock-data.js', import.meta.url);
await writeFile(scriptOutput, `window.AURAKERNEL_MOCK_DATA = ${JSON.stringify(data)};\n`);
console.log(`Wrote ${output.pathname}`);
console.log(`Wrote ${scriptOutput.pathname}`);
