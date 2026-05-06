let chartInstance = null;

let currentSymbol = null;
let refreshInterval = null;
let currentTimeframe = '1d';
let searchTimeout = null;

const glossaryDict = {
    marketCap: { title: "Market Capitalization", desc: "The total market value of all a company's outstanding shares. It shows the company's size." },
    pe: { title: "P/E Ratio", desc: "Price-to-Earnings Ratio. Measures current share price relative to its per-share earnings. High P/E could mean overvalued." },
    pb: { title: "P/B Ratio", desc: "Price-to-Book Ratio. Compares the market valuation to its book value. Under 1.0 could mean undervalued." },
    roe: { title: "Return on Equity (ROE)", desc: "A measure of financial performance. It shows how efficiently a company uses shareholders' equity to generate profits." },
    debtToEquity: { title: "Debt to Equity", desc: "Calculates the weight of total debt and financial liabilities against total shareholder equity." },
    bookValue: { title: "Book Value", desc: "The net asset value of a company, calculated as total assets minus intangible assets and liabilities." },
    divYield: { title: "Dividend Yield", desc: "A financial ratio that shows how much a company pays out in dividends each year relative to its stock price." },
    fiftyTwoWeekHigh: { title: "52-Week High", desc: "The highest price at which a stock has traded during the previous 52 weeks." },
    fiftyTwoWeekLow: { title: "52-Week Low", desc: "The lowest price at which a stock has traded during the previous 52 weeks." }
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    document.getElementById('logo-btn').addEventListener('click', showOverview);
    document.getElementById('back-btn').addEventListener('click', showOverview);
    document.getElementById('nav-dashboard').addEventListener('click', showOverview);
    
    document.querySelectorAll('.watchlist-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const sym = e.target.getAttribute('data-sym');
            loadStockDetail(sym);
        });
    });

    const searchBtn = document.getElementById('search-btn');
    const symbolInput = document.getElementById('symbol-input');
    const dropdown = document.getElementById('search-dropdown');
    
    searchBtn.addEventListener('click', () => {
        let symbol = symbolInput.value.trim().toUpperCase();
        if (symbol) {
            if (!symbol.includes('.')) symbol = symbol + '.NS';
            dropdown.classList.add('hidden');
            loadStockDetail(symbol);
        }
    });

    symbolInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    symbolInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 2) {
            dropdown.classList.add('hidden');
            return;
        }
        searchTimeout = setTimeout(() => fetchAutocomplete(query), 300);
    });

    document.addEventListener('click', (e) => {
        if (!symbolInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    document.querySelectorAll('#timeframe-filters button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('#timeframe-filters button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeframe = e.target.getAttribute('data-tf');
            fetchStockData(currentSymbol);
        });
    });

    document.querySelectorAll('.glossary-term').forEach(el => {
        el.addEventListener('click', (e) => {
            const term = e.target.getAttribute('data-term');
            const info = glossaryDict[term];
            if (info) {
                document.getElementById('glossary-title').textContent = info.title;
                document.getElementById('glossary-desc').textContent = info.desc;
                document.getElementById('glossary-modal').classList.remove('hidden');
            }
        });
    });
    
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('glossary-modal').classList.add('hidden');
    });

    showOverview();
}

async function fetchAutocomplete(query) {
    const dropdown = document.getElementById('search-dropdown');
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        dropdown.innerHTML = '';
        if (data.results && data.results.length > 0) {
            data.results.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = `<span class="ac-name">${item.name}</span> <span class="ac-sym">${item.symbol}</span>`;
                div.addEventListener('click', () => {
                    document.getElementById('symbol-input').value = item.symbol;
                    dropdown.classList.add('hidden');
                    loadStockDetail(item.symbol);
                });
                dropdown.appendChild(div);
            });
            dropdown.classList.remove('hidden');
        } else {
            dropdown.innerHTML = '<div class="autocomplete-item"><span class="ac-name" style="color:var(--text-muted)">No matching stocks found</span></div>';
            dropdown.classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
    }
}

function showOverview() {
    document.getElementById('view-detail').classList.add('hidden');
    document.getElementById('view-overview').classList.remove('hidden');
    if (refreshInterval) clearInterval(refreshInterval);
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-dashboard').classList.add('active');
    loadMarketOverview();
}

