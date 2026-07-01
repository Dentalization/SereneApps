import React from 'react';
import { useParams } from 'react-router-dom';
import SideBar from '../ui/SideBar';
import EndoCaseDirectory from './Components/EndoCaseDirectory';
import EndoCaseDetail from './Components/EndoCaseDetail';

const EndoCore = () => {
  const { caseId } = useParams();
  return (
    <div className="flex min-h-screen bg-background">
      <SideBar />
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
        {caseId ? <EndoCaseDetail caseId={caseId} /> : <EndoCaseDirectory />}
      </main>
    </div>
  );
};

export default EndoCore;
