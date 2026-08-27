const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const REGION_COLORS = { North: '#c6ff41', West: '#6ed2d0', South: '#ff956e', East: '#9397ff' };
const $ = (selector) => document.querySelector(selector);

const state = { region: 'all', category: 'all', monthEnd: 12 };
let dataset;

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
const compactMoney = (value) => {
  const number = Number(value || 0);
  if (number >= 10000000) return `₹${(number / 10000000).toFixed(1)}Cr`;
  if (number >= 100000) return `₹${(number / 100000).toFixed(1)}L`;
  if (number >= 1000) return `₹${(number / 1000).toFixed(1)}K`;
  return money(number);
};
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

function filterRows() {
  if (!dataset) return [];
  return dataset.records.filter((row) => (
    (state.region === 'all' || row.region === state.region)
    && (state.category === 'all' || row.category === state.category)
    && row.month <= state.monthEnd
  ));
}

function summarize(rows) {
  const summary = { revenue: 0, cost: 0, orders: 0, returns: 0, marketingSpend: 0, byMonth: {}, byCategory: {}, byRegion: {}, bySegment: {} };
  rows.forEach((row) => {
    summary.revenue += row.revenue;
    summary.cost += row.cost;
    summary.orders += row.orders;
    summary.returns += row.returns;
    summary.marketingSpend += row.marketingSpend;
    const month = row.monthLabel;
    const category = row.category;
    const region = row.region;
    const segmentKey = `${region} · ${category}`;
    if (!summary.byMonth[month]) summary.byMonth[month] = { month: row.month, revenue: 0, orders: 0 };
    if (!summary.byCategory[category]) summary.byCategory[category] = { name: category, revenue: 0, cost: 0, orders: 0, returns: 0 };
    if (!summary.byRegion[region]) summary.byRegion[region] = { name: region, revenue: 0 };
    if (!summary.bySegment[segmentKey]) summary.bySegment[segmentKey] = { name: segmentKey, revenue: 0, cost: 0, returns: 0 };
    summary.byMonth[month].revenue += row.revenue;
    summary.byMonth[month].orders += row.orders;
    summary.byCategory[category].revenue += row.revenue;
    summary.byCategory[category].cost += row.cost;
    summary.byCategory[category].orders += row.orders;
    summary.byCategory[category].returns += row.returns;
    summary.byRegion[region].revenue += row.revenue;
    summary.bySegment[segmentKey].revenue += row.revenue;
    summary.bySegment[segmentKey].cost += row.cost;
    summary.bySegment[segmentKey].returns += row.returns;
  });
  summary.grossProfit = summary.revenue - summary.cost;
  summary.margin = summary.revenue ? (summary.grossProfit / summary.revenue) * 100 : 0;
  summary.returnRate = summary.orders ? (summary.returns / summary.orders) * 100 : 0;
  summary.aov = summary.orders ? summary.revenue / summary.orders : 0;
  return summary;
}

function periodChange(months) {
  const values = Object.values(months).sort((a, b) => a.month - b.month).map((item) => item.revenue);
  if (values.length < 2 || !values[0]) return 0;
  return ((values[values.length - 1] - values[0]) / values[0]) * 100;
}

function renderKpis(summary, rows) {
  const change = periodChange(summary.byMonth);
  const cards = [
    ['NET REVENUE', compactMoney(summary.revenue), `${change >= 0 ? '+' : ''}${change.toFixed(1)}% first → last month`, change >= 0],
    ['ORDERS', summary.orders.toLocaleString('en-IN'), `${rows.length.toLocaleString('en-IN')} source rows`, true],
    ['GROSS MARGIN', pct(summary.margin), `${compactMoney(summary.grossProfit)} gross profit`, summary.margin >= 35],
    ['RETURN RATE', pct(summary.returnRate), `${summary.returns.toLocaleString('en-IN')} returned units`, summary.returnRate <= 8],
    ['AVG ORDER VALUE', money(summary.aov), 'revenue ÷ orders', summary.aov > 0],
  ];
  $('#kpi-grid').innerHTML = cards.map(([label, value, detail, positive]) => `<div class="kpi"><span class="kpi-label">${label}</span><strong class="kpi-value">${value}</strong><span class="kpi-detail ${positive ? 'positive' : ''}">${detail}</span></div>`).join('');
}