async function loadMarketOverview() {
    const grid = document.getElementById('market-overview-grid');
    grid.innerHTML = '<div class="loading-text">Loading Market Data...</div>';
    
    const topStocks = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'SBIN.NS'];
    
    try {
        const promises = topStocks.map(sym => fetch(`/api/info?symbol=${sym}`).then(res => res.json()));
        const results = await Promise.all(promises);
        
        grid.innerHTML = '';
        results.forEach(data => {
            if (data.error) return;
            
            const price = data.current_price;
            const prev = data.performance.prevClose;
            const pct = (((price - prev) / prev) * 100).toFixed(2);
            const colorClass = pct >= 0 ? 'change-up' : 'change-down';
            
            const card = document.createElement('div');
            card.className = 'market-card';
            card.innerHTML = `
                <h3>${data.name.substring(0, 25)}</h3>
                <div class="market-price">₹${price}</div>
                <div class="market-change ${colorClass}">${pct >= 0 ? '+' : ''}${pct}%</div>
            `;
            card.addEventListener('click', () => loadStockDetail(data.symbol));
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = '<div class="error-banner">Failed to load market overview</div>';
    }
}

async function loadStockDetail(symbol) {
    currentSymbol = symbol;
    document.getElementById('view-overview').classList.add('hidden');
    document.getElementById('view-detail').classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    showLoading(true);
    if (refreshInterval) clearInterval(refreshInterval);
    
    try {
        await Promise.all([
            fetchCompanyInfo(symbol),
            fetchStockData(symbol),
            fetchFinancials(symbol)
        ]);
        
        refreshInterval = setInterval(() => fetchStockData(symbol, true), 60000);
    } catch (e) {
        console.error(e);
    } finally {
        showLoading(false);
    }
}

async function fetchCompanyInfo(symbol) {
    const response = await fetch(`/api/info?symbol=${encodeURIComponent(symbol)}`);
    const data = await response.json();
    if (data.error) return;
    
    document.getElementById('company-name').textContent = data.name;
    document.getElementById('company-sector').textContent = data.sector;
    document.getElementById('company-symbol').textContent = data.symbol;
    
    const price = data.current_price;
    const prev = data.performance.prevClose;
    document.getElementById('current-price-val').textContent = price;
    
    if(prev && prev !== "N/A" && price && price !== "N/A") {
        const pct = (((price - prev) / prev) * 100).toFixed(2);
        const changeEl = document.getElementById('price-change-val');
        changeEl.textContent = `(${pct >= 0 ? '+' : ''}${pct}%)`;
        changeEl.style.color = pct >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    }

    document.getElementById('stat-open').textContent = data.performance.open;
    document.getElementById('stat-prev-close').textContent = data.performance.prevClose;
    document.getElementById('stat-day-low').textContent = data.performance.dayLow;
    document.getElementById('stat-day-high').textContent = data.performance.dayHigh;
    document.getElementById('stat-volume').textContent = formatLargeNumber(data.performance.volume);
    document.getElementById('stat-bid').textContent = data.performance.bid;
    document.getElementById('stat-ask').textContent = data.performance.ask;

    document.getElementById('fund-mcap').textContent = formatLargeNumber(data.fundamentals.marketCap);
    document.getElementById('fund-pe').textContent = data.fundamentals.pe;
    document.getElementById('fund-pb').textContent = data.fundamentals.pb;
    document.getElementById('fund-roe').textContent = data.fundamentals.roe ? (data.fundamentals.roe * 100).toFixed(2) + '%' : 'N/A';
    document.getElementById('fund-dte').textContent = data.fundamentals.debtToEquity;
    document.getElementById('fund-bv').textContent = data.fundamentals.bookValue;
    document.getElementById('fund-dy').textContent = data.fundamentals.divYield ? (data.fundamentals.divYield * 100).toFixed(2) + '%' : 'N/A';
    document.getElementById('fund-52h').textContent = data.fundamentals.fiftyTwoWeekHigh;
    document.getElementById('fund-52l').textContent = data.fundamentals.fiftyTwoWeekLow;
}

async function fetchFinancials(symbol) {
    const response = await fetch(`/api/financials?symbol=${encodeURIComponent(symbol)}`);
    const data = await response.json();
    const container = document.getElementById('financials-container');
    if (data.error || !data.financials) {
        container.innerHTML = '<p>No financial data available.</p>';
        return;
    }
    
    container.innerHTML = '';
    data.financials.forEach(f => {
        container.innerHTML += `
            <div class="fin-row">
                <strong>${f.date}</strong>
                <span>Rev: ₹${formatLargeNumber(f.totalRevenue)}</span>
                <span>Net: ₹${formatLargeNumber(f.netIncome)}</span>
            </div>
        `;
    });
}

async function fetchStockData(symbol, silent = false) {
    const response = await fetch(`/api/data?symbol=${encodeURIComponent(symbol)}&timeframe=${currentTimeframe}`);
    const data = await response.json();
    if (data.error) return;

    renderChart(data.dates, data.prices, data.sma_20, data.sma_50);
    updatePredictions(data.predictions);
    
    const currPrice = parseFloat(document.getElementById('current-price-val').textContent);
    if (!isNaN(currPrice) && data.predictions && data.predictions.rnn) {
        const avgPred = (data.predictions.rnn + data.predictions.lstm + data.predictions.gru) / 3;
        const diff = ((avgPred - currPrice) / currPrice) * 100;
        
        const badge = document.getElementById('rec-badge');
        badge.className = 'rec-badge'; 
        
        if (diff > 0.05) {
            badge.textContent = 'BUY';
            badge.classList.add('rec-BUY');
        } else if (diff < -0.05) {
            badge.textContent = 'SELL';
            badge.classList.add('rec-SELL');
        } else {
            badge.textContent = 'HOLD';
            badge.classList.add('rec-HOLD');
        }
    }
}

function updatePredictions(predictions) {
    const formatPrice = (price) => price ? price.toFixed(2) : "--";
    if (!predictions) return;
    document.getElementById('rnn-pred').textContent = formatPrice(predictions.rnn);
    document.getElementById('lstm-pred').textContent = formatPrice(predictions.lstm);
    document.getElementById('gru-pred').textContent = formatPrice(predictions.gru);
}

function renderChart(dates, prices, sma20, sma50) {
    const ctx = document.getElementById('stockChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 400);
    gradientFill.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradientFill.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Price',
                    data: prices,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientFill,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'SMA 20',
                    data: sma20,
                    borderColor: 'rgba(16, 185, 129, 0.7)',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'SMA 50',
                    data: sma50,
                    borderColor: 'rgba(139, 92, 246, 0.7)',
                    borderWidth: 1.5,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0' }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8b949e', maxTicksLimit: 10 }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8b949e' }
                }
            }
        }
    });
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) overlay.classList.remove('hidden');
    else overlay.classList.add('hidden');
}

function formatLargeNumber(num) {
    if (!num || num === "N/A" || isNaN(num)) return "N/A";
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e7) return (num / 1e7).toFixed(2) + 'Cr';
    if (num >= 1e5) return (num / 1e5).toFixed(2) + 'L';
    return num.toLocaleString();
}
