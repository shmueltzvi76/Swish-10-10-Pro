// משווה בין ציון נוכחי לציון קודם ומחזיר 'up' (שיא נשבר) / 'down' / 'same' / null (אין נתון להשוואה)
export const getTrend = (current, previous) => {
  if (current === undefined || current === null || previous === undefined || previous === null) return null;
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'same';
};
