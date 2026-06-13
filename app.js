/* =============================================
   SMART EXPENSE TRACKER — app.js
   Vanilla JS | Chart.js | localStorage
   ============================================= */

'use strict';

// ── Constants ────────────────────────────────

const CATEGORIES = [
  { name: 'Food & Dining',    emoji: '🍽️', color: '#f0647a' },
  { name: 'Transport',        emoji: '🚗', color: '#6c63ff' },
  { name: 'Shopping',         emoji: '🛍️', color: '#fbbf24' },
  { name: 'Housing',          emoji: '🏠', color: '#22d3a0' },
  { name: 'Entertainment',    emoji: '🎬', color: '#a78bfa' },
  { name: 'Health',           emoji: '💊', color: '#34d399' },
  { name: 'Education',        emoji: '📚', color: '#60a5fa' },
  { name: 'Utilities',        emoji: '💡', color: '#f97316' },
  { name: 'Travel',           emoji: '✈️', color: '#e879f9' },
  { name: 'Salary',           emoji: '💼', color: '#22d3a0' },
  { name: 'Freelance',        emoji: '💻', color: '#38bdf8' },
  { name: 'Investment',       emoji: '📈', color: '#a3e635' },
  { name: 'Other',            emoji: '📦', color: '#94a3b8' },
];

const STORAGE_KEY_TX      = 'spendly_transactions';
const STORAGE_KEY_BUDGETS = 'spendly_budgets';
const STORAGE_KEY_THEME   = 'spendly_theme';

// ── State ─────────────────────────────────────

let transactions = [];
let budgets      = [];
let currentType  = 'expense'; // for modal
let chartCategory = null;
let chartTrend    = null;
let chartDaily    = null;
let chartCompare  = null;

// ── Persist ───────────────────────────────────

function save() {
  localStorage.setItem(STORAGE_KEY_TX,      JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
}

function load() {
  try { transactions = JSON.parse(localStorage.getItem(STORAGE_KEY_TX))      || []; } catch { transactions = []; }
  try { budgets      = JSON.parse(localStorage.getItem(STORAGE_KEY_BUDGETS)) || []; } catch { budgets = []; }
}

// ── DOM Helpers ────────────────────────────────

const $ = (id) => document.getElementById(id);

function showToast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ── Theme ──────────────────────────────────────

function applyTheme() {
  const saved = localStorage.getItem(STORAGE_KEY_THEME);
  if (saved === 'light') document.body.classList.add('light');
}

$('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem(STORAGE_KEY_THEME, document.body.classList.contains('light') ? 'light' : 'dark');
  refreshCharts();
});

// ── Navigation ─────────────────────────────────

const views   = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const titles = { dashboard: 'Dashboard', transactions: 'Transactions', budgets: 'Budgets', analytics: 'Analytics' };

function switchView(viewName) {
  views.forEach(v => v.classList.toggle('active', v.id === `view-${viewName}`));
  navItems.forEach(n => n.classList.toggle('active', n.dataset.view === viewName));
  $('topbarTitle').textContent = titles[viewName] || viewName;
  closeSidebar();
  if (viewName === 'analytics') renderAnalytics();
  if (viewName === 'transactions') renderAllTx();
  if (viewName === 'budgets') renderBudgets();
}

navItems.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));

// link button in dashboard
document.querySelectorAll('.link-btn[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ── Sidebar (mobile) ───────────────────────────

const sidebar  = document.getElementById('sidebar');
const overlay  = $('overlay');

function openSidebar()  { sidebar.classList.add('open');  overlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('active'); }

$('hamburger').addEventListener('click', openSidebar);
$('sidebarClose').addEventListener('click', closeSidebar);
overlay.addEventListener('click', () => { closeSidebar(); closeAddModal(); closeBudgetModal(); });

// ── Category Helpers ───────────────────────────

function getCat(name) { return CATEGORIES.find(c => c.name === name) || CATEGORIES.at(-1); }

function populateCategorySelect(selectId) {
  const sel = $(selectId);
  sel.innerHTML = '';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = `${c.emoji} ${c.name}`;
    sel.appendChild(opt);
  });
}

