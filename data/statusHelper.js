export const getPlotStatus = (sensors) => {
  if (!sensors || sensors.moisture === "0") return { label: 'Offline', color: '#64748b' };
  
  const moisture = parseFloat(sensors.moisture);
  
  if (moisture < 30) return { label: 'Critical', color: '#ef4444' }; // Red
  if (moisture >= 30 && moisture < 40) return { label: 'Warning', color: '#f59e0b' }; // Orange
  return { label: 'Optimal', color: '#22c55e' }; // Green
};