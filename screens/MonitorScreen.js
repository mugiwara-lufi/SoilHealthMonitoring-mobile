// screens/MonitorScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import MobileFooter from '../components/MobileFooter';

const screenWidth = Dimensions.get('window').width - 30;
const API_BASE_URL = 'http://52.63.40.11/api';

// Supabase Direct Credentials
const SUPABASE_URL = 'https://fpisfwcphgjcvxomzpko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cyQgbi_v02dkhswabEBWoQ_3exGPlaK';

const bleManager = new BleManager();

// Helper function to pause execution safely for BLE buffer timing
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function MonitorScreen({
  plotData,
  token,
  onRefreshData,
  onDisconnectSensor,
  onRemoveSensor,
  onAddSensor,
  currentTab,
  onSelectTab,
  onBack,
  onUpdatePlotSensor,
  currentAdminId,
  currentAdminUsername,
  users = []
}) {
  const currentPlot = plotData?.name || "Plot";
  const currentCrop = plotData?.crop || plotData?.crop_type || "Crop";
  const plotSize = plotData?.size || "2.5 hectares";

  const djangoSensorRequest = async (endpoint, method = 'GET', body = null) => {
  if (!token) {
    throw new Error('Your login session has expired. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/sensors/${endpoint}/`, {
    method,
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const responseText = await response.text();

  let data = {};

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { error: responseText };
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.detail ||
      data.non_field_errors?.[0] ||
      `Django request failed (${response.status})`
    );
  }

  return data;
};

  const parsedHectares = parseFloat(plotSize) || 2.5;

  const [loadingCharts, setLoadingCharts] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [plotAreaInput, setPlotAreaInput] = useState('');
  const [plotAreaUnit, setPlotAreaUnit] = useState('m2');
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [optimizationError, setOptimizationError] = useState('');
  const [showSensorModal, setShowSensorModal] = useState(false);
 
  // BLE Wi-Fi Provisioning States
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [scannedDevices, setScannedDevices] = useState([]);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);

  const [connecting, setConnecting] = useState(false);
  const [availableSensors, setAvailableSensors] = useState([]);
 
  const activeSensorId = plotData?.sensor_id && plotData.sensor_id !== 'N/A' ? plotData.sensor_id : null;
  const [supabaseLatestRecord, setSupabaseLatestRecord] = useState(null);

  // Telemetry History Records
  const [historicalRecords, setHistoricalRecords] = useState([]);

  // Functional Daily pH Bar Chart State
  const [dailyPhChartData, setDailyPhChartData] = useState({
    labels: [],
    values: [],
    colors: [],
    yAxisLabels: ['0', '0', '0', '0', '0']
  });

  // The line chart's scale is calculated from the actual pH readings.
  const [hourlyData, setHourlyData] = useState({
    labels: [],
    values: [],
    yAxisLabels: [],
    minPh: null,
    maxPh: null
  });

  // Custom Styled Card Alert State
  const [cardAlert, setCardAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showCancel: false,
    confirmText: 'OK',
    cancelText: 'Cancel'
  });

  const showAlert = ({ title, message, type = 'info', onConfirm = null, showCancel = false, confirmText = 'OK', cancelText = 'Cancel' }) => {
    setCardAlert({
      visible: true,
      title,
      message,
      type,
      onConfirm,
      showCancel,
      confirmText,
      cancelText
    });
  };

  const closeAlert = () => {
    setCardAlert(prev => ({ ...prev, visible: false }));
  };

  // Fetch telemetry history directly from Supabase for functional graphs
