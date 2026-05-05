import React from 'react';
import PropTypes from 'prop-types';
import { useLanguage } from '../../contexts/LanguageContext';

const BranchList = ({ branches = [] }) => {
  const { t } = useLanguage();

  if (!branches.length) return <div className="text-sm text-secondary">{t('common.noBranchesAvailable', { defaultValue: 'No branches available' })}</div>;

  return (
    <ul className="space-y-3">
      {branches.map((b) => (
        <li key={b.id} className="p-3 rounded-lg border flex items-center justify-between bg-white">
          <div>
            <div className="font-medium">{b.branchName} {b.isMainBranch && <span className="text-xs px-2 py-0.5 bg-accent text-white rounded ml-2">{t('common.mainBranch', { defaultValue: 'Main' })}</span>}</div>
            <div className="text-xs text-secondary">{b.streetAddress}{b.city ? `, ${b.city}` : ''}</div>
          </div>
          <div className="text-xs text-secondary">{t('common.rooms', { defaultValue: 'Rooms' })}: {b.treatmentRoomsCount}</div>
        </li>
      ))}
    </ul>
  );
};

BranchList.propTypes = {
  branches: PropTypes.array
};

export default BranchList;
