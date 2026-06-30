import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import AppIcon from '../../../../components/AppIcon';
import { AdminEmptyState } from '../../ui/AdminPagePrimitives';

const IntegrationStatus = () => {
    const data = [];
    const integrations = [];

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
                        <div className="text-xs font-mono text-slate-400">BACKEND SOURCE REQUIRED</div>
                    </div>
                    <div className="h-64 w-full">
                        {data.length > 0 ? (
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
                        ) : (
                            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/40 p-6 text-center">
                                <div>
                                    <AppIcon name="Database" size={32} className="mx-auto mb-3 text-slate-500" />
                                    <p className="text-sm font-medium text-slate-200">Integration telemetry unavailable</p>
                                    <p className="mt-1 text-xs text-slate-400">Backend belum mengirim health, latency, uptime, atau request-rate integrations.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-4 text-sm text-slate-400 font-mono">
                        <span>Avg Latency: N/A</span>
                        <span>Peak Load: N/A</span>
                    </div>
                </div>

                {/* Status List */}
                <div className="space-y-4">
                    {integrations.length > 0 ? integrations.map((integration) => (
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
                    )) : (
                        <AdminEmptyState
                            icon="PlugZap"
                            title="Integration status belum tersedia"
                            description="Tidak ada data integration health dari backend. Tambahkan endpoint telemetry sebelum menampilkan SLA, latency, dan request rate."
                        />
                    )}

                    <button
                        disabled
                        title="Flow connect API belum tersedia di Admin Portal"
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-border/40 text-secondary font-medium opacity-60 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <AppIcon name="Plus" size={16} /> Connect New API
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntegrationStatus;
