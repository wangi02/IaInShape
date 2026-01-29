import React from 'react';

interface ProgressBarProps {
  value: number;
  label: string;
  color?: string;
}

export const ProgressBar = ({ value, label, color = "bg-red-500" }: ProgressBarProps) => (
  <div className="w-full">
    <div className="flex justify-between text-[10px] mb-1 font-bold opacity-70 uppercase tracking-wider">
      <span>{label}</span>
      <span>{Math.round(value * 100)}%</span>
    </div>
    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${color} h-full transition-all duration-500 ease-out`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);