function renderTrend(summary) {
  const svg = $('#trend-chart');
  const points = Object.values(summary.byMonth).sort((a, b) => a.month - b.month);
  const width = 760;
  const height = 300;
  const left = 52;
  const right = 15;
  const top = 18;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(...points.map((item) => item.revenue), 1) * 1.16;
  const x = (index) => points.length === 1 ? left + chartWidth / 2 : left + (index / (points.length - 1)) * chartWidth;
  const y = (value) => top + chartHeight - (value / max) * chartHeight;
  const line = points.map((item, index) => `${x(index).toFixed(1)},${y(item.revenue).toFixed(1)}`).join(' ');
  const area = `${left},${top + chartHeight} ${line} ${x(points.length - 1).toFixed(1)},${top + chartHeight}`;
  const grid = [0, .25, .5, .75, 1].map((fraction) => {
    const gridY = top + chartHeight - fraction * chartHeight;
    return `<line class="chart-grid-line" x1="${left}" y1="${gridY}" x2="${width - right}" y2="${gridY}" /><text class="chart-axis-label" x="0" y="${gridY + 4}">${compactMoney(max * fraction)}</text>`;
  }).join('');
  const labels = points.map((item, index) => {
    if (points.length > 6 && index % 2 !== 0 && index !== points.length - 1) return '';
    return `<text class="chart-axis-label" text-anchor="middle" x="${x(index)}" y="${height - 12}">${MONTHS[item.month - 1]}</text>`;
  }).join('');
  const dots = points.map((item, index) => `<circle class="chart-dot" cx="${x(index)}" cy="${y(item.revenue)}" r="4" />`).join('');
  svg.innerHTML = `<defs><linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c6ff41" stop-opacity=".35"/><stop offset="1" stop-color="#c6ff41" stop-opacity="0"/></linearGradient></defs>${grid}<polygon class="chart-area" points="${area}"/><polyline class="chart-line" points="${line}"/>${dots}${labels}`;
  $('#trend-note').textContent = state.region === 'all' && state.category === 'all' ? 'ALL SEGMENTS' : `${state.region === 'all' ? 'ALL REGIONS' : state.region.toUpperCase()} / ${state.category === 'all' ? 'ALL CATEGORIES' : state.category.toUpperCase()}`;
}

function renderCategories(summary) {
  const categories = Object.values(summary.byCategory).sort((a, b) => b.revenue - a.revenue);
  const max = Math.max(...categories.map((item) => item.revenue), 1);
  $('#category-bars').innerHTML = categories.map((item) => `<div class="category-row"><span class="category-name">${escapeHtml(item.name)}</span><span class="bar-track"><i class="bar-fill" style="width:${(item.revenue / max) * 100}%"></i></span><strong class="category-number">${compactMoney(item.revenue)}</strong></div>`).join('');
}

