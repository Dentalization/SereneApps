import React from 'react';
import Icon from '../../../../components/AppIcon';

const InventoryStockCard = () => {
  const inventoryData = [
    { item: 'Composite Resin A2', current: 8, minimum: 10, status: 'low', expiry: '2025-12-15', cost: 'Rp 125,000' },
    { item: 'Bonding Agent', current: 15, minimum: 5, status: 'ok', expiry: '2026-03-20', cost: 'Rp 89,000' },
    { item: 'Impression Material', current: 3, minimum: 5, status: 'critical', expiry: '2025-10-30', cost: 'Rp 156,000' },
    { item: 'Local Anesthetic', current: 25, minimum: 10, status: 'ok', expiry: '2026-01-15', cost: 'Rp 45,000' },
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case 'critical':
        return { color: 'bg-red-500', textColor: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Critical' };
      case 'low':
        return { color: 'bg-amber-500', textColor: 'text-amber-500', bgColor: 'bg-amber-500/10', label: 'Low Stock' };
      case 'ok':
        return { color: 'bg-emerald-500', textColor: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'In Stock' };
      default:
        return { color: 'bg-gray-500', textColor: 'text-gray-500', bgColor: 'bg-gray-500/10', label: 'Unknown' };
    }
  };

  const getDaysToExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const criticalItems = inventoryData.filter(item => item.status === 'critical').length;
  const lowStockItems = inventoryData.filter(item => item.status === 'low').length;

  return (
    <div className="bg-surface-elevated rounded-3xl p-6 border border-primary/30 shadow-theme-lg hover:shadow-theme-xl transition-all duration-300 theme-transition dark:border-primary/40 dark:bg-surface-elevated/80">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10">
            <Icon name="Package" size={24} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary theme-transition">Inventory Stock</h3>
            <p className="text-sm text-muted theme-transition">Materials & supplies tracking</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {criticalItems > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-sm font-medium">
              {criticalItems} Critical
            </span>
          )}
          {lowStockItems > 0 && (
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium">
              {lowStockItems} Low
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {inventoryData.map((item, index) => {
          const statusInfo = getStatusInfo(item.status);
          const daysToExpiry = getDaysToExpiry(item.expiry);
          const isExpiringSoon = daysToExpiry <= 90;
          
          return (
            <div key={index} className="flex items-center justify-between p-4 bg-surface-elevated rounded-xl hover:bg-accent/5 transition-colors theme-transition">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                  <Icon name="Beaker" size={16} className={statusInfo.textColor} />
                </div>
                <div>
                  <p className="font-semibold text-primary theme-transition">{item.item}</p>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-secondary theme-transition">Stock: {item.current}/{item.minimum}</span>
                    {isExpiringSoon && (
                      <span className="text-amber-500 flex items-center space-x-1">
                        <Icon name="AlertTriangle" size={12} />
                        <span>{daysToExpiry}d to expiry</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`px-2 py-1 rounded-md text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor} mb-1`}>
                  {statusInfo.label}
                </div>
                <p className="text-xs text-muted theme-transition">{item.cost}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-emerald-500">92%</p>
          <p className="text-xs text-muted theme-transition">Stock Level</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-blue-500">Rp 2.1M</p>
          <p className="text-xs text-muted theme-transition">Total Value</p>
        </div>
        <div className="text-center p-3 bg-surface-elevated rounded-xl theme-transition">
          <p className="text-2xl font-bold text-amber-500">5</p>
          <p className="text-xs text-muted theme-transition">Reorder Items</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-primary/10">
        <button className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-sm font-medium transition-colors flex items-center space-x-2">
          <Icon name="ShoppingCart" size={14} />
          <span>Auto Reorder</span>
        </button>
        <button className="px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium transition-colors">
          Manage Inventory
        </button>
      </div>
    </div>
  );
};

export default InventoryStockCard;
