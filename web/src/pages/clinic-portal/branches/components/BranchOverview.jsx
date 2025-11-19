import React from 'react';
import AppIcon from '../../../../components/AppIcon';

const BranchOverview = ({ stats, branches, revenueData, loading }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getGrowthColor = (growth) => {
    const value = parseFloat(growth);
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth) => {
    const value = parseFloat(growth);
    if (value > 0) return 'TrendingUp';
    if (value < 0) return 'TrendingDown';
    return 'Minus';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/20">
              <AppIcon name="Building2" size={24} className="text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{stats.totalBranches}</span>
          </div>
          <h3 className="font-medium text-secondary mb-1">Total Branches</h3>
          <p className="text-sm text-secondary">
            {stats.activeBranches} active branches
          </p>
        </div>

        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20">
              <AppIcon name="DollarSign" size={24} className="text-green-600" />
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(stats.totalRevenue).replace('Rp', 'Rp')}
              </span>
            </div>
          </div>
          <h3 className="font-medium text-secondary mb-1">Total Revenue</h3>
          <p className={`text-sm flex items-center gap-1 ${getGrowthColor(stats.avgGrowth)}`}>
            <AppIcon name={getGrowthIcon(stats.avgGrowth)} size={14} />
            {stats.avgGrowth}% from last month
          </p>
        </div>

        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/20">
              <AppIcon name="ShoppingBag" size={24} className="text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{formatNumber(stats.totalTransactions)}</span>
          </div>
          <h3 className="font-medium text-secondary mb-1">Total Transactions</h3>
          <p className="text-sm text-secondary">This month</p>
        </div>

        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/20">
              <AppIcon name="Calculator" size={24} className="text-orange-600" />
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(stats.avgTransactionValue).replace('Rp', 'Rp')}
              </span>
            </div>
          </div>
          <h3 className="font-medium text-secondary mb-1">Avg Transaction</h3>
          <p className="text-sm text-secondary">Per transaction</p>
        </div>
      </div>

      {/* Branch Performance */}
      <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-primary">Branch Performance</h2>
          {loading && (
            <div className="flex items-center gap-2 text-secondary">
              <AppIcon name="Loader2" size={16} className="animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl border border-border/20">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : revenueData.length > 0 ? (
          <div className="space-y-4">
            {revenueData.map((branch, index) => (
              <div key={branch.branchId} className="flex items-center gap-4 p-4 rounded-xl border border-border/20 hover:border-border/40 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {branch.branchName.charAt(0)}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-primary">{branch.branchName}</h3>
                  <p className="text-sm text-secondary">
                    {formatNumber(branch.transactions)} transactions this month
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-primary">
                    {formatCurrency(branch.monthlyRevenue)}
                  </p>
                  <p className={`text-sm flex items-center gap-1 justify-end ${getGrowthColor(branch.growth)}`}>
                    <AppIcon name={getGrowthIcon(branch.growth)} size={12} />
                    {branch.growth}%
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${Math.min(100, (branch.monthlyRevenue / Math.max(...revenueData.map(b => b.monthlyRevenue))) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs text-secondary w-8">
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-secondary">
            <AppIcon name="BarChart3" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No revenue data available</p>
          </div>
        )}
      </div>

      {/* Top Performing Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <h2 className="text-lg font-semibold text-primary mb-4">Top Services Across Branches</h2>
          <div className="space-y-3">
            {['Teeth Cleaning', 'Dental Filling', 'Root Canal', 'Teeth Whitening', 'Orthodontics'].map((service, index) => (
              <div key={service} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-primary">{service}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="bg-accent h-1.5 rounded-full" 
                      style={{ width: `${100 - index * 15}%` }}
                    />
                  </div>
                  <span className="text-xs text-secondary w-8">
                    {100 - index * 15}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-elevated rounded-2xl p-6 border border-border/40">
          <h2 className="text-lg font-semibold text-primary mb-4">Monthly Growth Trend</h2>
          <div className="space-y-4">
            {['January', 'February', 'March', 'April', 'May'].map((month, index) => {
              const growth = (Math.random() * 20 - 5).toFixed(1);
              return (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">{month}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          parseFloat(growth) > 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.abs(parseFloat(growth)) * 3}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getGrowthColor(growth)} w-12 text-right`}>
                      {growth}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchOverview;