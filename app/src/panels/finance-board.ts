// ============================================
// Finance Dashboard — Global Markets, Crypto, FOREX
// Powered by TradingView for 100% Live Coverage
// ============================================

export function initFinanceBoard() {
  const leftScreener = document.getElementById('tv-screener');
  const centerChart = document.getElementById('tv-chart');
  const rightCrypto = document.getElementById('tv-crypto');

  if (!leftScreener || !centerChart || !rightCrypto) return;

  setTimeout(() => {
    // 1. Left: Global Equities Stock Screener
    leftScreener.innerHTML = ''; // clear 
    const screenerScript = document.createElement('script');
    screenerScript.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    screenerScript.async = true;
    screenerScript.innerHTML = JSON.stringify({
      "width": "100%",
      "height": "100%",
      "defaultColumn": "overview",
      "defaultScreen": "general",
      "market": "america",
      "showToolbar": true,
      "colorTheme": "dark",
      "locale": "en",
      "isTransparent": true
    });
    leftScreener.appendChild(screenerScript);

    // 2. Right: Crypto Dashboard
    rightCrypto.innerHTML = '';
    const cryptoScript = document.createElement('script');
    cryptoScript.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    cryptoScript.async = true;
    cryptoScript.innerHTML = JSON.stringify({
      "width": "100%",
      "height": "100%",
      "defaultColumn": "overview",
      "screener_type": "crypto_mkt",
      "displayCurrency": "USD",
      "colorTheme": "dark",
      "locale": "en",
      "isTransparent": true
    });
    rightCrypto.appendChild(cryptoScript);

    // 3. Center: Ultimate All-in-One Dashboard (Chart + Profile + News)
    // 3. Center: Ultimate All-in-One Dashboard (Chart + Profile + News)
    if (centerChart) {
      centerChart.innerHTML = '';
      centerChart.style.display = 'flex';
      centerChart.style.flexDirection = 'column';

      // Native Header with Search
      const topBar = document.createElement('div');
      topBar.style.display = 'flex';
      topBar.style.padding = '12px 16px';
      topBar.style.background = 'rgba(0,0,0,0.4)';
      topBar.style.borderBottom = '1px solid var(--border-subtle)';
      topBar.style.alignItems = 'center';
      topBar.style.gap = '12px';

      const searchTitle = document.createElement('div');
      searchTitle.innerText = "🔍 TICKER SEARCH:";
      searchTitle.style.fontSize = "12px";
      searchTitle.style.color = "var(--text-muted)";
      searchTitle.style.fontWeight = "bold";

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = "Enter symbol (e.g. AAPL, BTCUSD)";
      searchInput.style.background = "rgba(255,255,255,0.05)";
      searchInput.style.border = "1px solid rgba(255,255,255,0.1)";
      searchInput.style.color = "white";
      searchInput.style.padding = "6px 12px";
      searchInput.style.borderRadius = "4px";
      searchInput.style.width = "300px";
      searchInput.style.fontFamily = "var(--font-mono)";

      const searchBtn = document.createElement('button');
      searchBtn.innerText = "LOAD";
      searchBtn.style.background = "rgba(0, 212, 255, 0.1)";
      searchBtn.style.border = "1px solid var(--accent-cyan)";
      searchBtn.style.color = "var(--accent-cyan)";
      searchBtn.style.padding = "6px 16px";
      searchBtn.style.borderRadius = "4px";
      searchBtn.style.cursor = "pointer";
      searchBtn.style.fontWeight = "bold";

      topBar.appendChild(searchTitle);
      topBar.appendChild(searchInput);
      topBar.appendChild(searchBtn);

      // Container for Symbol Info
      const headerDiv = document.createElement('div');
      headerDiv.style.flex = '0 0 auto';
      headerDiv.style.minHeight = '140px';

      // Container for Chart
      const chartDiv = document.createElement('div');
      chartDiv.style.flex = '1';
      chartDiv.style.width = '100%';
      chartDiv.style.position = 'relative';

      centerChart.appendChild(topBar);
      centerChart.appendChild(headerDiv);
      centerChart.appendChild(chartDiv);

      const renderTV = (symbol: string) => {
        let formattedSymbol = symbol.toUpperCase();
        if (!formattedSymbol.includes(':')) {
          // Best guess format for TradingView if user didn't specify exchange
          if (formattedSymbol.endsWith('USD') || formattedSymbol.endsWith('USDT') || formattedSymbol === 'BTC' || formattedSymbol === 'ETH') {
            formattedSymbol = `CRYPTO:${formattedSymbol}`;
          } else {
            formattedSymbol = `NASDAQ:${formattedSymbol}`;
          }
        }

        headerDiv.innerHTML = '';
        chartDiv.innerHTML = '';

        // 1. Symbol Info Widget
        const profileWrapper = document.createElement('div');
        profileWrapper.style.width = '100%';
        profileWrapper.style.height = '100%';
        headerDiv.appendChild(profileWrapper);

        const profileScript = document.createElement('script');
        profileScript.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
        profileScript.async = true;
        profileScript.innerHTML = JSON.stringify({
          "width": "100%",
          "colorTheme": "dark",
          "isTransparent": true,
          "symbol": formattedSymbol,
          "locale": "en"
        });
        profileWrapper.appendChild(profileScript);

        // 2. Advanced Chart Widget (with Profile and News)
        const chartId = `tv-chart-${Date.now()}`;
        const chartWrapper = document.createElement('div');
        chartWrapper.id = chartId;
        chartWrapper.style.width = "100%";
        chartWrapper.style.height = "100%";
        chartDiv.appendChild(chartWrapper);

        const renderAdvancedChart = () => {
          if ((window as any).TradingView) {
            new (window as any).TradingView.widget({
              "autosize": true,
              "symbol": formattedSymbol,
              "interval": "D",
              "timezone": "Etc/UTC",
              "theme": "dark",
              "style": "1",
              "locale": "en",
              "enable_publishing": false,
              "backgroundColor": "#000000",
              "gridColor": "rgba(42, 46, 57, 0.06)",
              "hide_top_toolbar": false,
              "hide_legend": false,
              "save_image": false,
              "container_id": chartId,
              "details": true,
              "hotlist": true,
              "calendar": true,
              "news": ["headlines", "financial_news", "profile"]
            });
          }
        };

        if ((window as any).TradingView) {
          renderAdvancedChart();
        } else {
          const tvScript = document.createElement('script');
          tvScript.src = "https://s3.tradingview.com/tv.js";
          tvScript.onload = renderAdvancedChart;
          document.body.appendChild(tvScript);
        }
      };

      searchBtn.addEventListener('click', () => {
        if (searchInput.value.trim() !== '') {
          renderTV(searchInput.value.trim());
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() !== '') {
          renderTV(searchInput.value.trim());
        }
      });

      // Initial Render
      renderTV("NASDAQ:NVDA");
    }
  }, 100);
}
