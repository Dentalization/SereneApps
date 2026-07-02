import React from 'react';
import { useParams } from 'react-router-dom';
import SideBar from '../ui/SideBar';
import EndoCaseDirectory from './components/EndoCaseDirectory';
import EndoCaseDetail from './components/EndoCaseDetail';

const EndoCore = () => {
  const { caseId } = useParams();
  return (
    <div className="flex h-screen overflow-hidden theme-transition bg-background">
      <SideBar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto scroll-smooth custom-scrollbar bg-background">
        {caseId ? <EndoCaseDetail caseId={caseId} /> : <EndoCaseDirectory />}
      </main>
    </div>
  );
};

export default EndoCore;