const fetchTelemetryHistory = useCallback(async () => {
  if (!activeSensorId && !plotData?.id) return;

  setLoadingCharts(true);

  try {
    let queryUrl =
      `${SUPABASE_URL}/rest/v1/soil_records?select=*&order=timestamp.asc&limit=300`;

    if (activeSensorId) {
      queryUrl =
        `${SUPABASE_URL}/rest/v1/soil_records?select=*&sensor_id=eq.${encodeURIComponent(activeSensorId)}&order=timestamp.asc&limit=300`;
    } else if (plotData?.id) {
      queryUrl =
        `${SUPABASE_URL}/rest/v1/soil_records?select=*&plot_id=eq.${encodeURIComponent(plotData.id)}&order=timestamp.asc&limit=300`;
    }

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Supabase ${response.status}: ${responseText}`);
    }

    const data = responseText ? JSON.parse(responseText) : [];
    setHistoricalRecords(Array.isArray(data) ? data : []);
  } catch (err) {
    console.log('Error fetching telemetry history from Supabase:', err);
  } finally {
    setLoadingCharts(false);
  }
}, [activeSensorId, plotData?.id]);

  useEffect(() => {
    fetchTelemetryHistory();
    if (activeSensorId) {
      fetchSupabaseLiveRecord(activeSensorId);
    }

    const interval = setInterval(() => {
      if (activeSensorId) {
        fetchSupabaseLiveRecord(activeSensorId);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [plotData?.id, activeSensorId, fetchTelemetryHistory]);

  // Process the existing Supabase records for the daily pH chart and rolling 24-hour trend.
  // The Supabase query above is intentionally unchanged; the 24-hour filter is client-side only.

useEffect(() => {
  const now = new Date();

  // Only include readings from the last 24 hours.
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentRecords = historicalRecords
    .filter((item) => {
      const ph = Number(item.ph_level ?? item.ph);
      const timestamp = new Date(item.timestamp);

      return (
        Number.isFinite(ph) &&
        ph >= 0 &&
        ph <= 14 &&
        !Number.isNaN(timestamp.getTime()) &&
        timestamp >= cutoff &&
        timestamp <= now
      );
    })
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );

  if (recentRecords.length === 0) {
    setHourlyData({
      labels: [],
      values: [],
      yAxisLabels: [],
      minPh: null,
      maxPh: null,
    });
    return;
  }

  const CHANGE_THRESHOLD = 0.10;
  const MIN_INTERVAL_MS = 5 * 60 * 1000;

  const filteredRecords = [];
  let lastDisplayedPh = null;
  let lastDisplayedTime = null;

  recentRecords.forEach((item, index) => {
    const ph = Number(Number(item.ph_level ?? item.ph).toFixed(1));
    const timestamp = new Date(item.timestamp).getTime();

    // Always preserve the first reading.
    if (index === 0) {
      filteredRecords.push(item);
      lastDisplayedPh = ph;
      lastDisplayedTime = timestamp;
      return;
    }

    const phChanged =
      Math.abs(ph - lastDisplayedPh) >= CHANGE_THRESHOLD;

    const enoughTimePassed =
      timestamp - lastDisplayedTime >= MIN_INTERVAL_MS;

    // Keep readings only when there is a meaningful change
    // and at least 5 minutes have passed.
    if (phChanged && enoughTimePassed) {
      filteredRecords.push(item);
      lastDisplayedPh = ph;
      lastDisplayedTime = timestamp;
    }
  });

  // Always preserve the latest reading, even if it did not
  // meet the change threshold.
  const latestRecord = recentRecords[recentRecords.length - 1];

  if (
    filteredRecords[filteredRecords.length - 1] !== latestRecord
  ) {
    filteredRecords.push(latestRecord);
  }

  const lineLabels = [];
  const lineValues = [];

  filteredRecords.forEach((item, index) => {
    const ph = Number(Number(item.ph_level ?? item.ph).toFixed(1));
    const date = new Date(item.timestamp);

    // Show labels every few points, plus first and last.
    const showLabel =
      index === 0 ||
      index === filteredRecords.length - 1 ||
      index % 2 === 0;

    lineLabels.push(
      showLabel
        ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
        : ''
    );

    lineValues.push(ph);
  });

  const minPh = Math.min(...lineValues);
  const maxPh = Math.max(...lineValues);

  // Add a little padding so small pH differences remain visible.
  const axisMin = Math.max(
    0,
    Math.floor((minPh - 0.2) * 10) / 10
  );

  const axisMax = Math.min(
    14,
    Math.ceil((maxPh + 0.2) * 10) / 10
  );

  const yAxisLabels = Array.from(
    { length: 5 },
    (_, index) => {
      const value = axisMax - ((axisMax - axisMin) * index / 4);
      return value.toFixed(1);
    }
  );
  

  setHourlyData({
    labels: lineLabels,
    values: lineValues,
    yAxisLabels,
    minPh,
    maxPh,
  });
}, [historicalRecords]);


// Process daily pH readings for Soil pH Levels by Day.
useEffect(() => {
  const now = new Date();
  const cutoff = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000
  );

  // Get valid pH readings from the last 7 days.
  const recentRecords = historicalRecords
    .filter((item) => {
      const ph = Number(item.ph_level ?? item.ph);
      const timestamp = new Date(item.timestamp);

      return (
        Number.isFinite(ph) &&
        ph >= 0 &&
        ph <= 14 &&
        !Number.isNaN(timestamp.getTime()) &&
        timestamp >= cutoff &&
        timestamp <= now
      );
    })
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );

  if (recentRecords.length === 0) {
    setDailyPhChartData({
      labels: [],
      values: [],
      colors: [],
      yAxisLabels: ['0', '0', '0', '0', '0'],
    });
    return;
  }

  // Group readings by day.
  const dailyGroups = {};

  recentRecords.forEach((item) => {
    const ph = Number(item.ph_level ?? item.ph);
    const date = new Date(item.timestamp);

    const dayKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');

    if (!dailyGroups[dayKey]) {
      dailyGroups[dayKey] = [];
    }

    dailyGroups[dayKey].push(ph);
  });

  // Calculate the average pH for each day.
  const dailyEntries = Object.entries(dailyGroups);

  const labels = dailyEntries.map(([day]) => {
    const [year, month, date] = day.split('-');

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(date)
    ).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  });

  const values = dailyEntries.map(([, readings]) => {
    const average =
      readings.reduce((sum, value) => sum + value, 0) /
      readings.length;

    return Number(average.toFixed(1));
  });

  // Assign colors according to the average pH.
const colors = values.map((ph) => {
  let hex;

  if (ph < 5.5) {
    hex = '#ef4444';
  } else if (ph <= 7.0) {
    hex = '#22c55e';
  } else {
    hex = '#f59e0b';
  }

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);

  return (opacity = 1) =>
    `rgba(${red}, ${green}, ${blue}, ${opacity})`;
});

  // Calculate the Y-axis scale.
  const minPh = Math.min(...values);
  const maxPh = Math.max(...values);

  const axisMin = Math.max(
    0,
    Math.floor((minPh - 0.5) * 2) / 2
  );

  const axisMax = Math.min(
    14,
    Math.ceil((maxPh + 0.5) * 2) / 2
  );

  const yAxisLabels = Array.from(
    { length: 5 },
    (_, index) => {
      const value =
        axisMax - ((axisMax - axisMin) * index) / 4;

      return value.toFixed(1);
    }
  );

  // Update the daily chart.
  setDailyPhChartData({
    labels,
    values,
    colors,
    yAxisLabels,
  });
}, [historicalRecords]);



  const fetchSupabaseLiveRecord = async (targetSensorId) => {
    const sId = targetSensorId || activeSensorId;
    if (!sId || sId === 'N/A') {
      setSupabaseLatestRecord(null);
      return;
    }

    try {
const response = await fetch(
  `${SUPABASE_URL}/rest/v1/soil_records?sensor_id=eq.${encodeURIComponent(sId)}&order=timestamp.desc&limit=1`,
  {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  }
);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setSupabaseLatestRecord(data[0]);
        } else {
          setSupabaseLatestRecord(null);
        }
      }
    } catch (err) {
      console.log("Error fetching live record from Supabase:", err);
    }
  };

  const handleManualRefresh = () => {
    fetchTelemetryHistory();
    fetchSupabaseLiveRecord(activeSensorId);
    if (onRefreshData) onRefreshData();
  };

  const latestRecord = supabaseLatestRecord
    || (Array.isArray(plotData?.records) && plotData.records.length > 0 ? plotData.records[0] : (plotData?.sensors || null));

  const hasSensor = Boolean(activeSensorId && activeSensorId !== "N/A");

  // IoT sensor ownership, discovery, assignment, and commands are handled
  // directly through Supabase. Django is not called by these sensor actions.
  const supabaseHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // The logged-in Django account ID is used only as an ownership value in
  // the Supabase registry. Plot ownership is taken from the loaded plot data
  // when available (sub-farmers inherit their owner's account scope).
  const currentAccountId = currentAdminId != null ? String(currentAdminId) : null;
const plotOwnerId = currentAccountId;

  const supabaseRequest = async (table, query = '', options = {}) => {
    const { method = 'GET', body, prefer = 'return=representation' } = options;
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`,
        {
          method,
          headers: { ...supabaseHeaders, Prefer: prefer },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        }
      );
      const responseText = await response.text();
      let data = null;
      try { data = responseText ? JSON.parse(responseText) : null; }
      catch { data = responseText; }
      if (!response.ok) {
        const detail = typeof data === 'string'
          ? data
          : data?.message || data?.details || data?.hint || data?.error || responseText;
        throw new Error(`Supabase table request failed (${response.status}): ${detail}`);
      }
      return data;
    };

  const updateSupabaseFarmPlotSensor = async (plotId, newSensorId) => {
    if (!plotId) throw new Error('The plot ID is missing.');
    await supabaseRequest(
      'soil_api_farmplot',
      `id=eq.${encodeURIComponent(plotId)}`,
      { method: 'PATCH', body: { sensor_id: newSensorId }, prefer: 'return=minimal' }
    );
  };

  const updateSupabasePlotId = async (sensorId, plotId) => {
    if (!sensorId) throw new Error('The sensor ID is missing.');
    await supabaseRequest(
      'soil_records',
      `sensor_id=eq.${encodeURIComponent(sensorId)}`,
      { method: 'PATCH', body: { plot_id: plotId }, prefer: 'return=minimal' }
    );
  };

const fetchAvailableSupabaseSensors = async () => {
  if (!plotData?.id) {
    throw new Error('The plot ID is missing.');
  }

  // Get available registered sensors from Django.
  const registryResponse = await djangoSensorRequest('available');

  const devices = Array.isArray(registryResponse)
    ? registryResponse
    : (
        registryResponse.results ||
        registryResponse.sensors ||
        registryResponse.available_sensors ||
        []
      );

  // Continue reading sensor telemetry directly from Supabase.
  const telemetry = await supabaseRequest(
    'soil_records',
    'select=sensor_id,battery_percentage,timestamp,plot_id&sensor_id=not.is.null&order=timestamp.desc&limit=1000'
  );

  // Keep only the newest telemetry record for each sensor.
  const latestBySensor = new Map();

  (Array.isArray(telemetry) ? telemetry : []).forEach((row) => {
    const sid = row?.sensor_id
      ? String(row.sensor_id).trim()
      : '';

    if (!sid || latestBySensor.has(sid)) return;

    latestBySensor.set(sid, row);
  });

  // Build the available sensor list using Django's ownership records.
  const available = (Array.isArray(devices) ? devices : [])
    .filter((device) =>
  device?.sensor_id && device.assigned_plot_id == null
)
    .map((device) => {
      const sid = String(device.sensor_id).trim();
      const row = latestBySensor.get(sid);

      // Do not show a sensor whose latest telemetry says it is assigned.
      if (row?.plot_id != null) return null;

      return {
        sensor_id: sid,
        battery: row?.battery_percentage ?? 'N/A',
        timestamp: row?.timestamp ?? null,
      };
    })
    .filter(Boolean);

  return available.sort((a, b) =>
    String(a.sensor_id).localeCompare(String(b.sensor_id))
  );
};

const readBleSensorId = async (connectedDevice) => {
  const SERVICE_UUID =
    '00004faf-0000-1000-8000-00805f9b34fb';

  const SENSOR_ID_CHAR_UUID =
    '0000beb6-0000-1000-8000-00805f9b34fb';

  const characteristic =
    await connectedDevice.readCharacteristicForService(
      SERVICE_UUID,
      SENSOR_ID_CHAR_UUID
    );

  if (!characteristic.value) {
    throw new Error('Could not read the sensor ID.');
  }

  const sensorId = Buffer
    .from(characteristic.value, 'base64')
    .toString('utf8')
    .trim();

  if (!/^SENSOR-[A-F0-9]{12}$/i.test(sensorId)) {
    throw new Error('The ESP32 returned an invalid sensor ID.');
  }

  return sensorId;
};

const handleConnectOrDisconnect = async () => {
  if (hasSensor) {
    showAlert({
      title: 'Disconnect Sensor',
      message: `Are you sure you want to disconnect sensor "${activeSensorId}" from ${currentPlot}? This will remove its assignment from this farm plot.`,
      type: 'danger',
      showCancel: true,
      confirmText: 'Disconnect',

      onConfirm: async () => {
        const prevSensorId = activeSensorId;
        const plotId = plotData?.id;

        if (!plotId || !prevSensorId) {
          showAlert({
            title: 'Unable to Disconnect',
            message: 'The plot ID or assigned sensor ID is missing. Please refresh and try again.',
            type: 'danger',
          });
          return;
        }

        try {
          const result = await djangoSensorRequest(
            'disconnect',
            'POST',
            {
              sensor_id: prevSensorId,
              plot_id: plotId,
            }
          );

          console.log('Django disconnect result:', result);

          setSupabaseLatestRecord(null);

          if (onUpdatePlotSensor) {
            onUpdatePlotSensor(plotId, null);
          }

          if (onRefreshData) {
            await onRefreshData();
          }

          showAlert({
            title: 'Disconnected',
            message: `Sensor ${prevSensorId} was disconnected. Its ownership was retained.`,
            type: 'success',
          });

        } catch (error) {
          console.log('Error disconnecting sensor:', error);

          showAlert({
            title: 'Disconnect Failed',
            message: error.message || 'Could not disconnect the sensor.',
            type: 'danger',
          });
        }
      },
    });

    return;
  }

  setConnecting(true);
  setShowSensorModal(true);

  try {
    const sensors = await fetchAvailableSupabaseSensors();

    setAvailableSensors(sensors);

    if (sensors.length === 0) {
      console.log('No available registered sensors found.');
    }

  } catch (error) {
    console.log('Error fetching available sensors:', error);

    setAvailableSensors([]);

    showAlert({
      title: 'Unable to Load Sensors',
      message: error.message || 'Could not retrieve available sensors.',
      type: 'danger',
    });

  } finally {
    setConnecting(false);
  }
};


const registerAndClaimSensor = async (sensorId, plotId) => {
  await djangoSensorRequest('register', 'POST', {
    sensor_id: sensorId,
  });

  await djangoSensorRequest('claim', 'POST', {
    sensor_id: sensorId,
    plot_id: plotId,
  });
};



const handleSelectSensor = async (sensorId) => {
  const plotId = plotData?.id;

  if (!plotId || !sensorId) {
    showAlert({
      title: 'Unable to Link Sensor',
      message: 'The plot or sensor ID is missing. Please refresh and try again.',
      type: 'danger',
    });
    return;
  }

  setConnecting(true);

  try {
    await registerAndClaimSensor(sensorId, plotId);

    showAlert({
      title: 'Sensor Connected',
      message: `${sensorId} was successfully connected to ${currentPlot}.`,
      type: 'success',
    });

    setShowSensorModal(false);
    setSupabaseLatestRecord(null);

    if (onUpdatePlotSensor) {
      onUpdatePlotSensor(plotId, sensorId);
    }

    if (onRefreshData) {
      await onRefreshData();
    }

  } catch (error) {
    showAlert({
      title: 'Unable to Connect Sensor',
      message: error.message,
      type: 'danger',
    });
  } finally {
    setConnecting(false);
  }
};



const startBleScan = async () => {
  try {
    setScannedDevices([]);
    setShowWifiModal(true);

    if (Platform.OS === 'android' && Platform.Version >= 31) {
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const scanGranted =
        permissions[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const connectGranted =
        permissions[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;

      if (!scanGranted || !connectGranted) {
        showAlert({
          title: 'Bluetooth Permission Required',
          message: 'Allow Nearby Devices permissions to scan for your JJMAP sensor.',
          type: 'warning',
        });
        return;
      }
    }

    const state = await bleManager.state();

    if (state !== 'PoweredOn') {
      showAlert({
        title: 'Bluetooth Disabled',
        message: 'Please turn on Bluetooth before scanning.',
        type: 'warning',
      });
      return;
    }

    console.log('Scanning for JJMAP ESP32 sensors...');

    bleManager.stopDeviceScan();

    bleManager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.log('BLE SCAN ERROR:', error.message);
          bleManager.stopDeviceScan();

          showAlert({
            title: 'Bluetooth Scan Failed',
            message: error.message,
            type: 'danger',
          });
          return;
        }

        if (!device) return;

        const deviceName = device.name || device.localName || '';

        if (deviceName === 'JJMAP_Setup_001') {
          console.log('JJMAP SENSOR FOUND:', device.id);

          setScannedDevices(previous => {
            if (previous.some(item => item.id === device.id)) {
              return previous;
            }

            return [...previous, device];
          });
        }
      }
    );

    setTimeout(() => {
      bleManager.stopDeviceScan();
      console.log('BLE scan completed.');
    }, 15000);

  } catch (error) {
    console.log('BLE INITIALIZATION ERROR:', error);

    showAlert({
      title: 'Bluetooth Error',
      message: error.message || 'Unable to start Bluetooth scanning.',
      type: 'danger',
    });
  }
};




