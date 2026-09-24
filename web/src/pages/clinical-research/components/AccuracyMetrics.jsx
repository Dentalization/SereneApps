import React from 'react';

// No project-owned empirical dataset is supplied. Do not render placeholder accuracy figures.
const AccuracyMetrics = () => (
  <section className="py-20 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-4xl font-bold text-text-primary mb-4">Research Evaluation Status</h2>
      <p className="text-xl text-text-secondary mb-8">
        Dataset unavailable. Implemented evaluation tools do not establish experimental or clinical validity.
      </p>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Trueness', 'Precision and repeatability', 'Surface deviation and completeness', 'Clinical performance'].map(label => (
          <div key={label} className="bg-card rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-3">{label}</h3>
            <p className="text-text-secondary">Not evaluated — research data required.</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-text-secondary">No diagnostic accuracy, sensitivity, specificity, cohort size, or clinical trial outcome is claimed.</p>
    </div>
  </section>
);
export default AccuracyMetrics;
