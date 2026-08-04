import {
  default as runLoadScenario,
  handleSummary as baseHandleSummary,
  options as baseOptions,
  setup,
} from '../../beban_pengguna/scripts/load-by-vu.k6.js';

// Wrapper configuration only. The HTTP flow and thresholds stay in the shared test.
export const options = {
  ...baseOptions,
  scenarios: {
    ...baseOptions.scenarios,
    load_by_vu: {
      ...baseOptions.scenarios.load_by_vu,
      vus: 10,
    },
  },
};

// setup_data contains transient bearer tokens and is not needed for analysis.
export function handleSummary(data) {
  const { setup_data, ...summaryWithoutCredentials } = data;
  return baseHandleSummary(summaryWithoutCredentials);
}

export { setup };
export default runLoadScenario;
