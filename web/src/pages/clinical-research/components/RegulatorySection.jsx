import React from 'react';

const references = [
  { name: 'ISO 14971:2019', purpose: 'Medical-device risk management', url: 'https://www.iso.org/standard/72704.html' },
  { name: 'IEC 62304:2006', purpose: 'Medical-device software lifecycle', url: 'https://webstore.iec.ch/en/publication/6792' },
  { name: 'IEC 62366-1:2015', purpose: 'Medical-device usability engineering', url: 'https://webstore.iec.ch/en/publication/21863' },
];
const RegulatorySection = () => (
  <section className="py-20 bg-muted">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="text-4xl font-bold text-text-primary mb-4">Engineering References</h2>
      <p className="text-xl text-text-secondary mb-8">
        These standards inform engineering work. Certification, regulatory authorization, and formal compliance have not been established by this implementation.
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        {references.map(reference => (
          <div key={reference.name} className="bg-white rounded-xl p-6 border border-border">
            <a href={reference.url} target="_blank" rel="noreferrer" className="font-semibold text-primary">{reference.name}</a>
            <p className="mt-3 text-text-secondary">{reference.purpose}</p>
            <p className="mt-2 text-text-secondary">Reference only; evaluation pending.</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-text-secondary">No completed clinical trial, regulatory submission, or clearance is asserted here.</p>
    </div>
  </section>
);
export default RegulatorySection;
