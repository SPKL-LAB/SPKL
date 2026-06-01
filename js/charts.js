/* ============================================================
   SPKL RODA 2 - Chart Manager
   charts.js - Separation of Concerns: Visualization Layer
   ============================================================ */

'use strict';

const ChartManager = (() => {

  let charts = {};
  let sparklines = {};

  /* ----------------------------------------------------------
     HELPERS
     ---------------------------------------------------------- */
  function formatTime(date) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function makeGradient(ctx, color, alpha = 0.3) {
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.offsetHeight || 160);
    gradient.addColorStop(0, color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
    gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));
    return gradient;
  }

  /* ----------------------------------------------------------
     COMMON CHART OPTIONS
     ---------------------------------------------------------- */
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: 'easeInOutQuart' },
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend:  { display: false },
      tooltip: {
        backgroundColor: '#1a2540',
        titleColor: '#a0aec0',
        bodyColor: '#e8eaf6',
        borderColor: '#1e2d45',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: items => items[0].label,
          label: item => ` ${item.formattedValue}`,
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#4a5568',
          font: { family: 'Share Tech Mono', size: 10 },
          maxTicksLimit: 7,
          maxRotation: 0,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'transparent' },
      },
      y: {
        ticks: {
          color: '#4a5568',
          font: { family: 'Share Tech Mono', size: 10 },
          maxTicksLimit: 5,
          padding: 8,
        },
        grid: { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'transparent' },
      }
    }
  };

  /* ----------------------------------------------------------
     MAIN LINE CHART
     ---------------------------------------------------------- */
  function createLineChart(canvasId, color, label, yMin, yMax) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const chartColor = getComputedStyle(document.documentElement)
      .getPropertyValue(color).trim() || color;

    // Generate dummy data for initial display
    const now = new Date();
    const labels = [];
    const data   = [];
    for (let i = 59; i >= 0; i--) {
      labels.push(formatTime(new Date(now - i * 5000)));
      data.push(null);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, `${chartColor}44`);
    gradient.addColorStop(1, `${chartColor}00`);

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: chartColor,
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: chartColor,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }]
      },
      options: {
        ...baseOptions,
        scales: {
          ...baseOptions.scales,
          y: {
            ...baseOptions.scales.y,
            min: yMin,
            max: yMax,
            ticks: {
              ...baseOptions.scales.y.ticks,
              stepSize: Math.round((yMax - yMin) / 4),
            }
          }
        }
      }
    });

    return chart;
  }

  /* ----------------------------------------------------------
     SPARKLINE CHART (mini, under metric cards)
     ---------------------------------------------------------- */
  function createSparkline(canvasId, color) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    const chartColor = getComputedStyle(document.documentElement)
      .getPropertyValue(color).trim() || color;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(20).fill(''),
        datasets: [{
          data: Array(20).fill(null),
          borderColor: chartColor,
          borderWidth: 1.5,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        elements: { line: { borderCapStyle: 'round' } }
      }
    });

    return chart;
  }

  /* ----------------------------------------------------------
     INITIALIZE ALL CHARTS
     ---------------------------------------------------------- */
  function init() {
    // Main live charts
    charts.dcVoltage = createLineChart('chartDcVoltage', '--accent-blue',   'DC Voltage (V)',  30, 60);
    charts.acVoltage = createLineChart('chartAcVoltage', '--accent-blue',   'AC Voltage (V)', 150, 300);

    // Sparkline under metric cards
    sparklines.dcVoltage   = createSparkline('sparkDcVoltage',   '--accent-blue');
    sparklines.dcCurrent   = createSparkline('sparkDcCurrent',   '--accent-green');
    sparklines.dcEnergy    = createSparkline('sparkDcEnergy',    '--accent-purple');
    sparklines.dcPower     = createSparkline('sparkDcPower',     '--accent-orange');
    sparklines.panelTemp   = createSparkline('sparkPanelTemp',   '--accent-red');

    return { charts, sparklines };
  }

  /* ----------------------------------------------------------
     UPDATE MAIN CHART with new history data
     ---------------------------------------------------------- */
  function updateMainChart(chartKey, historyArr) {
    const chart = charts[chartKey];
    if (!chart || !historyArr.length) return;

    const labels = historyArr.map(h => formatTime(h.time));
    const data   = historyArr.map(h => h.value);

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('none');  // 'none' = no animation for live data feel
  }

  /* ----------------------------------------------------------
     UPDATE SPARKLINE with new value (rolling append)
     ---------------------------------------------------------- */
  function updateSparkline(key, value) {
    const sp = sparklines[key];
    if (!sp) return;

    sp.data.labels.push('');
    sp.data.labels.shift();
    sp.data.datasets[0].data.push(value);
    sp.data.datasets[0].data.shift();
    sp.update('none');
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  return {
    init,
    updateMainChart,
    updateSparkline,
    getChart:     key => charts[key],
    getSparkline: key => sparklines[key],
  };

})();

window.ChartManager = ChartManager;
