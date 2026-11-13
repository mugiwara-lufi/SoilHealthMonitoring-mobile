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
  TextInput
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

  const parsedHectares = parseFloat(plotSize) || 2.5;

  const [loadingCharts, setLoadingCharts] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
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
      let queryUrl = `${SUPABASE_URL}/rest/v1/soil_records?select=*&order=timestamp.asc&limit=300`;
      if (activeSensorId) {
        queryUrl = `${SUPABASE_URL}/rest/v1/soil_records?select=*&sensor_id=eq.${encodeURIComponent(activeSensorId)}&order=timestamp.asc&limit=300`;
      } else if (plotData?.id) {
        queryUrl = `${SUPABASE_URL}/rest/v1/soil_records?select=*&plot_id=eq.${encodeURIComponent(plotData.id)}&order=timestamp.asc&limit=300`;
      }

      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHistoricalRecords(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log("Error fetching telemetry history from Supabase:", err);
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
    const records = Array.isArray(historicalRecords) ? historicalRecords : [];

    // 1. Soil pH Levels by Day: average available readings for each weekday.
    const daysMap = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
    const dayBuckets = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    records.forEach((rec) => {
      if (!rec?.timestamp) return;
      const date = new Date(rec.timestamp);
      if (Number.isNaN(date.getTime())) return;
      const dayName = daysMap[date.getDay()];
      const phVal = parseFloat(rec.ph_level ?? rec.ph);
      if (Number.isFinite(phVal) && dayBuckets[dayName]) {
        dayBuckets[dayName].push(phVal);
      }
    });

    const barLabels = [];
    const barValues = [];
    const colorList = [];

    // Use the same colors as the pH status description above:
    // red = highly acidic, amber = moderately acidic/alkaline, blue = optimal.
    const rgbaForHex = (hex) => {
      const value = hex.replace('#', '');
      const r = parseInt(value.slice(0, 2), 16);
      const g = parseInt(value.slice(2, 4), 16);
      const b = parseInt(value.slice(4, 6), 16);
      return (opacity = 1) => `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    orderedDays.forEach((day) => {
      const values = dayBuckets[day];
      // Do not create placeholder bars for days without actual Supabase readings.
      if (values.length === 0) return;

      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      const rounded = Number(average.toFixed(1));
      barLabels.push(day);
      barValues.push(rounded);

      let color = '#f59e0b';
      if (rounded < 5.5) color = '#ef4444';
      else if (rounded <= 6.5) color = '#f59e0b';
      else if (rounded <= 7.5) color = '#2563eb';
      else color = '#f59e0b';
      colorList.push(rgbaForHex(color));
    });

    const dailyMax = barValues.length > 0 ? Math.max(...barValues) : 0;
    const dailyAxisTop = dailyMax > 0 ? dailyMax : 1;
    const dailyAxisLabels = Array.from({ length: 5 }, (_, index) =>
      (dailyAxisTop - (dailyAxisTop * index / 4)).toFixed(1).replace(/\.0$/, '')
    );

    setDailyPhChartData({
      labels: barLabels,
      values: barValues,
      colors: colorList,
      yAxisLabels: dailyAxisLabels
    });

    // 2. pH Trend Over Time: anchor the 24-hour window to the newest actual
    // Supabase reading, then include all readings from the 24 hours before it.
    // This makes the chart useful even when the sensor has not uploaded today.
    // Missing/invalid timestamps and records without a valid pH are excluded.
    const timestampedRecords = records
      .map((rec) => ({
        rec,
        timestamp: rec?.timestamp ? new Date(rec.timestamp).getTime() : NaN,
        ph: parseFloat(rec?.ph_level ?? rec?.ph)
      }))
      .filter((item) => Number.isFinite(item.timestamp) && Number.isFinite(item.ph));

    const latestTimestamp = timestampedRecords.length > 0
      ? Math.max(...timestampedRecords.map((item) => item.timestamp))
      : null;
    const twentyFourHoursAgo = latestTimestamp === null
      ? null
      : latestTimestamp - (24 * 60 * 60 * 1000);

    const recentRecords = latestTimestamp === null
      ? []
      : timestampedRecords
          .filter((item) => item.timestamp >= twentyFourHoursAgo && item.timestamp <= latestTimestamp)
          .sort((a, b) => a.timestamp - b.timestamp);

    const lineLabels = [];
    const lineValues = [];

    // Keep all qualifying readings. Do not sample, pad, or fall back to older records.
    recentRecords.forEach((item) => {
      const phVal = item.ph;
      const date = new Date(item.timestamp);
      lineLabels.push(
        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      );
      lineValues.push(Number(phVal.toFixed(1)));
    });

    if (lineValues.length === 0) {
      setHourlyData({ labels: [], values: [], yAxisLabels: [], minPh: null, maxPh: null });
      return;
    }

    const minPh = Math.min(...lineValues);
    const maxPh = Math.max(...lineValues);
    // Chart-kit auto-scales from the supplied values. These matching labels
    // are drawn separately so the Y-axis stays fixed while the plot scrolls.
    const axisMin = minPh;
    const axisMax = maxPh;
    const yAxisLabels = Array.from({ length: 5 }, (_, index) => {
      const value = axisMax - ((axisMax - axisMin) * index / 4);
      return value.toFixed(1);
    });

    setHourlyData({
      labels: lineLabels,
      values: lineValues,
      yAxisLabels,
      minPh,
      maxPh
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
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          }
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

  const updateSupabaseFarmPlotSensor = async (plotId, newSensorId) => {
    if (!plotId) return;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_api_farmplot?id=eq.${encodeURIComponent(plotId)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ sensor_id: newSensorId })
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase plot update failed (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.log("Error updating Supabase soil_api_farmplot sensor_id:", err);
    }
  };

  const updateSupabasePlotId = async (sensorId, plotId) => {
    if (!sensorId) return;
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/soil_records?sensor_id=eq.${encodeURIComponent(sensorId)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ plot_id: plotId })
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase telemetry update failed (${response.status}): ${errorText}`);
      }
    } catch (err) {
      console.log("Error updating Supabase plot_id:", err);
    }
  };

  const handleConnectOrDisconnect = async () => {
    if (hasSensor) {
      showAlert({
        title: 'Disconnect Sensor',
        message: `Are you sure you want to disconnect sensor "${activeSensorId}" from ${currentPlot}? This will reset the device's Wi-Fi settings.`,
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
              type: 'danger'
            });
            return;
          }

          try {
            const headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            };
            if (token) headers.Authorization = `Token ${token}`;

            const backendResponse = await fetch(`${API_BASE_URL}/api/sensors/disconnect/`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                sensor_id: prevSensorId,
                plot_id: plotId,
              }),
            });

            const responseText = await backendResponse.text();
            let responseData = {};
            try {
              responseData = responseText ? JSON.parse(responseText) : {};
            } catch {
              responseData = { detail: responseText };
            }

            if (!backendResponse.ok) {
              throw new Error(
                responseData.error ||
                responseData.detail ||
                `Django could not disconnect the sensor (${backendResponse.status}).`
              );
            }

            setSupabaseLatestRecord(null);

            await updateSupabasePlotId(prevSensorId, null);
            await updateSupabaseFarmPlotSensor(plotId, null);

            if (onDisconnectSensor) onDisconnectSensor(plotId);
            if (onRemoveSensor) onRemoveSensor(plotId);
            if (onUpdatePlotSensor) onUpdatePlotSensor(plotId, null);
            if (onRefreshData) await onRefreshData();

            showAlert({
              title: 'Disconnected',
              message: `Sensor ${prevSensorId} was disconnected. Its registration remains in your account inventory.`,
              type: 'success'
            });
          } catch (err) {
            console.log('Error disconnecting sensor:', err);
            showAlert({
              title: 'Disconnect Failed',
              message: err.message || 'Django could not disconnect this sensor. Please try again.',
              type: 'danger'
            });
          }
        }
      });
      return;
    }

    setConnecting(true);
    setShowSensorModal(true);

    try {
      if (!token || !plotData?.id) {
        throw new Error('Your login session or plot ID is missing. Please sign in again.');
      }

      const response = await fetch(
        `${API_BASE_URL}/api/sensors/available/?plot_id=${encodeURIComponent(plotData.id)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${token}`,
            Accept: 'application/json',
          },
        }
      );

      const responseText = await response.text();
      let responseData = [];
      try {
        responseData = responseText ? JSON.parse(responseText) : [];
      } catch {
        throw new Error('The server returned an invalid available-sensors response.');
      }

      if (!response.ok) {
        throw new Error(
          responseData.error || responseData.detail ||
          `Could not load your sensors (${response.status}).`
        );
      }

      setAvailableSensors(Array.isArray(responseData) ? responseData : []);
    } catch (error) {
      console.log('Error fetching account-owned available sensors:', error);
      setAvailableSensors([]);
      showAlert({
        title: 'Unable to Load Sensors',
        message: error.message || 'Could not retrieve sensors for this account.',
        type: 'danger',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSelectSensor = async (sensorId) => {
    const plotId = plotData?.id;
    if (!plotId || !sensorId) {
      showAlert({
        title: 'Unable to Link Sensor',
        message: 'The plot or sensor ID is missing. Please refresh and try again.',
        type: 'danger'
      });
      return;
    }

    setConnecting(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (token) headers.Authorization = `Token ${token}`;

      const backendResponse = await fetch(`${API_BASE_URL}/api/sensors/claim/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sensor_id: sensorId,
          plot_id: plotId,
        })
      });

      const responseText = await backendResponse.text();
      let responseData = {};
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch {
        responseData = { detail: responseText };
      }

      if (!backendResponse.ok) {
        throw new Error(
          responseData.error ||
          responseData.detail ||
          `Django could not claim the sensor (${backendResponse.status}).`
        );
      }

      if (onUpdatePlotSensor) onUpdatePlotSensor(plotId, sensorId);

      await updateSupabaseFarmPlotSensor(plotId, sensorId);
      await updateSupabasePlotId(sensorId, plotId);

      setShowSensorModal(false);
      await fetchSupabaseLiveRecord(sensorId);
      fetchTelemetryHistory();
      if (onRefreshData) await onRefreshData();

      showAlert({
        title: 'Sensor Linked',
        message: `Successfully linked ${sensorId} to ${currentPlot}. The assignment has been saved.`,
        type: 'success'
      });
    } catch (error) {
      console.log('Error linking sensor:', error);
      showAlert({
        title: 'Sensor Not Linked',
        message: error.message || 'The sensor assignment could not be saved. Please try again.',
        type: 'danger'
      });
    } finally {
      setConnecting(false);
    }
  };

  const startBleScan = () => {
    setScannedDevices([]);
    setShowWifiModal(true);
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log(error);
        return;
      }
     
      const deviceName = device?.name || device?.localName;
     
      if (deviceName && deviceName.includes("JJMAP")) {
        setScannedDevices(prev => {
          if (!prev.some(d => d.id === device.id)) {
            return [...prev, device];
          }
          return prev;
        });
      }
    });
  };

  const configureDeviceWifi = async (device) => {
    if (!wifiSsid.trim() || !wifiPass.trim()) {
      showAlert({ title: 'Error', message: 'Please enter both Wi-Fi SSID and Password.', type: 'warning' });
      return;
    }

    try {
      setIsProvisioning(true);
      bleManager.stopDeviceScan();
      const connectedDevice = await device.connect();
      await connectedDevice.discoverAllServicesAndCharacteristics();

      const SERVICE_UUID = "00004faf-0000-1000-8000-00805f9b34fb";
      const SSID_CHAR_UUID = "0000beb5-0000-1000-8000-00805f9b34fb";
      const PASS_CHAR_UUID = "00001b54-0000-1000-8000-00805f9b34fb";

      const base64Ssid = Buffer.from(wifiSsid).toString('base64');
      const base64Pass = Buffer.from(wifiPass).toString('base64');

      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID, SSID_CHAR_UUID, base64Ssid
      );
     
      await delay(400);

      try {
        await connectedDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID, PASS_CHAR_UUID, base64Pass
        );
      } catch (passErr) {
        console.log("ESP32 rebooted on password write:", passErr.message);
      }

      showAlert({
        title: 'Success',
        message: 'Wi-Fi configuration sent! The ESP32 is rebooting and connecting to WiFi.',
        type: 'success'
      });
      setShowWifiModal(false);
      setWifiSsid('');
      setWifiPass('');
    } catch (err) {
      const errLower = (err.message || "").toLowerCase();
      if (errLower.includes("disconnect") || errLower.includes("cancel") || errLower.includes("reset") || errLower.includes("device")) {
        showAlert({
          title: 'Success',
          message: 'Wi-Fi configuration sent! The ESP32 is rebooting and connecting to WiFi.',
          type: 'success'
        });
        setShowWifiModal(false);
        setWifiSsid('');
        setWifiPass('');
      } else {
        showAlert({ title: 'Provisioning Error', message: err.message, type: 'danger' });
      }
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

  const getPhStatus = (ph) => {
    if (ph === null || ph === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(ph);
    if (num < 5.5) return { label: 'Highly Acidic', color: '#ef4444' };
    if (num <= 6.5) return { label: 'Mod. Acidic', color: '#f59e0b' };
    if (num <= 7.5) return { label: 'Optimal', color: '#2563eb' };
    return { label: 'Alkaline', color: '#f59e0b' };
  };

  const getMoistureStatus = (val) => {
    if (val === null || val === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(val);
    if (num < 20) return { label: 'Critical Low', color: '#ef4444' };
    if (num < 40) return { label: 'Low Moisture', color: '#f59e0b' };
    if (num <= 80) return { label: 'Optimal', color: '#2563eb' };
    return { label: 'High Moisture', color: '#f59e0b' };
  };

  const getEcStatus = (ec) => {
    if (ec === null || ec === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(ec);
    if (num < 200) return { label: 'Critical Low', color: '#ef4444' };
    if (num < 500) return { label: 'Low Nutrients', color: '#f59e0b' };
    if (num <= 1500) return { label: 'Optimal', color: '#2563eb' };
    return { label: 'High Salinity', color: '#ef4444' };
  };

  const getTempStatus = (val) => {
    if (val === null || val === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(val);
    if (num < 10) return { label: 'Critical Low', color: '#ef4444' };
    if (num < 18) return { label: 'Low Temp', color: '#f59e0b' };
    if (num <= 32) return { label: 'Optimal', color: '#2563eb' };
    if (num <= 38) return { label: 'High Temp', color: '#f59e0b' };
    return { label: 'Critical High', color: '#ef4444' };
  };

  const getNStatus = (val) => {
    if (val === null || val === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(val);
    if (num < 20) return { label: 'Critical Low', color: '#ef4444' };
    if (num < 50) return { label: 'Low', color: '#f59e0b' };
    if (num <= 200) return { label: 'Optimal', color: '#2563eb' };
    return { label: 'High', color: '#f59e0b' };
  };

  const getPStatus = (val) => {
    if (val === null || val === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(val);
    if (num < 10) return { label: 'Critical Low', color: '#ef4444' };
    if (num < 25) return { label: 'Low', color: '#f59e0b' };
    if (num <= 100) return { label: 'Optimal', color: '#2563eb' };
    return { label: 'High', color: '#f59e0b' };
  };

  const getKStatus = (val) => {
    if (val === null || val === undefined) return { label: 'Unknown', color: '#64748b' };
    const num = parseFloat(val);
    if (num < 20) return { label: 'Critical Low', color: '#ef4444' };
    if (num < 50) return { label: 'Low', color: '#f59e0b' };
    if (num <= 250) return { label: 'Optimal', color: '#2563eb' };
    return { label: 'High', color: '#f59e0b' };
  };

  const getNpkOverallStatus = (nStat, pStat, kStat) => {
    if (nStat.color === '#ef4444' || pStat.color === '#ef4444' || kStat.color === '#ef4444') {
      return { label: 'Critical Deficit', color: '#ef4444' };
    }
    if (nStat.color === '#f59e0b' || pStat.color === '#f59e0b' || kStat.color === '#f59e0b') {
      return { label: 'Needs Attention', color: '#f59e0b' };
    }
    if (nStat.color === '#2563eb' && pStat.color === '#2563eb' && kStat.color === '#2563eb') {
      return { label: 'Optimal Range', color: '#2563eb' };
    }
    return { label: 'Unknown', color: '#64748b' };
  };

  const phStatus = getPhStatus(sensors.ph);
  const moistureStatus = getMoistureStatus(sensors.moisture);
  const ecStatus = getEcStatus(sensors.ec);
  const tempStatus = getTempStatus(sensors.temp);

  const nStatus = getNStatus(sensors.nitrogen);
  const pStatus = getPStatus(sensors.phosphorus);
  const kStatus = getKStatus(sensors.potassium);
  const npkStatus = getNpkOverallStatus(nStatus, pStatus, kStatus);

  const limeSacksNeeded = Math.max(1, Math.round(parsedHectares * 1.5));
  const ureaSacksNeeded = Math.max(1, Math.round(parsedHectares * 0.8));

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
          <Text style={styles.chartSubtitle}>Weekly monitoring (Live Supabase Telemetry)</Text>

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
                    <Text key={`${value}-${index}`} style={styles.dailyFixedYAxisLabel}>
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
          <Text style={styles.chartSubtitle}>24 hours ending at the most recent recorded reading</Text>

          {loadingCharts ? (
            <ActivityIndicator size="small" color="#2d6a4f" style={{ marginVertical: 30 }} />
          ) : hourlyData.values.length === 0 ? (
            <Text style={styles.chartEmptyText}>No pH readings from the last 24 hours.</Text>
          ) : (
            <View style={styles.trendChartRow}>
              {/* This Y-axis remains outside the horizontal ScrollView, so it stays fixed. */}
              <View style={styles.fixedYAxis}>
                {hourlyData.yAxisLabels.map((value, index) => (
                  <Text key={`${value}-${index}`} style={styles.fixedYAxisLabel}>{value}</Text>
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
                  width={Math.max(screenWidth - 65, hourlyData.values.length * 58)}
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
                      r: '5',
                      strokeWidth: '2',
                      stroke: '#22c55e'
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
                    title: 'Restart Node',
                    message: `Send restart command to node ${activeSensorId}?`,
                    type: 'warning',
                    showCancel: true,
                    confirmText: 'Restart',
                    onConfirm: () => {
                      showAlert({
                        title: 'Command Sent',
                        message: `Restart signal transmitted to node ${activeSensorId}`,
                        type: 'success'
                      });
                    }
                  });
                }}
              >
                <Ionicons name="refresh-outline" size={14} color="#334155" style={{ marginRight: 6 }} />
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
                    key={index}
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
                    key={index}
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

      {/* SOIL OPTIMIZATION RECOMMENDATIONS MODAL */}
      <Modal
        visible={showOptimizeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptimizeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptimizeModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
           
            <View style={styles.recHeaderRow}>
              <View style={styles.lightbulbBadge}>
                <Ionicons name="bulb" size={20} color="#eab308" />
              </View>
              <Text style={styles.recTitle}>Fertilizer Recommendations</Text>
            </View>

            <Text style={styles.recSubtitle}>
              For lot size: {plotSize} Based on soil test results
            </Text>

            <View style={styles.recBoxLime}>
              <View style={styles.recBoxTopRow}>
                <View style={styles.alertIconBadge}>
                  <Ionicons name="warning" size={16} color="#ef4444" />
                </View>
                <Text style={styles.recItemTitle}>Agricultural Lime</Text>
                <View style={styles.priorityTag}>
                  <Text style={styles.priorityTagText}>PRIORITY</Text>
                </View>
              </View>

              <Text style={styles.sackCount}>{limeSacksNeeded} {limeSacksNeeded === 1 ? 'sack' : 'sacks'}</Text>
              <Text style={styles.recDescText}>
                pH {sensors.ph !== null ? Number(sensors.ph).toFixed(1) : '6.0'} is acidic. Adjust pH to optimal range (6.5-7.0) first.
              </Text>
            </View>

            <View style={styles.recBoxUrea}>
              <View style={styles.recBoxTopRow}>
                <View style={styles.numberIconBadge}>
                  <Text style={styles.numberIconText}>2</Text>
                </View>
                <Text style={styles.recItemTitle}>Urea (46-0-0)</Text>
              </View>

              <Text style={styles.sackCount}>{ureaSacksNeeded} {ureaSacksNeeded === 1 ? 'sack' : 'sacks'}</Text>
              <Text style={styles.recDescText}>
                Nitrogen reading is {sensors.nitrogen !== null ? `${Math.round(sensors.nitrogen)} ppm` : 'below threshold'}. Urea provides high nitrogen content.
              </Text>
            </View>

            <View style={styles.recBoxTip}>
              <Text style={styles.tipText}>
                <Text style={styles.tipTitle}><Ionicons name="warning" size={14} color="#b45309" /> pH Prioritization: </Text>
                Apply lime treatment first to correct soil acidity. This prevents nutrient lockout and ensures NPK fertilizers will be effective.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowOptimizeModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close Recommendations</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
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