function populateFilterCategory() {
  const sel = $('filterCategory');
  sel.innerHTML = '<option value="all">All Categories</option>';
  CATEGORIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

// ── Format ─────────────────────────────────────

function fmt(n) {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getMonthKey(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

// ── Add Transaction Modal ──────────────────────

function openAddModal() {
  $('addModal').classList.add('active');
  overlay.classList.add('active');
  const today = new Date().toISOString().split('T')[0];
  $('txDate').value = today;
}
function closeAddModal() {
  $('addModal').classList.remove('active');
  overlay.classList.remove('active');
  clearAddForm();
}
function clearAddForm() {
  $('txTitle').value = '';
  $('txAmount').value = '';
  $('txNote').value = '';
  setType('expense');
}
function setType(type) {
  currentType = type;
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
}

$('openAddModal').addEventListener('click', openAddModal);
$('closeAddModal').addEventListener('click', closeAddModal);
$('cancelAdd').addEventListener('click', closeAddModal);

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => setType(btn.dataset.type));
});

$('saveTransaction').addEventListener('click', () => {
  const title    = $('txTitle').value.trim();
  const amount   = parseFloat($('txAmount').value);
  const category = $('txCategory').value;
  const date     = $('txDate').value;
  const note     = $('txNote').value.trim();

  if (!title)        { showToast('Please enter a title.', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }
  if (!date)         { showToast('Select a date.', 'error'); return; }

  const tx = {
    id: Date.now().toString(),
    title, amount, category, date, note,
    type: currentType,
  };
  transactions.unshift(tx);
  save();
  closeAddModal();
  refresh();
  showToast(`${currentType === 'income' ? 'Income' : 'Expense'} added!`);
});

// ── Budget Modal ───────────────────────────────

function openBudgetModal() {
  $('budgetModal').classList.add('active');
  overlay.classList.add('active');
}
function closeBudgetModal() {
  $('budgetModal').classList.remove('active');
  overlay.classList.remove('active');
  $('budgetAmount').value = '';
}

$('openBudgetModal')?.addEventListener('click', openBudgetModal);
$('closeBudgetModal').addEventListener('click', closeBudgetModal);
$('cancelBudget').addEventListener('click', closeBudgetModal);

$('saveBudget').addEventListener('click', () => {
  const cat    = $('budgetCategory').value;
  const amount = parseFloat($('budgetAmount').value);
  if (!amount || amount <= 0) { showToast('Enter a valid budget.', 'error'); return; }

  const idx = budgets.findIndex(b => b.category === cat);
  if (idx >= 0) budgets[idx].amount = amount;
  else budgets.push({ category: cat, amount });
  save();
  closeBudgetModal();
  renderBudgets();
  showToast('Budget saved!');
});

// ── Totals ─────────────────────────────────────

function computeTotals() {
  let income = 0, expense = 0;
  transactions.forEach(t => {
    if (t.type === 'income')  income  += t.amount;
    if (t.type === 'expense') expense += t.amount;
  });
  return { income, expense, balance: income - expense };
}

// ── Dashboard Refresh ──────────────────────────

function updateStats() {
  const { income, expense, balance } = computeTotals();
  $('totalIncome').textContent  = fmt(income);
  $('totalExpense').textContent = fmt(expense);
  $('netBalance').textContent   = fmt(balance);
  $('txCount').textContent      = transactions.length;
  $('sidebarBalance').textContent = fmt(balance);
}

function renderRecentTx() {
  const list = $('recentList');
  const recent = transactions.slice(0, 6);
  list.innerHTML = recent.length ? '' : `<div class="empty-state"><p class="empty-icon">◌</p><p>No transactions yet. Add your first one!</p></div>`;
  recent.forEach(tx => list.appendChild(makeTxItem(tx)));
}

function makeTxItem(tx) {
  const cat  = getCat(tx.category);
  const div  = document.createElement('div');
  div.className = 'tx-item';
  div.innerHTML = `
    <div class="tx-icon" style="background:${cat.color}22">${cat.emoji}</div>
    <div class="tx-info">
      <div class="tx-title">${escHtml(tx.title)}</div>
      <div class="tx-meta">${fmtDate(tx.date)} · ${escHtml(tx.category)}${tx.note ? ' · ' + escHtml(tx.note) : ''}</div>
    </div>
    <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</div>
    <button class="tx-delete" data-id="${tx.id}" aria-label="Delete transaction">✕</button>
  `;
  div.querySelector('.tx-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTransaction(tx.id);
  });
  return div;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  refresh();
  showToast('Transaction deleted.', 'warn');
}

// ── All Transactions View ──────────────────────

let txFilters = { search: '', type: 'all', category: 'all', month: 'all' };

function renderAllTx() {
  populateMonthFilter();
  applyFilters();
}

