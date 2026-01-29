import React from 'react';

interface MetricCardProps {
  icon: any;
  label: string;
  value: string;
  subtext?: string;
}

export const MetricCard = ({ icon: Icon, label, value, subtext }: MetricCardProps) => (
  <div className="glass p-4 rounded-xl flex items-center gap-4 flex-1">
    <div className="p-3 rounded-lg bg-red-500/10 text-red-500">
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-zinc-100 leading-none mt-1">{value}</p>
      {subtext && <p className="text-[10px] text-zinc-600 mt-1">{subtext}</p>}
    </div>
  </div>
);
