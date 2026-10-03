// data/mockData.js

export const FARM_DATA = {
  lastUpdated: "0 seconds ago",
  syncTime: new Date().toLocaleTimeString(),
  plots: [
    { 
      id: '1', 
      name: 'Plot A', 
      crop: 'Rice Field', 
      size: '2.5 hectares',
      status: 'Optimal', 
      icon: '🌱', 
      color: '#00c853',
      sensor_id: 'SN-RICE-001',
      location: 'North Sector',
      sensors: {
        moisture: "45",
        temp: "27.9",
        battery: "87%",
        signal: "Excellent"
      },
      records: [
        {
          id: 101,
          ph_level: 6.5,
          soil_moisture: 45.0,
          humidity: 78.0,
          soil_temperature: 27.9,
          nitrogen: 42.0,
          phosphorus: 28.0,
          potassium: 155.0,
          battery_percentage: 87,
          created_at: new Date().toISOString()
        }
      ]
    },
    { 
      id: '2', 
      name: 'Plot B', 
      crop: 'Corn Field', 
      size: '1.8 hectares',
      status: 'Warning', 
      icon: '🌽', 
      color: '#ffb300',
      sensor_id: 'SN-CORN-002',
      location: 'East Sector',
      sensors: {
        moisture: "32",
        temp: "31.5",
        battery: "45%",
        signal: "Good"
      },
      records: [
        {
          id: 102,
          ph_level: 5.8,
          soil_moisture: 32.0,
          humidity: 65.0,
          soil_temperature: 31.5,
          nitrogen: 22.0,
          phosphorus: 18.0,
          potassium: 110.0,
          battery_percentage: 45,
          created_at: new Date().toISOString()
        }
      ]
    },
    { 
      id: '3', 
      name: 'Plot C', 
      crop: 'Wheat Field', 
      size: '3.0 hectares',
      status: 'Critical',
      icon: '🌾', 
      color: '#dc2626',
      sensor_id: 'SN-WHEAT-003',
      location: 'South Sector',
      sensors: {
        moisture: "12", 
        temp: "38.5",
        battery: "10%",
        signal: "Weak"
      },
      records: [
        {
          id: 103,
          ph_level: 5.2,
          soil_moisture: 12.0,
          humidity: 45.0,
          soil_temperature: 38.5,
          nitrogen: 15.0,
          phosphorus: 12.0,
          potassium: 85.0,
          battery_percentage: 10,
          created_at: new Date().toISOString()
        }
      ]
    }
  ]
};