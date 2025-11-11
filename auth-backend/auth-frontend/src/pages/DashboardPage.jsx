import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import '../styles/dashboard.css';

function DashboardPage() {
  const [coins, setCoins] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [trending, setTrending] = useState([]);
  const [btcChart, setBtcChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [marketRes, globalRes, trendingRes, btcRes] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false'),
          fetch('https://api.coingecko.com/api/v3/global'),
          fetch('https://api.coingecko.com/api/v3/search/trending'),
          fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1')
        ]);

        const [marketData, globalJson, trendingJson, btcJson] = await Promise.all([
          marketRes.json(),
          globalRes.json(),
          trendingRes.json(),
          btcRes.json()
        ]);

        setCoins(marketData);
        setGlobalData(globalJson.data);
        setTrending(trendingJson.coins);
        setBtcChart(btcJson.prices.map(([time, price]) => ({
          time: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          price,
        })));
      } catch (error) {
        console.error('Gagal memuat data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) return <div className="loading">Loading data...</div>;

  return (
    <motion.div
      className="dashboard-container"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className="dashboard-header">
        <h2>Crypto Dashboard</h2>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      {/* === GLOBAL SUMMARY === */}
      <motion.div
        className="global-summary"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        {globalData && (
          <>
            <div className="summary-card"><h4>Total Market Cap</h4><p>${(globalData.total_market_cap.usd / 1e12).toFixed(2)}T</p></div>
            <div className="summary-card"><h4>24h Volume</h4><p>${(globalData.total_volume.usd / 1e9).toFixed(2)}B</p></div>
            <div className="summary-card"><h4>BTC Dominance</h4><p>{globalData.market_cap_percentage.btc.toFixed(1)}%</p></div>
            <div className="summary-card"><h4>Active Cryptos</h4><p>{globalData.active_cryptocurrencies.toLocaleString()}</p></div>
          </>
        )}
      </motion.div>

      {/* === BTC PRICE CHART === */}
      <motion.div
        className="chart-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <h3>📈 Bitcoin 24h Price Chart</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={btcChart}>
            <XAxis dataKey="time" stroke="#7fe0ff" tick={{ fontSize: 10 }} />
            <YAxis stroke="#7fe0ff" domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: 'rgba(0, 0, 30, 0.7)',
                border: 'none',
                borderRadius: '8px',
              }}
            />
            <Line type="monotone" dataKey="price" stroke="#00e0ff" strokeWidth={2} dot={false} animationDuration={1200} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* === MAIN TABLE === */}
      <motion.div
        className="main-table"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <h3>Top 20 Cryptocurrencies</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Coin</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <motion.tr
                key={coin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <td className="coin-cell">
                  <img src={coin.image} alt={coin.name} className="coin-icon" />
                  {coin.name}
                </td>
                <td>${coin.current_price.toLocaleString()}</td>
                <td className={coin.price_change_percentage_24h >= 0 ? 'pos' : 'neg'}>
                  {coin.price_change_percentage_24h.toFixed(2)}%
                </td>
                <td>${coin.market_cap.toLocaleString()}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* === TRENDING COINS === */}
      <motion.div
        className="trending-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <h3>🔥 Trending Coins</h3>
        <div className="trending-grid">
          {trending.map(({ item }) => (
            <motion.div
              key={item.id}
              className="trend-card"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <img src={item.small} alt={item.name} />
              <h4>{item.name}</h4>
              <p>Rank #{item.market_cap_rank}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default DashboardPage;
