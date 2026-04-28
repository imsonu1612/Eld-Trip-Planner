import React, { useEffect, useRef } from 'react';
import { DailyLog } from '../types';
import { ELDCanvasRenderer } from '../services/eldCanvasRenderer';

interface ELDLogSheetProps {
  dailyLog: DailyLog;
}

const ELDLogSheet: React.FC<ELDLogSheetProps> = ({ dailyLog }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const renderer = new ELDCanvasRenderer(canvasRef.current);
      renderer.render(dailyLog);
    }
  }, [dailyLog]);

  const handleDownloadPNG = () => {
    if (canvasRef.current) {
      const renderer = new ELDCanvasRenderer(canvasRef.current);
      const filename = `ELD_Log_${dailyLog.date}_Day${dailyLog.day_number}.png`;
      renderer.downloadPNG(filename);
    }
  };

  return (
    <div className="premium-card interactive-lift animate-rise min-w-[850px] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="rounded bg-gradient-to-r from-[#f97316] to-[#ea580c] px-3 py-1 font-bold text-white shadow-sm">
            Day {dailyLog.day_number}
          </div>
          <span className="text-sm text-slate-600">{dailyLog.date}</span>
        </div>
        <button
          onClick={handleDownloadPNG}
          className="button-press rounded-lg bg-[#0f2a47] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#18496f]"
        >
          Download PNG
        </button>
      </div>
      <canvas ref={canvasRef} className="w-full rounded border border-slate-300 bg-white"></canvas>
    </div>
  );
};

export default ELDLogSheet;
