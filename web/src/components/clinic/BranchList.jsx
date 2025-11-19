import React from 'react';
import PropTypes from 'prop-types';

const BranchList = ({ branches = [] }) => {
  if (!branches.length) return <div className="text-sm text-secondary">No branches available</div>;

  return (
    <ul className="space-y-3">
      {branches.map((b) => (
        <li key={b.id} className="p-3 rounded-lg border flex items-center justify-between bg-white">
          <div>
            <div className="font-medium">{b.branchName} {b.isMainBranch && <span className="text-xs px-2 py-0.5 bg-accent text-white rounded ml-2">Main</span>}</div>
            <div className="text-xs text-secondary">{b.streetAddress}{b.city ? `, ${b.city}` : ''}</div>
          </div>
          <div className="text-xs text-secondary">Rooms: {b.treatmentRoomsCount}</div>
        </li>
      ))}
    </ul>
  );
};

BranchList.propTypes = {
  branches: PropTypes.array
};

export default BranchList;