function renderRegions(summary) {
  const regions = Object.values(summary.byRegion).sort((a, b) => b.revenue - a.revenue);
  const total = summary.revenue || 1;
  let cursor = 0;
  const stops = regions.map((item) => {
    const start = cursor;
    cursor += (item.revenue / total) * 100;
    return `${REGION_COLORS[item.name] || '#ffffff'} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
  }).join(', ');
  $('#region-donut').style.background = `conic-gradient(${stops})`;
  $('#donut-total').textContent = compactMoney(summary.revenue);
  $('#region-legend').innerHTML = regions.map((item) => `<div class="legend-row"><i class="legend-swatch" style="background:${REGION_COLORS[item.name] || '#ffffff'}"></i><span>${escapeHtml(item.name)}</span><strong>${pct((item.revenue / total) * 100)}</strong></div>`).join('');
}

function renderTable(summary) {
  const segments = Object.values(summary.bySegment).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  $('#performance-table').innerHTML = segments.map((item) => {
    const margin = item.revenue ? ((item.revenue - item.cost) / item.revenue) * 100 : 0;
    const returns = item.revenue ? (item.returns / item.revenue) * 1000 : 0;
    return `<tr><td>${escapeHtml(item.name)}</td><td>${compactMoney(item.revenue)}</td><td><span class="${margin >= 35 ? 'margin-good' : ''}">${pct(margin)}</span></td><td><span class="${returns >= 8 ? 'return-warn' : ''}">${returns.toFixed(1)} / ₹1K</span></td></tr>`;
  }).join('');
}

function renderInsight(summary, rows) {
  const categories = Object.values(summary.byCategory).sort((a, b) => b.revenue - a.revenue);
  const regions = Object.values(summary.byRegion).sort((a, b) => b.revenue - a.revenue);
  const bestMargin = [...categories].sort((a, b) => ((b.revenue - b.cost) / b.revenue) - ((a.revenue - a.cost) / a.revenue))[0];
  const change = periodChange(summary.byMonth);
  if (!categories.length || !regions.length) {
    $('#insight-title').textContent = 'No rows match this lens yet.';
    $('#insight-body').textContent = 'Reset the filters to return to the full demo snapshot.';
    return;
  }
  $('#insight-title').textContent = `${categories[0].name} is carrying this view.`;
  $('#insight-body').textContent = `${regions[0].name} contributes the largest regional share while ${bestMargin.name} protects the strongest margin at ${pct(((bestMargin.revenue - bestMargin.cost) / bestMargin.revenue) * 100)}. Revenue moved ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% from the first selected month to the last — a useful signal for the next product, pricing, or acquisition experiment.`;
  $('#row-count').textContent = rows.length.toLocaleString('en-IN');
}

function render() {
  const rows = filterRows();
  const summary = summarize(rows);
  renderKpis(summary, rows);
  renderTrend(summary);
  renderCategories(summary);
  renderRegions(summary);
  renderTable(summary);
  renderInsight(summary, rows);
  $('#period-output').textContent = `JAN — ${MONTHS[state.monthEnd - 1]}`;
}

function buildControls() {
  const regions = ['all', ...dataset.filters.regions];
  $('#region-filters').innerHTML = regions.map((region) => `<button type="button" class="filter-button ${region === 'all' ? 'active' : ''}" data-region="${region}">${region === 'all' ? 'All regions' : escapeHtml(region)}</button>`).join('');
  dataset.filters.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    $('#category-filter').appendChild(option);
  });
  $('#region-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-region]');
    if (!button) return;
    state.region = button.dataset.region;
    document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
    render();
  });
  $('#category-filter').addEventListener('change', (event) => { state.category = event.target.value; render(); });
  $('#period-filter').addEventListener('input', (event) => { state.monthEnd = Number(event.target.value); render(); });
  $('#reset-filters').addEventListener('click', () => {
    state.region = 'all';
    state.category = 'all';
    state.monthEnd = 12;
    $('#category-filter').value = 'all';
    $('#period-filter').value = '12';
    document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item.dataset.region === 'all'));
    render();
  });
}

async function init() {
  try {
    const response = await fetch('data/metrics.json');
    if (!response.ok) throw new Error(`Snapshot request failed: ${response.status}`);
    dataset = await response.json();
    buildControls();
    render();
  } catch (error) {
    document.querySelector('.dashboard').innerHTML = `<div class="load-error"><span class="panel-label">PIPELINE ERROR</span><h2>Could not load the snapshot.</h2><p>${escapeHtml(error.message)}. Run <code>python scripts/build_snapshot.py</code> and refresh.</p></div>`;
  }
}

init();
