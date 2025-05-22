import { useState, useEffect, useMemo } from 'react';
import {
  Container, Typography, Box, Paper, Button, ToggleButtonGroup, ToggleButton, CircularProgress, Alert, Grid
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers';
import Chart from 'chart.js/auto';
import { Pie, Line } from 'react-chartjs-2';

// Helper for presets
const getPresetRange = (preset: string): [Date, Date] => {
  const now = new Date();
  let start: Date, end: Date;
  switch (preset) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'thisWeek': {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'thisYear':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }
  return [start, end];
};

function Stats() {
  // State for date range
  const [startDate, setStartDate] = useState(getPresetRange('thisWeek')[0]);
  const [endDate, setEndDate] = useState(getPresetRange('thisWeek')[1]);
  const [preset, setPreset] = useState('thisWeek');
  const [feeds, setFeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch feeds when date range changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchFeeds = async () => {
      try {
        const params = new URLSearchParams({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        });
        const res = await fetch(`/api/local-feeds?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch feeds');
        const data = await res.json();
        setFeeds(data);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchFeeds();
  }, [startDate, endDate]);

  // Pie chart data: waste by feedType
  const pieData = useMemo(() => {
    const typeTotals: Record<string, number> = {};
    feeds.forEach(feed => {
      if (!feed.type) return;
      typeTotals[feed.type] = (typeTotals[feed.type] || 0) + parseFloat(feed.weight);
    });
    return {
      labels: Object.keys(typeTotals),
      datasets: [{
        data: Object.values(typeTotals),
        backgroundColor: [
          '#1976d2', '#388e3c', '#fbc02d', '#d32f2f', '#7b1fa2', '#0288d1', '#c2185b', '#ffa000', '#388e3c', '#455a64'
        ],
      }],
    };
  }, [feeds]);

  // Line chart data: lbs waste by time of day
  const lineData = useMemo(() => {
    // Group by hour
    const hourTotals: Record<string, number> = {};
    feeds.forEach(feed => {
      const date = new Date(feed.timestamp);
      const hour = date.getHours();
      hourTotals[hour] = (hourTotals[hour] || 0) + parseFloat(feed.weight);
    });
    return {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Lbs Waste',
        data: Array.from({ length: 24 }, (_, i) => hourTotals[i] || 0),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        fill: true,
        tension: 0.3,
      }],
    };
  }, [feeds]);

  // Preset button handler
  const handlePreset = (preset: string) => {
    setPreset(preset);
    const [start, end] = getPresetRange(preset);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Paper sx={{ p: 2, mb: 3 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <ToggleButtonGroup
                  value={preset}
                  exclusive
                  onChange={(_, val) => val && handlePreset(val)}
                  size="small"
                  sx={{ mb: { xs: 2, md: 0 } }}
                >
                  <ToggleButton value="today">Today</ToggleButton>
                  <ToggleButton value="thisWeek">This Week</ToggleButton>
                  <ToggleButton value="thisMonth">This Month</ToggleButton>
                  <ToggleButton value="thisYear">This Year</ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid item>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={date => date && setStartDate(date)}
                  maxDate={endDate}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </Grid>
              <Grid item>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={date => date && setEndDate(date)}
                  minDate={startDate}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </Paper>
        {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!loading && !error && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>Waste by Feed Type</Typography>
                {pieData.labels.length > 0 ? (
                  <Pie data={pieData} />
                ) : (
                  <Typography color="text.secondary">No data for selected range.</Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>Lbs Waste by Time of Day</Typography>
                {feeds.length > 0 ? (
                  <Line data={lineData} />
                ) : (
                  <Typography color="text.secondary">No data for selected range.</Typography>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                  Covers vs Lbs of Food Waste (Coming Soon)
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
}

export default Stats; 