import React, { useState } from 'react';
import AppIcon from '../../../../components/AppIcon';

// Custom select styles to completely remove browser default styling
const customSelectStyle = {
  backgroundImage: 'none !important',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  msAppearance: 'none',
  appearance: 'none',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '0px 0px' // Ensure no background arrow
};

const BranchRevenueChart = ({ revenueData, loading }) => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [selectedBranch, setSelectedBranch] = useState('all');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getGrowthColor = (growth) => {
    const value = parseFloat(growth);
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const generateChartData = (branch) => {
    switch (timeRange) {
      case 'monthly':
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.map((month, index) => ({
          period: month,
          revenue: branch.monthlyRevenue * (0.6 + Math.random() * 0.8),
          transactions: Math.floor(branch.transactions * (0.6 + Math.random() * 0.8)),
          growth: (Math.random() * 40 - 15).toFixed(1)
        }));
        
      case 'quarterly':
        const quarters = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
        return quarters.map((quarter, index) => ({
          period: quarter,
          revenue: branch.monthlyRevenue * 3 * (0.7 + Math.random() * 0.6),
          transactions: Math.floor(branch.transactions * 3 * (0.7 + Math.random() * 0.6)),
          growth: (Math.random() * 50 - 20).toFixed(1)
        }));
        
      case 'yearly':
        const years = ['2021', '2022', '2023', '2024'];
        return years.map((year, index) => ({
          period: year,
          revenue: branch.monthlyRevenue * 12 * (0.5 + index * 0.15 + Math.random() * 0.3),
          transactions: Math.floor(branch.transactions * 12 * (0.5 + index * 0.15 + Math.random() * 0.3)),
          growth: (Math.random() * 60 - 25).toFixed(1)
        }));
        
      default:
        return [];
    }
  };

  const filteredData = selectedBranch === 'all' 
    ? revenueData 
    : revenueData.filter(branch => branch.branchId === selectedBranch);

  // Calculate totals based on time range
  const getMultiplier = () => {
    switch (timeRange) {
      case 'monthly': return 1;
      case 'quarterly': return 3;
      case 'yearly': return 12;
      default: return 1;
    }
  };

  const multiplier = getMultiplier();
  const totalRevenue = filteredData.reduce((sum, branch) => sum + (branch.monthlyRevenue * multiplier), 0);
  const totalTransactions = filteredData.reduce((sum, branch) => sum + (branch.transactions * multiplier), 0);
  const avgGrowth = filteredData.length > 0 
    ? (filteredData.reduce((sum, branch) => sum + parseFloat(branch.growth), 0) / filteredData.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-secondary whitespace-nowrap">Time Range:</label>
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-lg border border-border/40 bg-surface pl-3 pr-8 py-2 text-sm text-primary min-w-[120px] cursor-pointer focus:border-accent focus:outline-none"
                style={customSelectStyle}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-secondary whitespace-nowrap">Branch:</label>
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-lg border border-border/40 bg-surface pl-3 pr-8 py-2 text-sm text-primary min-w-[200px] max-w-[300px] cursor-pointer focus:border-accent focus:outline-none truncate"
                style={customSelectStyle}
              >
                <option value="all">All Branches</option>
                {revenueData.map(branch => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.branchName}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-secondary">
          <AppIcon name="Info" size={16} />
          <span>
            {timeRange === 'monthly' ? 'Monthly revenue data' : 
             timeRange === 'quarterly' ? 'Quarterly revenue projection' : 
             'Yearly revenue projection'}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Total Revenue</h3>
            <AppIcon name="DollarSign" size={16} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          <p className={`text-sm mt-1 ${getGrowthColor(avgGrowth)}`}>
            {avgGrowth}% from last period
          </p>
        </div>

        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Transactions</h3>
            <AppIcon name="ShoppingBag" size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-primary">{totalTransactions.toLocaleString()}</p>
          <p className="text-sm text-secondary mt-1">
            Avg: {formatCurrency(totalRevenue / totalTransactions || 0)} per transaction
          </p>
        </div>

        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">Active Branches</h3>
            <AppIcon name="Building2" size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-primary">{filteredData.length}</p>
          <p className="text-sm text-secondary mt-1">
            Contributing to revenue
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
        <h2 className="text-lg font-semibold text-primary mb-6">Revenue Trends</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AppIcon name="Loader2" size={32} className="animate-spin text-accent mx-auto mb-2" />
              <p className="text-secondary">Loading revenue data...</p>
            </div>
          </div>
        ) : revenueData.length === 0 ? (
          <div className="text-center py-12">
            <AppIcon name="BarChart3" size={48} className="mx-auto mb-4 text-secondary/50" />
            <p className="text-secondary">No revenue data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Simple Bar Chart */}
            <div className="relative">
              <div className="flex items-end justify-between h-64 gap-4">
                {filteredData.map((branch, index) => {
                  const adjustedRevenue = branch.monthlyRevenue * multiplier;
                  const height = (adjustedRevenue / Math.max(...filteredData.map(b => b.monthlyRevenue * multiplier))) * 100;
                  
                  return (
                    <div key={branch.branchId} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-purple-600 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-purple-700 cursor-pointer relative group"
                        style={{ height: `${height}%`, minHeight: '20px' }}
                        title={`${branch.branchName}: ${formatCurrency(adjustedRevenue)}`}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatCurrency(adjustedRevenue)}
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs font-medium text-primary truncate max-w-full">
                          {branch.branchName}
                        </p>
                        <p className={`text-xs ${getGrowthColor(branch.growth)}`}>
                          {branch.growth}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="overflow-hidden rounded-xl border border-border/40">
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary">
                      Branch
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                      Avg Transaction
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-secondary">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredData.map((branch, index) => (
                    <tr key={branch.branchId} className="hover:bg-surface transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                            {branch.branchName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-primary">{branch.branchName}</p>
                            <p className="text-xs text-secondary">Branch #{index + 1}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-primary">{formatCurrency(branch.monthlyRevenue * multiplier)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-primary">{(branch.transactions * multiplier).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-primary">{formatCurrency(branch.avgTransaction)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AppIcon 
                            name={parseFloat(branch.growth) > 0 ? 'TrendingUp' : parseFloat(branch.growth) < 0 ? 'TrendingDown' : 'Minus'} 
                            size={14} 
                            className={getGrowthColor(branch.growth)}
                          />
                          <span className={`font-medium ${getGrowthColor(branch.growth)}`}>
                            {branch.growth}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Top Services by Branch */}
      <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
        <h2 className="text-lg font-semibold text-primary mb-6">Top Services by Revenue</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.slice(0, 3).map((branch) => (
            <div key={branch.branchId} className="space-y-3">
              <h3 className="font-medium text-primary">{branch.branchName}</h3>
              <div className="space-y-2">
                {branch.topServices?.slice(0, 4).map((service, index) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-sm text-secondary">{service}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-accent h-1.5 rounded-full" 
                          style={{ width: `${85 - index * 15}%` }}
                        />
                      </div>
                      <span className="text-xs text-secondary w-8">
                        {85 - index * 15}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchRevenueChart;