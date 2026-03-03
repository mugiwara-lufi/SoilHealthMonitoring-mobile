// data/mockData.js

export const FARM_DATA = {
  lastUpdated: "0 seconds ago",
  syncTime: new Date().toLocaleTimeString(),
  plots: [
    { 
      id: '1', 
      name: 'Plot A', 
      crop: 'Rice Field', 
      status: 'Optimal', 
      icon: '🌱', 
      color: '#00c853',
      sensors: {
        moisture: "45",
        temp: "27.9",
        battery: "87%",
        signal: "Excellent"
      }
    },
    { 
      id: '2', 
      name: 'Plot B', 
      crop: 'Corn Field', 
      status: 'Warning', 
      icon: '🌽', 
      color: '#ffb300',
      sensors: {
        moisture: "32",
        temp: "31.5",
        battery: "45%",
        signal: "Good"
      }
    },
    { 
      id: '3', 
      name: 'Plot C', 
      crop: 'Wheat Field', 
      status: 'Offline', 
      icon: '🌾', 
      color: '#ef4444',
      sensors: {
        moisture: "0",
        temp: "0",
        battery: "0%",
        signal: "No Signal"
      }
    }
  ]
};