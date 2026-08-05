import React, { useState, useEffect } from 'react';
import { getTrend } from '../utils/trend';
import { TREND_COLORS } from '../data/constants';

// === גרף אינטראקטיבי מושלם ===
export default function SmartLineChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (data && data.length > 0) setActiveIndex(data.length - 1);
  }, [data]);

  if (!data || data.length === 0) return <div className="text-[#848B98] text-center py-6 text-sm">אין נתונים להצגת גרף</div>;

  const chartData = [...data].reverse();
  const maxPoints = Math.max(chartData.length, 2);
  const safeActiveIndex = Math.min(activeIndex, chartData.length - 1);
  const activeData = chartData[safeActiveIndex] || chartData[chartData.length - 1];

  const getX = (index) => 8 + (index / (maxPoints - 1)) * 84;
  const getSvgY = (percentage) => 100 - percentage;

  const svgPoints = chartData.map((d, i) => `${getX(i)},${getSvgY(d.percentage)}`).join(' ');

  // צבע אחיד לכל הגרף, לפי המגמה בין שתי הנקודות האחרונות (הכי עדכני) - הצורה של הגרף עצמו מראה עלייה/ירידה לאורך הזמן
  const latestPoint = chartData[chartData.length - 1];
  const priorPoint = chartData[chartData.length - 2];
  const graphTrend = priorPoint ? getTrend(latestPoint.percentage, priorPoint.percentage) : null;
  const graphColor = graphTrend ? TREND_COLORS[graphTrend] : '#FF8A00';

  return (
    <div className="w-full relative pt-2 pb-6">

      <div className="bg-[#0F1115] border border-[#3A4155] rounded-xl p-3 mb-6 flex justify-between items-center shadow-inner transition-all">
        <div>
          <p className="text-[#848B98] text-[10px] uppercase tracking-wider mb-0.5">{activeData.fullDate}</p>
          <p className="text-white font-bold text-xs">תוצאת אימון נבחר</p>
        </div>
        <div className="text-2xl font-black drop-shadow-md" style={{ color: graphColor }}>
          {activeData.percentage.toFixed(0)}<span className="text-sm">%</span>
        </div>
      </div>

      <div className="relative h-32 border-b border-[#2A2F3D]">
        {[0, 50, 100].map(val => (
          <div key={val} className="absolute w-full border-t border-[#2A2F3D]/50" style={{ bottom: `${val}%` }}>
            <span className="absolute left-0 -top-2.5 text-[9px] text-[#596070] font-medium">{val}%</span>
          </div>
        ))}

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          {chartData.length > 1 && (
            <>
              <polygon points={`0,100 ${svgPoints} ${getX(chartData.length-1)},100`} fill="url(#trend-grad)" opacity="0.15"/>
              <polyline points={svgPoints} fill="none" stroke={graphColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </>
          )}
          <defs>
            <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={graphColor} stopOpacity="1" />
              <stop offset="100%" stopColor={graphColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {chartData.map((d, i) => {
          const isActive = i === safeActiveIndex;

          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 cursor-pointer flex flex-col items-center justify-end z-20 group"
              style={{ left: `calc(${getX(i)}% - 15px)`, width: '30px' }}
              onClick={() => setActiveIndex(i)}
            >
              {isActive && (
                <div className="absolute top-0 bottom-0 w-[1px] bg-transparent border-r border-dashed" style={{ left: '50%', borderColor: `${graphColor}80` }}></div>
              )}
              <div
                className={`absolute rounded-full transform -translate-x-1/2 translate-y-1/2 transition-all duration-300
                  ${isActive ? 'w-4 h-4 border-[3px] border-[#1C202A] z-30' : 'w-2 h-2 bg-[#0F1115] border-[2px]'}`}
                style={{
                  left: '50%', bottom: `${d.percentage}%`,
                  backgroundColor: isActive ? graphColor : '#0F1115',
                  borderColor: graphColor,
                  boxShadow: isActive ? `0 0 12px ${graphColor}CC` : 'none'
                }}
              ></div>
            </div>
          );
        })}
      </div>

      <div className="relative h-6 mt-3 w-full">
        {chartData.map((d, i) => {
          const isActive = i === safeActiveIndex;
          return (
            <div
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`absolute transform -translate-x-1/2 text-[9px] text-center font-bold cursor-pointer transition-colors px-1.5 py-1 rounded-md whitespace-nowrap
                ${isActive ? '' : 'text-[#848B98] hover:text-[#E0E2E7]'}`}
              style={{ left: `${getX(i)}%`, top: 0, ...(isActive ? { color: graphColor, backgroundColor: `${graphColor}1A` } : {}) }}
            >
              {d.shortDate}
            </div>
          );
        })}
      </div>
    </div>
  );
}