function populateMonthFilter() {
  const months = [...new Set(transactions.map(t => getMonthKey(t.date)))].sort().reverse();
  const sel    = $('filterMonth');
  sel.innerHTML = '<option value="all">All Months</option>';
  months.forEach(m => {
    const [y, mo] = m.split('-');
    const label   = new Date(+y, +mo - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const opt     = document.createElement('option');
    opt.value = m; opt.textContent = label;
    sel.appendChild(opt);
  });
}

function applyFilters() {
  let list = [...transactions];
  if (txFilters.search)   list = list.filter(t => t.title.toLowerCase().includes(txFilters.search) || t.category.toLowerCase().includes(txFilters.search));
  if (txFilters.type !== 'all')     list = list.filter(t => t.type     === txFilters.type);
  if (txFilters.category !== 'all') list = list.filter(t => t.category === txFilters.category);
  if (txFilters.month !== 'all')    list = list.filter(t => getMonthKey(t.date) === txFilters.month);

  const el = $('allTxList');
  el.innerHTML = list.length ? '' : `<div class="empty-state"><p class="empty-icon">◌</p><p>No transactions match your filters.</p></div>`;
  list.forEach(tx => el.appendChild(makeTxItem(tx)));
}

$('searchInput').addEventListener('input',  e => { txFilters.search   = e.target.value.toLowerCase(); applyFilters(); });
$('filterType').addEventListener('change',  e => { txFilters.type     = e.target.value; applyFilters(); });
$('filterCategory').addEventListener('change', e => { txFilters.category = e.target.value; applyFilters(); });
$('filterMonth').addEventListener('change', e => { txFilters.month    = e.target.value; applyFilters(); });

// ── Export CSV ─────────────────────────────────

$('exportCSV').addEventListener('click', () => {
  if (!transactions.length) { showToast('Nothing to export.', 'warn'); return; }
  const rows  = [['ID','Title','Amount','Type','Category','Date','Note']];
  transactions.forEach(t => rows.push([t.id, t.title, t.amount, t.type, t.category, t.date, t.note || '']));
  const csv   = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob  = new Blob([csv], { type: 'text/csv' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href = url; a.download = 'spendly_export.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!');
});

$('clearAll').addEventListener('click', () => {
  if (!confirm('Delete all transactions? This cannot be undone.')) return;
  transactions = [];
  save();
  refresh();
  renderAllTx();
  showToast('All cleared.', 'warn');
});

// ── Budgets View ───────────────────────────────

function renderBudgets() {
  const thisMonth = getMonthKey(new Date().toISOString());
  const el        = $('budgetList');

  if (!budgets.length) {
    el.innerHTML = `<div class="empty-state"><p class="empty-icon">◌</p><p>No budgets set. Add one above!</p></div>`;
    return;
  }

  el.innerHTML = '';
  budgets.forEach(b => {
    const spent = transactions
      .filter(t => t.type === 'expense' && t.category === b.category && getMonthKey(t.date) === thisMonth)
      .reduce((s, t) => s + t.amount, 0);

    const pct   = Math.min((spent / b.amount) * 100, 100).toFixed(1);
    const cls   = spent > b.amount ? 'over' : spent / b.amount > 0.75 ? 'warn' : '';
    const cat   = getCat(b.category);

    const item  = document.createElement('div');
    item.className = 'budget-item';
    item.innerHTML = `
      <div class="budget-top">
        <span class="budget-cat">${cat.emoji} ${b.category}</span>
        <div class="budget-amounts">
          <span>${fmt(spent)} <span style="color:var(--text-muted)">/ ${fmt(b.amount)}</span></span>
          <button class="budget-delete" data-cat="${b.category}">✕</button>
        </div>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill ${cls}" style="width:${pct}%"></div>
      </div>
    `;
    item.querySelector('.budget-delete').addEventListener('click', () => {
      budgets = budgets.filter(bud => bud.category !== b.category);
      save();
      renderBudgets();
      showToast('Budget removed.', 'warn');
    });
    el.appendChild(item);
  });
}

// ── Charts ─────────────────────────────────────

function chartColors() {
  return getComputedStyle(document.documentElement);
}

function getCSSVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

/* Category Donut */
function renderCategoryChart() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const grouped  = {};
  expenses.forEach(t => { grouped[t.category] = (grouped[t.category] || 0) + t.amount; });

  const cats    = Object.keys(grouped);
  const vals    = cats.map(c => grouped[c]);
  const colors  = cats.map(c => getCat(c).color);
  const total   = vals.reduce((a, b) => a + b, 0);

  $('donutTotal').textContent = fmt(total);

  const legend = $('categoryLegend');
  legend.innerHTML = '';
  cats.forEach((c, i) => {
    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<span class="legend-dot" style="background:${colors[i]}"></span>${c}`;
    legend.appendChild(li);
  });

  if (chartCategory) chartCategory.destroy();
  const ctx = document.getElementById('categoryChart').getContext('2d');
  chartCategory = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats,
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: getCSSVar('--bg2') }]
    },
    options: {
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}`
          }
        }
      }
    }
  });
}

