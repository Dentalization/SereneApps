import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';

// Import components for testing
import SideBar from '../ui/SideBar';
import Icon from '../../../components/AppIcon';
import KpiCard from './components/KpiCard';
import QuickActionCard from './components/QuickActionCard';
import ScheduleWidget from './components/ScheduleWidget';

const DashboardDebug = () => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);

  // Test hooks individually
  let user, isDark;
  try {
    const auth = useAuth();
    user = auth?.user;
    console.log('✅ useAuth hook works:', { user });
  } catch (err) {
    console.error('❌ useAuth hook failed:', err);
    setError(`useAuth error: ${err.message}`);
    return <div className="p-4 text-red-500">useAuth Error: {err.message}</div>;
  }

  try {
    const theme = useTheme();
    isDark = theme?.isDark;
    console.log('✅ useTheme hook works:', { isDark });
  } catch (err) {
    console.error('❌ useTheme hook failed:', err);
    setError(`useTheme error: ${err.message}`);
    return <div className="p-4 text-red-500">useTheme Error: {err.message}</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-surface-elevated p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-primary mb-8">Dashboard Debug - Step {step}</h1>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-surface rounded-lg border border-primary/20">
            <h3 className="font-semibold text-primary mb-2">Hook Status:</h3>
            <p>✅ useAuth: {user ? `Logged in as ${user.name}` : 'No user'}</p>
            <p>✅ useTheme: {isDark ? 'Dark mode' : 'Light mode'}</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Previous Step
          </button>
          <button 
            onClick={() => setStep(Math.min(5, step + 1))}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Next Step
          </button>
        </div>

        <div className="mt-8 p-6 bg-surface rounded-lg border border-primary/20">
          {step === 1 && <StepOne />}
          {step === 2 && <StepTwo />}
          {step === 3 && <StepThree />}
          {step === 4 && <StepFour />}
          {step === 5 && <StepFive />}
        </div>
      </div>
    </div>
  );
};

const StepOne = () => (
  <div>
    <h3 className="text-xl font-semibold mb-4">Step 1: Basic Layout</h3>
    <p>Basic layout with hooks working ✅</p>
  </div>
);

const StepTwo = () => {
  try {
    console.log('✅ SideBar component imported');
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">Step 2: Sidebar Test</h3>
        <p>✅ SideBar component imported successfully</p>
        <div className="mt-4">
          <div style={{ height: '200px', overflow: 'hidden' }}>
            <SideBar />
          </div>
        </div>
      </div>
    );
  } catch (err) {
    console.error('❌ SideBar render failed:', err);
    return <div className="text-red-500">SideBar render error: {err.message}</div>;
  }
};

const StepThree = () => {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Step 3: Component Imports</h3>
      <p>✅ All component imports successful</p>
      <ul className="list-disc list-inside mt-2">
        <li>KpiCard ✅</li>
        <li>QuickActionCard ✅</li>
        <li>ScheduleWidget ✅</li>
      </ul>
    </div>
  );
};

const StepFour = () => {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Step 4: Icon Component Test</h3>
      <p>✅ Icon component imported successfully</p>
      <div className="mt-4 flex space-x-4">
        <Icon name="Calendar" size={24} className="text-blue-500" />
        <Icon name="Users" size={24} className="text-green-500" />
        <Icon name="TrendingUp" size={24} className="text-purple-500" />
      </div>
    </div>
  );
};

const StepFive = () => {
  // Test full component rendering
  const mockData = {
    kpis: [
      { 
        title: 'Test KPI', 
        value: 'Rp 1,000,000', 
        subtitle: 'Test subtitle', 
        icon: 'DollarSign', 
        trend: { type: 'up', value: 12 },
        color: 'emerald',
        gradient: 'from-emerald-500/10 to-emerald-600/5'
      }
    ]
  };

  try {
    return (
      <div>
        <h3 className="text-xl font-semibold mb-4">Step 5: Component Rendering Test</h3>
        <div className="mt-4">
          <KpiCard {...mockData.kpis[0]} onClick={() => console.log('KPI clicked')} />
        </div>
      </div>
    );
  } catch (err) {
    console.error('❌ KpiCard render failed:', err);
    return <div className="text-red-500">KpiCard render error: {err.message}</div>;
  }
};

export default DashboardDebug;
