import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { TREND_COLORS } from '../data/constants';

// אייקון חץ קטן שמלווה צבע מגמה (עלייה/ירידה/ללא שינוי) כדי שהצבע לא יישאר חידה
export default function TrendArrow({ trend, size = 12, className = '' }) {
  if (!trend) return null;
  const color = TREND_COLORS[trend];
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  return <Icon size={size} style={{ color }} className={`inline-block shrink-0 ${className}`} strokeWidth={3} />;
}