/* Monthly Trend Bar */
function renderTrendChart() {
  const yearSel = $('trendYear');
  const years   = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort().reverse();
  if (!years.length) years.push(new Date().getFullYear());

  // Populate year select if needed
  if (yearSel.options.length === 0 || yearSel.dataset.populated !== 'yes') {
    yearSel.innerHTML = '';
    years.forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; yearSel.appendChild(o); });
    yearSel.dataset.populated = 'yes';
  }

  const selectedYear = parseInt(yearSel.value) || years[0];
  const months = Array.from({ length: 12 }, (_, i) => i);
  const labels  = months.map(m => new Date(2000, m).toLocaleString('en-IN', { month: 'short' }));

  const expData = months.map(m => {
    return transactions.filter(t => t.type === 'expense' && new Date(t.date).getFullYear() === selectedYear && new Date(t.date).getMonth() === m)
                       .reduce((s, t) => s + t.amount, 0);
  });
  const incData = months.map(m => {
    return transactions.filter(t => t.type === 'income' && new Date(t.date).getFullYear() === selectedYear && new Date(t.date).getMonth() === m)
                       .reduce((s, t) => s + t.amount, 0);
  });

  if (chartTrend) chartTrend.destroy();
  const ctx = document.getElementById('trendChart').getContext('2d');
  chartTrend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',  data: incData, backgroundColor: 'rgba(34,211,160,0.7)', borderRadius: 6 },
        { label: 'Expense', data: expData, backgroundColor: 'rgba(240,100,122,0.7)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: getCSSVar('--text-muted'), font: { family: 'Inter', size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: getCSSVar('--text-muted') }, grid: { color: getCSSVar('--border') } },
        y: { ticks: { color: getCSSVar('--text-muted'), callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) },
             grid: { color: getCSSVar('--border') } }
      }
    }
  });
}

$('trendYear').addEventListener('change', renderTrendChart);

/* Daily chart (last 30 days) */
function renderDailyChart() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const labels = days.map(d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
  const data   = days.map(d => transactions.filter(t => t.type === 'expense' && t.date === d).reduce((s, t) => s + t.amount, 0));

  if (chartDaily) chartDaily.destroy();
  const ctx = document.getElementById('dailyChart').getContext('2d');
  chartDaily = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Spend',
        data,
        fill: true,
        tension: 0.4,
        borderColor: '#6c63ff',
        backgroundColor: 'rgba(108,99,255,0.12)',
        pointRadius: 3,
        pointBackgroundColor: '#6c63ff',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: getCSSVar('--text-muted'), maxRotation: 45, font: { size: 10 } }, grid: { color: getCSSVar('--border') } },
        y: { ticks: { color: getCSSVar('--text-muted'), callback: v => '₹' + v }, grid: { color: getCSSVar('--border') } }
      }
    }
  });
}

/* Compare chart */
function renderCompareChart() {
  const monthSet = [...new Set(transactions.map(t => getMonthKey(t.date)))].sort();
  const labels   = monthSet.map(m => { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' }); });
  const incData  = monthSet.map(m => transactions.filter(t => t.type === 'income'  && getMonthKey(t.date) === m).reduce((s, t) => s + t.amount, 0));
  const expData  = monthSet.map(m => transactions.filter(t => t.type === 'expense' && getMonthKey(t.date) === m).reduce((s, t) => s + t.amount, 0));

  if (chartCompare) chartCompare.destroy();
  const ctx = document.getElementById('compareChart').getContext('2d');
  chartCompare = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',  data: incData, backgroundColor: 'rgba(34,211,160,0.7)', borderRadius: 6 },
        { label: 'Expense', data: expData, backgroundColor: 'rgba(240,100,122,0.7)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: getCSSVar('--text-muted'), font: { family: 'Inter', size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: getCSSVar('--text-muted') }, grid: { color: getCSSVar('--border') } },
        y: { ticks: { color: getCSSVar('--text-muted'), callback: v => '₹' + (v >= 1000 ? (v/1000).toFixed(1) + 'k' : v) },
             grid: { color: getCSSVar('--border') } }
      }
    }
  });
}

