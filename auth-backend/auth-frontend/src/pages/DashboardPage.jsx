// src/pages/DashboardPage.jsx
import React, { useEffect, useRef, useState } from "react";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState("");
  const lineRef = useRef(null);
  const barRef = useRef(null);

  // Fetch data dari CoinGecko API
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false"
        );

        if (!res.ok) throw new Error("Gagal memuat data");
        const data = await res.json();
        setCoins(data);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dari CoinGecko API.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Line chart (market cap)
  useEffect(() => {
    if (coins.length === 0) return;
    const ctx = lineRef.current.getContext("2d");
    const w = (lineRef.current.width = lineRef.current.clientWidth);
    const h = (lineRef.current.height = lineRef.current.clientHeight);
    const max = Math.max(...coins.map((c) => c.market_cap));
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#00ff99";
      coins.forEach((c, i) => {
        const x = (i / (coins.length - 1)) * (w - 20) + 10;
        const y = h - ((c.market_cap / max) * (h - 20) * t + 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(0,255,150,0.3)");
      grad.addColorStop(1, "rgba(0,255,150,0)");
      ctx.lineTo(w - 10, h - 10);
      ctx.lineTo(10, h - 10);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      t += 0.03;
      if (t < 1) requestAnimationFrame(draw);
    }
    draw();
  }, [coins]);

  // Bar chart (% change)
  useEffect(() => {
    if (coins.length === 0) return;
    const ctx = barRef.current.getContext("2d");
    const w = (barRef.current.width = barRef.current.clientWidth);
    const h = (barRef.current.height = barRef.current.clientHeight);
    const max = Math.max(...coins.map((c) => Math.abs(c.price_change_percentage_24h)));
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const gap = 16;
      const bw = (w - gap * (coins.length + 1)) / coins.length;
      coins.forEach((c, i) => {
        const x = gap + i * (bw + gap);
        const bh = ((Math.abs(c.price_change_percentage_24h) / max) * (h - 30)) * t;
        ctx.fillStyle = c.price_change_percentage_24h > 0 ? "rgba(0,255,100,0.85)" : "rgba(255,60,60,0.85)";
        ctx.fillRect(x, h - bh - 10, bw, bh);
      });
      t += 0.03;
      if (t < 1) requestAnimationFrame(draw);
    }
    draw();
  }, [coins]);

  if (loading) return <div className="loading">Memuat data keuangan...</div>;
  if (error) return <div className="error">{error}</div>;

  const totalCap = coins.reduce((sum, c) => sum + c.market_cap, 0);
  const avgChange = coins.reduce((sum, c) => sum + c.price_change_percentage_24h, 0) / coins.length;
  const topCoin = coins[0];

  return (
    <>
      <div id="bg1"></div>
      <div id="bg2"></div>

      <div className="dashboard-grid">
        {/* === STAT CARDS === */}
        <div className="stat-card">
          <h3>Total Market Cap</h3>
          <p className="value">${(totalCap / 1e12).toFixed(2)}T</p>
        </div>
        <div className="stat-card">
          <h3>Top Coin</h3>
          <p className="value">{topCoin?.name}</p>
        </div>
        <div className="stat-card">
          <h3>Avg 24h Change</h3>
          <p className={`value ${avgChange > 0 ? "pos" : "neg"}`}>{avgChange.toFixed(2)}%</p>
        </div>
        <div className="stat-card">
          <h3>Coins</h3>
          <p className="value">{coins.length}</p>
        </div>

        {/* === LINE CHART === */}
        <div className="chart-card line">
          <h3>Market Cap Overview</h3>
          <canvas ref={lineRef}></canvas>
        </div>

        {/* === BAR CHART === */}
        <div className="chart-card bar">
          <h3>24h Price Changes</h3>
          <canvas ref={barRef}></canvas>
        </div>

        {/* === TABLE === */}
        <div className="table-card">
          <h3>Top Coins Overview</h3>
          <table>
            <thead>
              <tr>
                <th>Coin</th>
                <th>Price</th>
                <th>Change 24h</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>${c.current_price.toLocaleString()}</td>
                  <td className={c.price_change_percentage_24h > 0 ? "pos" : "neg"}>
                    {c.price_change_percentage_24h.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* === LIST === */}
        <div className="list-card">
          <h3>Recent Updates</h3>
          <ul>
            {coins.map((c) => (
              <li key={c.id}>
                <strong>{c.symbol.toUpperCase()}</strong>: ${c.current_price.toLocaleString()} —{" "}
                <span className={c.price_change_percentage_24h > 0 ? "pos" : "neg"}>
                  {c.price_change_percentage_24h.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
