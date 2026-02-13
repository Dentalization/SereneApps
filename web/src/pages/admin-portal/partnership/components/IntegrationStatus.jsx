import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import AppIcon from '../../../../components/AppIcon';
import { useLanguage } from '../../../../contexts/LanguageContext';

const IntegrationStatus = () => {
    const { t } = useLanguage();

    // Mock real-time data
    const [data, setData] = useState(Array.from({ length: 20 }, (_, i) => ({ time: i, latency: 120 + Math.random() * 50 })));

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                const newData = [...prev.slice(1), { time: prev[prev.length - 1].time + 1, latency: 120 + Math.random() * 50 }];
                return newData;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const integrations = [
        { id: 1, name: 'EMR Sync Service', uptime: '99.99%', latency: '45ms', status: 'healthy', requests: '450/min' },
        { id: 2, name: 'Payment Gateway', uptime: '99.95%', latency: '120ms', status: 'healthy', requests: '120/min' },
        { id: 3, name: 'Lab Result Hook', uptime: '98.50%', latency: '450ms', status: 'degraded', requests: '65/min' },
        { id: 4, name: 'Notification API', uptime: '99.99%', latency: '30ms', status: 'healthy', requests: '800/min' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Real-time Pulse */}
                <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="relative z-10 flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            System Heartbeat
                        </h3>
                        <div className="text-xs font-mono text-emerald-400">LIVE MONITORING</div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#10b981' }}
                                    labelStyle={{ display: 'none' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center mt-4 text-sm text-slate-400 font-mono">
                        <span>Avg Latency: 145ms</span>
                        <span>Peak Load: 2.1k req/s</span>
                    </div>
                </div>

                {/* Status List */}
                <div className="space-y-4">
                    {integrations.map((integration) => (
                        <div key={integration.id} className="bg-surface border border-border/40 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-primary text-sm">{integration.name}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-secondary font-mono">
                                    <span>{integration.uptime} uptime</span>
                                    <span>{integration.latency}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`inline-block w-2.5 h-2.5 rounded-full ${integration.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'} mb-1`}></div>
                                <p className="text-xs text-secondary">{integration.requests}</p>
                            </div>
                        </div>
                    ))}

                    <button className="w-full py-3 rounded-2xl border-2 border-dashed border-border/40 text-secondary font-medium hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                        <AppIcon name="Plus" size={16} /> Connect New API
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntegrationStatus;