// ── Analytics Stats ────────────────────────────

function renderAnalytics() {
  const expenses = transactions.filter(t => t.type === 'expense');

  // Highest spend day
  const byDay = {};
  expenses.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.amount; });
  const maxDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];
  $('highDayVal').textContent = maxDay ? `${fmtDate(maxDay[0])} · ${fmt(maxDay[1])}` : '—';

  // Top category
  const byCat = {};
  expenses.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  $('topCatVal').textContent = topCat ? `${getCat(topCat[0]).emoji} ${topCat[0]}` : '—';

  // Avg daily
  const days      = Object.keys(byDay);
  const avgDaily  = days.length ? expenses.reduce((s, t) => s + t.amount, 0) / days.length : 0;
  $('avgDayVal').textContent = fmt(avgDaily) + '/day';

  // Savings rate
  const { income, expense } = computeTotals();
  const rate = income > 0 ? (((income - expense) / income) * 100).toFixed(1) + '%' : '—';
  $('savingsRate').textContent = rate;

  renderDailyChart();
  renderCompareChart();
}

function refreshCharts() {
  renderCategoryChart();
  renderTrendChart();
  const analyticsActive = document.getElementById('view-analytics').classList.contains('active');
  if (analyticsActive) renderAnalytics();
}

// ── Full Refresh ───────────────────────────────

function refresh() {
  updateStats();
  renderRecentTx();
  refreshCharts();
  renderBudgets();
}

// ── Seed Demo Data (first time) ────────────────

function seedDemoData() {
  if (localStorage.getItem('spendly_seeded')) return;

  const today = new Date();
  const ago = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const demo = [
    { title: 'Monthly Salary',      amount: 75000, type: 'income',  category: 'Salary',         date: ago(28), note: 'Full month pay' },
    { title: 'Freelance Project',   amount: 18000, type: 'income',  category: 'Freelance',       date: ago(15), note: 'UI design work' },
    { title: 'House Rent',          amount: 18000, type: 'expense', category: 'Housing',         date: ago(27), note: 'June rent' },
    { title: 'Grocery Shopping',    amount: 3200,  type: 'expense', category: 'Food & Dining',   date: ago(25), note: '' },
    { title: 'Electricity Bill',    amount: 1450,  type: 'expense', category: 'Utilities',       date: ago(20), note: '' },
    { title: 'Cab to Office',       amount: 560,   type: 'expense', category: 'Transport',       date: ago(18), note: '' },
    { title: 'Movie Night',         amount: 800,   type: 'expense', category: 'Entertainment',   date: ago(14), note: 'PVR with friends' },
    { title: 'Online Course',       amount: 2999,  type: 'expense', category: 'Education',       date: ago(12), note: 'React course' },
    { title: 'Restaurant Dinner',   amount: 1800,  type: 'expense', category: 'Food & Dining',   date: ago(10), note: 'Birthday dinner' },
    { title: 'Metro Card Recharge', amount: 300,   type: 'expense', category: 'Transport',       date: ago(8),  note: '' },
    { title: 'Amazon Shopping',     amount: 4500,  type: 'expense', category: 'Shopping',        date: ago(6),  note: 'Headphones' },
    { title: 'Doctor Visit',        amount: 600,   type: 'expense', category: 'Health',          date: ago(4),  note: 'Checkup' },
    { title: 'Street Food',         amount: 220,   type: 'expense', category: 'Food & Dining',   date: ago(2),  note: '' },
    { title: 'SIP Investment',      amount: 5000,  type: 'expense', category: 'Investment',      date: ago(1),  note: 'Mutual fund' },
  ];

  demo.forEach(t => transactions.push({ id: Date.now().toString() + Math.random(), ...t }));
  budgets = [
    { category: 'Food & Dining',  amount: 8000 },
    { category: 'Transport',      amount: 2000 },
    { category: 'Entertainment',  amount: 3000 },
    { category: 'Shopping',       amount: 5000 },
  ];
  save();
  localStorage.setItem('spendly_seeded', '1');
}

// ── Init ───────────────────────────────────────

function init() {
  applyTheme();
  load();
  seedDemoData();

  populateCategorySelect('txCategory');
  populateCategorySelect('budgetCategory');
  populateFilterCategory();

  // Default date today
  $('txDate').value = new Date().toISOString().split('T')[0];

  refresh();
  renderAllTx();
  renderBudgets();
}

init();