const configureDeviceWifi = async (device) => {
  if (!wifiSsid.trim() || !wifiPass.trim()) {
    showAlert({
      title: 'Error',
      message: 'Please enter both Wi-Fi SSID and Password.',
      type: 'warning',
    });
    return;
  }

  const plotId = plotData?.id;

  if (!plotId) {
    showAlert({
      title: 'Missing Farm Plot',
      message: 'Please select a farm plot before configuring the sensor.',
      type: 'danger',
    });
    return;
  }

  let connectedDevice = null;

  try {
    setIsProvisioning(true);
    bleManager.stopDeviceScan();

    // 1. Connect to ESP32.

connectedDevice = await device.connect();

console.log('BLE CONNECTED:', connectedDevice.id);

await connectedDevice.discoverAllServicesAndCharacteristics();

console.log('BLE SERVICE DISCOVERY COMPLETED');

const services = await connectedDevice.services();

console.log(
  'DISCOVERED SERVICES:',
  services.map(service => service.uuid)
);

const serviceUUID = '00004faf-0000-1000-8000-00805f9b34fb';

const characteristics =
  await connectedDevice.characteristicsForService(serviceUUID);

console.log(
  'DISCOVERED CHARACTERISTICS:',
  characteristics.map(characteristic => ({
    uuid: characteristic.uuid,
    readable: characteristic.isReadable,
    writable: characteristic.isWritableWithResponse,
  }))
);

const sensorId = await readBleSensorId(connectedDevice);

console.log('DETECTED SENSOR ID:', sensorId);

    // 3. Register sensor and assign it to the selected farm plot.
    await registerAndClaimSensor(sensorId, plotId);

    console.log('Sensor successfully registered and assigned:', sensorId);

    // Update the app's plot information.
    setSupabaseLatestRecord(null);

    if (onUpdatePlotSensor) {
      onUpdatePlotSensor(plotId, sensorId);
    }

    if (onRefreshData) {
      try {
        await onRefreshData();
      } catch (refreshError) {
        console.log('Plot refresh warning:', refreshError.message);
      }
    }

    // 4. Prepare Wi-Fi credentials.
    const SERVICE_UUID = '00004faf-0000-1000-8000-00805f9b34fb';
    const SSID_CHAR_UUID = '0000beb5-0000-1000-8000-00805f9b34fb';
    const PASS_CHAR_UUID = '00001b54-0000-1000-8000-00805f9b34fb';

    const base64Ssid = Buffer.from(wifiSsid).toString('base64');
    const base64Pass = Buffer.from(wifiPass).toString('base64');

    // 5. Send Wi-Fi SSID.
    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      SSID_CHAR_UUID,
      base64Ssid
    );

    await delay(400);

    // 6. Send Wi-Fi password.
    try {
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        PASS_CHAR_UUID,
        base64Pass
      );

    } catch (passError) {
      const message = (passError.message || '').toLowerCase();

      // The ESP32 may disconnect because it is restarting.
      const expectedRestart =
        message.includes('disconnect') ||
        message.includes('disconnected') ||
        message.includes('gatt');

      if (!expectedRestart) {
        throw passError;
      }

      console.log(
        'BLE disconnected during password write. ESP32 may be restarting:',
        passError.message
      );
    }

    // 7. Finish provisioning.
    showAlert({
      title: 'Sensor Configured',
      message:
        `${sensorId} has been registered and assigned to ${currentPlot}. ` +
        'Wi-Fi credentials were submitted. Check the ESP32 Serial Monitor to confirm its Wi-Fi connection.',
      type: 'success',
    });

    setShowWifiModal(false);
    setWifiSsid('');
    setWifiPass('');

  } catch (error) {
    console.log('SENSOR PROVISIONING ERROR:', error);

    showAlert({
      title: 'Provisioning Error',
      message: error.message || 'Unable to configure the ESP32 sensor.',
      type: 'danger',
    });

  } finally {
    setIsProvisioning(false);
  }
};

  const getSensorVal = (rec, ...keys) => {
    if (!rec) return null;
    for (const key of keys) {
      const val = key.split('.').reduce((obj, k) => obj?.[k], rec);
      if (val !== undefined && val !== null && val !== '' && val !== 'N/A') {
        const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  };

  const sensors = {
    ph: getSensorVal(latestRecord, 'ph_level', 'ph', 'phLevel', 'soil_ph'),
    moisture: getSensorVal(latestRecord, 'soil_moisture', 'moisture', 'soilMoisture', 'humidity'),
    ec: getSensorVal(latestRecord, 'ec', 'soil_ec', 'electrical_conductivity'),
    temp: getSensorVal(latestRecord, 'soil_temperature', 'temp', 'temperature', 'soilTemp'),
    nitrogen: getSensorVal(latestRecord, 'nitrogen', 'n', 'n_level', 'npk.n', 'npk.nitrogen'),
    phosphorus: getSensorVal(latestRecord, 'phosphorus', 'p', 'p_level', 'npk.p', 'npk.phosphorus'),
    potassium: getSensorVal(latestRecord, 'potassium', 'k', 'k_level', 'npk.k', 'npk.potassium'),
    battery: getSensorVal(latestRecord, 'battery_percentage', 'battery', 'battery_level', 'batteryLevel'),
  };

  // Status bands follow the supplied JJMAP specification. Temperature has no
  // approved range in that specification, so it is displayed without grading.
  const status = (label, color) => ({ label, color });
  const unknownStatus = status('Unknown', '#64748b');

  const getPhStatus = (ph) => {
    if (!Number.isFinite(ph)) return unknownStatus;
    if (ph < 6.6) return status('Acidic', '#ef4444');
    if (ph <= 7.0) return status('Neutral', '#16a34a');
    return status('Alkaline', '#f59e0b');
  };
  const getMoistureStatus = (value) => {
    if (!Number.isFinite(value)) return unknownStatus;
    if (value < 5) return status('Low', '#ef4444');
    if (value <= 40) return status('Normal', '#16a34a');
    if (value <= 50) return status('High', '#f59e0b');
    return status('Unusual', '#ef4444');
  };
  const getEcStatus = (value) => {
    if (!Number.isFinite(value)) return unknownStatus;
    if (value < 100) return status('Below ideal', '#f59e0b');
    if (value <= 1000) return status('Ideal', '#16a34a');
    if (value <= 2500) return status('Above ideal', '#f59e0b');
    return status('Too salty', '#ef4444');
  };
  const getTempStatus = (value) => {
    if (!Number.isFinite(value)) return unknownStatus;
    return status('Monitoring only', '#64748b');
  };
  const getNStatus = (value) => {
    if (!Number.isFinite(value)) return unknownStatus;
    if (value < 30) return status('Low', '#ef4444');
    if (value <= 150) return status('Medium', '#16a34a');
    return status('High', '#f59e0b');
  };
  const getPStatus = (value, soilPh) => {
    if (!Number.isFinite(value) || !Number.isFinite(soilPh)) return unknownStatus;
    const lowLimit = soilPh < 7.3 ? 10 : 7;
    const mediumLimit = soilPh < 7.3 ? 20 : 25;
    if (value <= lowLimit) return status('Low', '#ef4444');
    if (value <= mediumLimit) return status('Medium', '#16a34a');
    return status('High', '#f59e0b');
  };
  const getKStatus = (value) => {
    if (!Number.isFinite(value)) return unknownStatus;
    if (value <= 117) return status('Low', '#ef4444');
    if (value <= 235) return status('Medium', '#16a34a');
    return status('High', '#f59e0b');
  };
  const getNpkOverallStatus = (nStat, pStat, kStat) => {
    const grades = [nStat.label, pStat.label, kStat.label];
    if (grades.includes('Unknown')) return unknownStatus;
    if (grades.includes('Low')) return status('Nutrient Deficiency', '#ef4444');
    if (grades.includes('High')) return status('High Nutrient Level', '#f59e0b');
    return status('Optimal Range', '#16a34a');
  };

  const phStatus = getPhStatus(sensors.ph);
  const moistureStatus = getMoistureStatus(sensors.moisture);
  const ecStatus = getEcStatus(sensors.ec);
  const tempStatus = getTempStatus(sensors.temp);
  const nStatus = getNStatus(sensors.nitrogen);
  const pStatus = getPStatus(sensors.phosphorus, sensors.ph);
  const kStatus = getKStatus(sensors.potassium);
  const npkStatus = getNpkOverallStatus(nStatus, pStatus, kStatus);

  const phAdvisory = !Number.isFinite(sensors.ph)
    ? 'A valid pH reading is required before calculating fertilizer recommendations.'
    : sensors.ph < 6.0
      ? 'Soil is acidic. Liming may be needed. Ask an agronomist for the lime rate.'
      : sensors.ph > 7.0
        ? 'Soil is alkaline. Nutrient availability may be reduced.'
        : null;

  const gradeN = (value) => value < 30 ? 'Low' : value <= 150 ? 'Medium' : 'High';
  const gradeP = (value, ph) => {
    if (ph < 7.3) return value <= 10 ? 'Low' : value <= 20 ? 'Medium' : 'High';
    return value <= 7 ? 'Low' : value <= 25 ? 'Medium' : 'High';
  };
  const gradeK = (value) => value <= 117 ? 'Low' : value <= 235 ? 'Medium' : 'High';
  const nutrientDoses = {
    Low: { N: 90, P2O5: 60, K2O: 60 },
    Medium: { N: 60, P2O5: 35, K2O: 45 },
    High: { N: 30, P2O5: 20, K2O: 30 },
  };
  const fertilizerProducts = [
    { key: 'N', name: 'Urea', grade: '46-0-0', fraction: 0.46, nutrient: 'N' },
    { key: 'P2O5', name: 'Solophos', grade: '0-18-0', fraction: 0.18, nutrient: 'P₂O₅' },
    { key: 'K2O', name: 'Muriate of Potash (MOP)', grade: '0-0-60', fraction: 0.60, nutrient: 'K₂O' },
  ];
  const formatProductAmount = (kg) => kg < 1
    ? `${(kg * 1000).toFixed(0)} g`
    : `${kg.toFixed(2)} kg`;

  const handleCalculateOptimization = () => {
    setOptimizationError('');
    const enteredArea = Number(plotAreaInput);
    if (!plotAreaInput.trim() || !Number.isFinite(enteredArea) || enteredArea <= 0) {
      setOptimizationError('Enter a plot area greater than zero.');
      return;
    }
    const areaM2 = plotAreaUnit === 'ha' ? enteredArea * 10000 : enteredArea;
    const areaHa = areaM2 / 10000;
    const MAX_PLOT_AREA_HA = null; // Set this after the team confirms its tested maximum plot area.
    if (MAX_PLOT_AREA_HA !== null && areaHa > MAX_PLOT_AREA_HA) {
      setOptimizationError(`The entered area exceeds the configured maximum of ${MAX_PLOT_AREA_HA} hectares.`);
      return;
    }
    const required = [sensors.ph, sensors.nitrogen, sensors.phosphorus, sensors.potassium];
    if (required.some((value) => !Number.isFinite(value)) ||
        sensors.ph < 0 || sensors.ph > 14 ||
        sensors.nitrogen < 0 || sensors.phosphorus < 0 || sensors.potassium < 0) {
      setOptimizationError('Valid pH, N, P, and K readings are required. Please re-measure the soil before calculating.');
      return;
    }
    const grades = {
      N: gradeN(sensors.nitrogen),
      P: gradeP(sensors.phosphorus, sensors.ph),
      K: gradeK(sensors.potassium),
    };
    const doses = {
      N: nutrientDoses[grades.N].N,
      P2O5: nutrientDoses[grades.P].P2O5,
      K2O: nutrientDoses[grades.K].K2O,
    };
    const nutrientKg = {
      N: doses.N * areaHa,
      P2O5: doses.P2O5 * areaHa,
      K2O: doses.K2O * areaHa,
    };
    const products = fertilizerProducts.map((product) => {
      const nutrientAmount = nutrientKg[product.key];
      const productKg = nutrientAmount / product.fraction;
      return { ...product, nutrientKg: nutrientAmount, productKg, displayAmount: formatProductAmount(productKg) };
    });
    setOptimizationResult({ areaM2, areaHa, grades, doses, nutrientKg, products });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
       
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentPlot} Soil Analytics</Text>
          <Text style={styles.headerSubtitle}>{currentCrop} Real-time Monitoring</Text>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            {/* Soil pH Card */}
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="flask" size={22} color="#ef4444" />
              </View>
              <Text style={styles.cardLabel}>Soil pH</Text>
              <Text style={styles.cardValue}>
                {sensors.ph !== null ? Number(sensors.ph).toFixed(1) : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: phStatus.color }]}>
                {phStatus.label}
              </Text>
            </View>

            {/* Moisture Card */}
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="water" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.cardLabel}>Moisture</Text>
              <Text style={styles.cardValue}>
                {sensors.moisture !== null ? `${Math.round(sensors.moisture)}%` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: moistureStatus.color }]}>
                {moistureStatus.label}
              </Text>
            </View>

            {/* EC Card */}
            <View style={styles.metricCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Ionicons name="flash" size={22} color="#eab308" />
              </View>
              <Text style={styles.cardLabel}>EC</Text>
              <Text style={styles.cardValue}>
                {sensors.ec !== null ? `${Math.round(sensors.ec)}` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: ecStatus.color }]}>
                {ecStatus.label}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            {/* Temperature Card */}
            <View style={[styles.metricCard, styles.largeRowCard]}>
              <View style={[styles.iconContainer, { backgroundColor: '#ffedd5' }]}>
                <Ionicons name="thermometer" size={24} color="#f97316" />
              </View>
              <Text style={styles.cardLabel}>Temperature</Text>
              <Text style={styles.cardValueBig}>
                {sensors.temp !== null ? `${Number(sensors.temp).toFixed(1)}°C` : 'N/A'}
              </Text>
              <Text style={[styles.cardStatus, { color: tempStatus.color }]}>
                {tempStatus.label}
              </Text>
            </View>

            {/* NPK Card */}
            <View style={[styles.metricCard, styles.largeRowCard, styles.npkCard]}>
              <View style={styles.npkHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#dcfce7', marginBottom: 0 }]}>
                  <Ionicons name="leaf" size={20} color="#22c55e" />
                </View>
                <Text style={styles.cardLabelNPK}>NPK Levels</Text>
              </View>

              <View style={styles.npkMetricRow}>
                <Text style={styles.npkLabel}>N (Nitrogen):</Text>
                <View style={styles.npkValueGroup}>
                  <Text style={styles.npkValue}>
                    {sensors.nitrogen !== null ? Math.round(sensors.nitrogen) : 'N/A'}
                  </Text>
                  <Text style={[styles.inlineStatusText, { color: nStatus.color }]}>
                    {nStatus.label}
                  </Text>
                </View>
              </View>

              <View style={styles.npkMetricRow}>
                <Text style={styles.npkLabel}>P (Phosphorus):</Text>
                <View style={styles.npkValueGroup}>
                  <Text style={styles.npkValue}>
                    {sensors.phosphorus !== null ? Math.round(sensors.phosphorus) : 'N/A'}
                  </Text>
                  <Text style={[styles.inlineStatusText, { color: pStatus.color }]}>
                    {pStatus.label}
                  </Text>
                </View>
              </View>

              <View style={styles.npkMetricRow}>
                <Text style={styles.npkLabel}>K (Potassium):</Text>
                <View style={styles.npkValueGroup}>
                  <Text style={styles.npkValue}>
                    {sensors.potassium !== null ? Math.round(sensors.potassium) : 'N/A'}
                  </Text>
                  <Text style={[styles.inlineStatusText, { color: kStatus.color }]}>
                    {kStatus.label}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardStatus, { color: npkStatus.color, marginTop: 4 }]}>
                {npkStatus.label}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.optimizeButton}
            onPress={() => setShowOptimizeModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="flash" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.optimizeButtonText}>Optimize Soil Health</Text>
          </TouchableOpacity>
        </View>

        {/* SOIL PH LEVELS BY DAY BAR CHART */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Soil pH Levels by Day</Text>
          <Text style={styles.chartSubtitle}>Weekly monitoring (Live Telemetry)</Text>

          {loadingCharts ? (
            <ActivityIndicator size="small" color="#2d6a4f" style={{ marginVertical: 30 }} />
          ) : dailyPhChartData.values.length === 0 ? (
            <Text style={styles.chartEmptyText}>No pH readings available to display.</Text>
          ) : (
            <>
              <View style={styles.dailyChartRow}>
                {/* Draw the pH scale separately so its values are always visible.
                    It stays fixed and is not clipped by react-native-chart-kit. */}
                <View style={styles.dailyFixedYAxis}>
                  {dailyPhChartData.yAxisLabels.map((value, index) => (
                    <Text
                      key={`daily-ph-y-axis-${index}`}
                      style={styles.dailyFixedYAxisLabel}
                    >
                      {value}
                    </Text>
                  ))}
                </View>

                <BarChart
                  data={{
                    labels: dailyPhChartData.labels,
                    datasets: [{
                      data: dailyPhChartData.values,
                      colors: dailyPhChartData.colors
                    }]
                  }}
                  width={screenWidth - 58}
                  height={200}
                  segments={4}
                  fromZero
                  withHorizontalLabels={false}
                  withVerticalLabels={true}
                  withCustomBarColorFromData
                  flatColor
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    barPercentage: 0.65,
                    fillShadowGradientOpacity: 1,
                    propsForLabels: { fontSize: 10 },
                  }}
                  style={styles.dailyBarChartStyle}
                  withInnerLines={true}
                  showBarTops={false}
                />
              </View>

              <View style={styles.legendGrid}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.legendText}>Highly Acidic (&lt;5.5)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendText}>Mod. Acidic (5.5-6.5)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                  <Text style={styles.legendText}>OPTIMAL (6.5-7.5)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.legendText}>Alkaline (&gt;7.5)</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* PH TREND OVER TIME: FIXED Y-AXIS + HORIZONTAL SCROLL */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>pH Trend Over Time</Text>
          <Text style={styles.chartSubtitle}>
                Last 24 hours • Significant pH changes
              </Text>

          {loadingCharts ? (
            <ActivityIndicator size="small" color="#2d6a4f" style={{ marginVertical: 30 }} />
          ) : hourlyData.values.length === 0 ? (
            <Text style={styles.chartEmptyText}>No pH readings from the last 24 hours.</Text>
          ) : (
            <View style={styles.trendChartRow}>
              {/* This Y-axis remains outside the horizontal ScrollView, so it stays fixed. */}
              <View style={styles.fixedYAxis}>
                {hourlyData.yAxisLabels.map((value, index) => (
                  <Text
                      key={`ph-y-axis-${index}`}
                      style={styles.fixedYAxisLabel}
                    >
                      {value}
                    </Text>
                ))}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                nestedScrollEnabled
                style={styles.trendHorizontalScroll}
                contentContainerStyle={styles.trendChartContent}
              >
                <LineChart
                  data={{
                    labels: hourlyData.labels,
                    datasets: [{ data: hourlyData.values }]
                  }}
                  width={Math.max(
                      screenWidth - 65,
                      hourlyData.values.length * 45
                    )}
                  height={190}
                  segments={4}
                  withHorizontalLabels={false}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                    propsForDots: {
                        r: '3',
                        strokeWidth: '1.5',
                        stroke: '#22c55e'
                      },
                      propsForLabels: {
                        fontSize: 9
                      }
                  }}
                  bezier
                  style={styles.chartStyle}
                />
              </ScrollView>
            </View>
          )}
        </View>

        {/* Sensor Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoTitle}>Sensor Information</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleManualRefresh}>
              <Ionicons name="refresh" size={14} color="#22c55e" style={{ marginRight: 4 }} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sensor ID:</Text>
            <Text style={styles.infoValue}>{hasSensor ? activeSensorId : 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{plotData?.location || 'North Sector'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery Status:</Text>
            <Text style={[styles.infoValue, styles.batteryText]}>
              {hasSensor && sensors.battery !== null ? `${sensors.battery}%` : 'N/A'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: hasSensor ? '#ef4444' : '#22c55e' }
            ]}
            onPress={handleConnectOrDisconnect}
          >
            <Ionicons name="power" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>
              {hasSensor ? 'Disconnect Sensor' : 'Connect Available Sensor'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#3b82f6', marginTop: 10 }]}
            onPress={startBleScan}
          >
            <Ionicons name="bluetooth" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Configure Device WiFi (BLE)</Text>
          </TouchableOpacity>
        </View>

        {/* CONNECTED HARDWARE & IOT NODES */}
        <View style={styles.deviceSectionCard}>
          <Text style={styles.deviceSectionTitle}>Connected Hardware & IoT Nodes</Text>
          {!hasSensor ? (
            <Text style={styles.emptyDeviceText}>No active hardware node assigned to this plot.</Text>
          ) : (
            <View style={styles.deviceCard}>
              <View style={styles.deviceCardHeader}>
                <View style={styles.deviceIconCircle}>
                  <Ionicons name="hardware-chip-outline" size={20} color="#0f172a" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>
                    Node ID: {activeSensorId}
                  </Text>
                  <Text style={styles.deviceSub}>Assigned Plot: {currentPlot}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#15803d' }]}>
                    Online
                  </Text>
                </View>
              </View>

              <View style={styles.deviceMetaRow}>
                <Text style={styles.deviceMetaText}>Type: LoRa Soil Node</Text>
                <Text style={styles.deviceMetaText}>
                  Battery: {sensors.battery !== null ? `${sensors.battery}%` : 'N/A'}
                </Text>
              </View>


<TouchableOpacity
  style={styles.restartDeviceBtn}
  onPress={() => {
    showAlert({
      title: 'Reset Sensor Node',
      message: `Reset the Wi-Fi settings of node ${activeSensorId}? The sensor will disconnect from Wi-Fi and return to BLE provisioning mode. You will need to configure its Wi-Fi again.`,
      type: 'warning',
      showCancel: true,
      confirmText: 'Reset Wi-Fi',
      onConfirm: async () => {
        try {
          if (!activeSensorId) {
            throw new Error('No connected sensor ID was found.');
          }

          const result = await djangoSensorRequest(
            'reset',
            'POST',
            {
              sensor_id: activeSensorId,
            }
          );

          console.log('Sensor reset command result:', result);

          showAlert({
            title: 'Command Queued',
            message: `Wi-Fi reset command was successfully queued for sensor ${activeSensorId}. The node will reset when it receives the command.`,
            type: 'success',
          });

        } catch (error) {
          console.log('Error sending sensor reset command:', error);

          showAlert({
            title: 'Reset Failed',
            message: error.message || 'Could not send the reset command.',
            type: 'danger',
          });
        }
      }
    });
  }}
>
  <Ionicons
    name="refresh-outline"
    size={14}
    color="#334155"
    style={{ marginRight: 6 }}
  />
  <Text style={styles.restartDeviceText}>Restart Sensor Node</Text>
</TouchableOpacity>

            </View>
          )}
        </View>

      </ScrollView>

      {/* CUSTOM DESIGNED CARD ALERT MODAL */}
      <Modal
        visible={cardAlert.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.cardAlertOverlay}>
          <View style={styles.cardAlertBox}>
            <View style={[
              styles.cardAlertIconBadge,
              cardAlert.type === 'danger' && { backgroundColor: '#fee2e2' },
              cardAlert.type === 'warning' && { backgroundColor: '#fef3c7' },
              cardAlert.type === 'success' && { backgroundColor: '#dcfce7' },
              cardAlert.type === 'info' && { backgroundColor: '#e0e7ff' },
            ]}>
              <Ionicons
                name={
                  cardAlert.type === 'danger' ? 'alert-circle' :
                  cardAlert.type === 'warning' ? 'warning' :
                  cardAlert.type === 'success' ? 'checkmark-circle' : 'information-circle'
                }
                size={28}
                color={
                  cardAlert.type === 'danger' ? '#ef4444' :
                  cardAlert.type === 'warning' ? '#d97706' :
                  cardAlert.type === 'success' ? '#10b981' : '#4338ca'
                }
              />
            </View>

            <Text style={styles.cardAlertTitle}>{cardAlert.title}</Text>
            <Text style={styles.cardAlertMessage}>{cardAlert.message}</Text>

            <View style={styles.cardAlertActions}>
              {cardAlert.showCancel && (
                <TouchableOpacity
                  style={styles.cardAlertCancelBtn}
                  onPress={closeAlert}
                >
                  <Text style={styles.cardAlertCancelText}>{cardAlert.cancelText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.cardAlertConfirmBtn,
                  cardAlert.type === 'danger' && { backgroundColor: '#ef4444' },
                  cardAlert.type === 'warning' && { backgroundColor: '#d97706' },
                  !cardAlert.showCancel && { flex: 1 }
                ]}
                onPress={() => {
                  const callback = cardAlert.onConfirm;
                  closeAlert();
                  if (callback) callback();
                }}
              >
                <Text style={styles.cardAlertConfirmText}>{cardAlert.confirmText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SENSOR SELECTION POPUP MENU */}
      <Modal
        visible={showSensorModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSensorModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSensorModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalHeaderTitle}>
              <Ionicons name="radio" size={20} color="#0f172a" /> Select Available Sensor
            </Text>
            <Text style={styles.modalHeaderSubtitle}>
              Link an active Supabase hardware sensor to {currentPlot}
            </Text>

            {connecting ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginVertical: 30 }} />
            ) : availableSensors.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No available unassigned sensors found in your account.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
                {availableSensors.map((item, index) => (
                  <TouchableOpacity
                    key={item.sensor_id}
                    style={styles.sensorSelectItem}
                    onPress={() => handleSelectSensor(item.sensor_id)}
                  >
                    <View style={styles.sensorSelectIconBadge}>
                      <Ionicons name="hardware-chip-outline" size={20} color="#64748b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sensorSelectTitle}>{item.sensor_id}</Text>
                      <Text style={styles.sensorSelectSub}>
                        Battery: {item.battery}% • Last seen: {item.timestamp}
                      </Text>
                    </View>
                    <View style={styles.connectBadge}>
                      <Text style={styles.connectBadgeText}>Connect</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowSensorModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* BLE WIFI PROVISIONING MODAL */}
      <Modal
        visible={showWifiModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWifiModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWifiModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <Text style={styles.modalHeaderTitle}>
              <Ionicons name="bluetooth" size={20} color="#3b82f6" /> ESP32 Wi-Fi Provisioning
            </Text>
            <Text style={styles.modalHeaderSubtitle}>
              Scan and configure local network credentials via Bluetooth
            </Text>

            <TextInput
              style={styles.inputField}
              placeholder="Wi-Fi SSID"
              placeholderTextColor="#94a3b8"
              value={wifiSsid}
              onChangeText={setWifiSsid}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Wi-Fi Password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={wifiPass}
              onChangeText={setWifiPass}
            />

            <Text style={styles.sectionHeaderLabel}>Available Devices (JJMAP_Setup):</Text>
           
            {isProvisioning ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginVertical: 20 }} />
            ) : scannedDevices.length === 0 ? (
              <Text style={styles.emptyStateText}>Searching for nearby ESP32 devices...</Text>
            ) : (
              <ScrollView style={{ maxHeight: 180, marginVertical: 10 }}>
                {scannedDevices.map((device, index) => (
                  <TouchableOpacity
                    key={device.id}
                    style={styles.sensorSelectItem}
                    onPress={() => configureDeviceWifi(device)}
                  >
                    <View style={styles.sensorSelectIconBadge}>
                      <Ionicons name="bluetooth-outline" size={20} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sensorSelectTitle}>{device.name || device.localName || 'Unknown Device'}</Text>
                      <Text style={styles.sensorSelectSub}>ID: {device.id}</Text>
                    </View>
                    <View style={[styles.connectBadge, { backgroundColor: '#dbeafe' }]}>
                      <Text style={[styles.connectBadgeText, { color: '#1d4ed8' }]}>Provision</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.closeModalButton, { backgroundColor: '#64748b', marginTop: 10 }]}
              onPress={() => setShowWifiModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* SOIL OPTIMIZATION AND FERTILIZER COMPUTATION MODAL */}
      <Modal
        visible={showOptimizeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOptimizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.recHeaderRow}>
                <View style={styles.lightbulbBadge}>
                  <Ionicons name="leaf" size={20} color="#eab308" />
                </View>
                <Text style={styles.recTitle}>Optimize Soil Health</Text>
              </View>
              <Text style={styles.recSubtitle}>Enter the area of {currentPlot} to calculate fertilizer amounts from the latest valid NPK readings.</Text>

              <Text style={styles.sectionHeaderLabel}>Plot area</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Enter plot area"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                value={plotAreaInput}
                onChangeText={(value) => { setPlotAreaInput(value); setOptimizationResult(null); setOptimizationError(''); }}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TouchableOpacity style={[styles.areaUnitButton, plotAreaUnit === 'm2' && styles.areaUnitButtonActive]} onPress={() => { setPlotAreaUnit('m2'); setOptimizationResult(null); }}>
                  <Text style={[styles.areaUnitText, plotAreaUnit === 'm2' && styles.areaUnitTextActive]}>Square meters (m²)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.areaUnitButton, plotAreaUnit === 'ha' && styles.areaUnitButtonActive]} onPress={() => { setPlotAreaUnit('ha'); setOptimizationResult(null); }}>
                  <Text style={[styles.areaUnitText, plotAreaUnit === 'ha' && styles.areaUnitTextActive]}>Hectares (ha)</Text>
                </TouchableOpacity>
              </View>
              {optimizationError ? <Text style={styles.optimizationError}>{optimizationError}</Text> : null}
              <TouchableOpacity style={styles.closeModalButton} onPress={handleCalculateOptimization}>
                <Text style={styles.closeModalButtonText}>Calculate Fertilizer Recommendations</Text>
              </TouchableOpacity>

              {optimizationResult && (
                <View style={{ marginTop: 18 }}>
                  <Text style={styles.sectionHeaderLabel}>Soil assessment</Text>
                  <Text style={styles.recDescText}>pH: {sensors.ph.toFixed(2)} ({phStatus.label}) · P method: {sensors.ph < 7.3 ? 'Bray 1' : 'Olsen'}</Text>
                  {phAdvisory ? <View style={styles.recBoxTip}><Text style={styles.recDescText}>{phAdvisory}</Text></View> : <Text style={styles.recDescText}>pH is within the 6.0–7.0 advisory range.</Text>}
                  <Text style={styles.sectionHeaderLabel}>NPK grades and default doses</Text>
                  {[
                    { name: 'Nitrogen (N)', value: sensors.nitrogen, unit: 'mg/kg', grade: optimizationResult.grades.N, dose: optimizationResult.doses.N },
                    { name: 'Phosphorus (P)', value: sensors.phosphorus, unit: 'ppm', grade: optimizationResult.grades.P, dose: optimizationResult.doses.P2O5 },
                    { name: 'Potassium (K)', value: sensors.potassium, unit: 'ppm', grade: optimizationResult.grades.K, dose: optimizationResult.doses.K2O },
                  ].map((item) => (
                    <View key={`grade-${item.name}`} style={styles.resultRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultTitle}>{item.name}: {item.value.toFixed(2)} {item.unit}</Text>
                        <Text style={styles.resultSub}>Grade: {item.grade}</Text>
                      </View>
                      <Text style={styles.resultDose}>{item.dose} kg/ha</Text>
                    </View>
                  ))}
                  <Text style={styles.sectionHeaderLabel}>Fertilizer amounts for {optimizationResult.areaM2.toLocaleString()} m² ({optimizationResult.areaHa.toFixed(4)} ha)</Text>
                  {optimizationResult.products.map((product) => (
                    <View key={`product-${product.key}`} style={styles.productResultCard}>
                      <Text style={styles.resultTitle}>{product.name} ({product.grade})</Text>
                      <Text style={styles.resultSub}>{product.nutrient} required: {product.nutrientKg.toFixed(3)} kg</Text>
                      <Text style={styles.productAmount}>{product.displayAmount}</Text>
                    </View>
                  ))}
                  <View style={styles.recBoxTip}>
                    <Text style={styles.tipText}>These are draft default rates from the supplied JJMAP specification, not crop-specific prescriptions. Confirm the dose table, product grades, N test method, maximum plot area, and recommendations with DA/BSWM or a qualified agronomist before field application. No lime rate is calculated.</Text>
                  </View>
                </View>
              )}
              <TouchableOpacity style={[styles.closeModalButton, { marginTop: 12, backgroundColor: '#64748b' }]} onPress={() => setShowOptimizeModal(false)}>
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MobileFooter currentTab={currentTab} onSelectTab={onSelectTab} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 110 },
  headerCard: {
    backgroundColor: '#2d6a4f',
    paddingTop: 45,
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: '#d8f3dc', fontSize: 14, marginTop: 4 },
 
  gridContainer: { paddingHorizontal: 15, marginTop: -40 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
 
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 4,
    minHeight: 120,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    justifyContent: 'space-between',
  },
  largeRowCard: {
    minHeight: 135,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginVertical: 2 },
  cardValueBig: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginVertical: 4 },
  cardStatus: { fontSize: 11, fontWeight: '700' },

  npkCard: { flex: 1.25 },
  npkHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardLabelNPK: { fontSize: 13, color: '#0f172a', fontWeight: 'bold', marginLeft: 8 },
  npkMetricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  npkLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  npkValueGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  npkValue: { fontSize: 12, color: '#0f172a', fontWeight: 'bold' },
  inlineStatusText: { fontSize: 10, fontWeight: '700' },

  optimizeButton: {
    flexDirection: 'row',
    backgroundColor: '#2d6a4f',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  optimizeButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 15,
    marginTop: 15,
    elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  chartSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  chartStyle: { marginVertical: 8, borderRadius: 12, paddingRight: 12 },
  chartEmptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 28,
  },
  dailyChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  dailyFixedYAxis: {
    width: 34,
    height: 150,
    marginTop: 18,
    marginBottom: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  dailyFixedYAxisLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },
  dailyBarChartStyle: {
    marginVertical: 8,
    borderRadius: 12,
    paddingRight: 4,
  },
  trendChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  fixedYAxis: {
    width: 38,
    height: 150,
    marginTop: 18,
    marginBottom: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 5,
  },
  fixedYAxisLabel: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },
  trendHorizontalScroll: {
    flex: 1,
  },
  trendChartContent: {
    paddingRight: 4,
  },
 
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '48%', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  refreshButton: { flexDirection: 'row', alignItems: 'center' },
  refreshText: { fontSize: 13, color: '#15803d', fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  infoLabel: { color: '#64748b', fontSize: 14 },
  infoValue: { fontWeight: 'bold', color: '#0f172a', fontSize: 14 },
  batteryText: { color: '#16a34a', fontWeight: 'bold' },
 
  actionButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  actionButtonText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },

  deviceSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 15,
    marginTop: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  deviceSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  emptyDeviceText: { color: '#64748b', fontStyle: 'italic', fontSize: 13 },
  deviceCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  deviceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deviceIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  deviceName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  deviceSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  deviceMetaRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  deviceMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  restartDeviceBtn: { marginTop: 12, backgroundColor: '#e2e8f0', paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  restartDeviceText: { fontSize: 13, fontWeight: '600', color: '#334155' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  modalHeaderSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 12 },
 
  inputField: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
  },
  sectionHeaderLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 10, marginBottom: 6 },
  emptyStateText: { textAlign: 'center', color: '#64748b', fontStyle: 'italic', marginVertical: 15 },
 
  sensorSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sensorSelectIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sensorSelectTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  sensorSelectSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  connectBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connectBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },

  recHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  lightbulbBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  recSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  areaUnitButton: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, alignItems: 'center' },
  areaUnitButtonActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  areaUnitText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  areaUnitTextActive: { color: '#166534' },
  optimizationError: { color: '#dc2626', fontSize: 12, marginBottom: 10 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  resultTitle: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  resultSub: { color: '#64748b', fontSize: 11, marginTop: 3 },
  resultDose: { color: '#166534', fontSize: 13, fontWeight: '700' },
  productResultCard: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12, marginBottom: 8 },
  productAmount: { color: '#166534', fontSize: 22, fontWeight: '800', marginTop: 5 },

  recBoxLime: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  recBoxTopRow: { flexDirection: 'row', alignItems: 'center' },
  alertIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recItemTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  priorityTag: { backgroundColor: '#ffe4e6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityTagText: { color: '#e11d48', fontSize: 10, fontWeight: 'bold' },
  sackCount: { fontSize: 20, fontWeight: 'bold', color: '#064e3b', marginTop: 6, marginBottom: 4 },
  recDescText: { fontSize: 13, color: '#334155', lineHeight: 18 },

  recBoxUrea: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  numberIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  numberIconText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  recBoxTip: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  tipText: { fontSize: 13, color: '#713f12', lineHeight: 18 },
  tipTitle: { fontWeight: 'bold', color: '#a16207' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  closeModalButton: {
    backgroundColor: '#2d6a4f',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeModalButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Custom Card Alert Styles
  cardAlertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  cardAlertBox: { backgroundColor: '#ffffff', borderRadius: 20, padding: 22, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 5 },
  cardAlertIconBadge: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  cardAlertTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  cardAlertMessage: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  cardAlertActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cardAlertCancelBtn: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardAlertCancelText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  cardAlertConfirmBtn: { flex: 1, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cardAlertConfirmText: { fontSize: 13, fontWeight: 'bold', color: '#ffffff' }
})

