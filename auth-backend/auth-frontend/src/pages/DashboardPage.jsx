// src/pages/DashboardPage.jsx
import React, { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [quoteData, setQuoteData] = useState([]);
  const [actives, setActives] = useState([]);
  const [sectorPerf, setSectorPerf] = useState([]);
  const [error, setError] = useState("");

  const lineRef = useRef(null);
  const barRef = useRef(null);

  // Fetch data dari Financial Modeling Prep
  useEffect(() => {
    async function fetchData() {
      try {
        const [quotes, active, sectors] = await Promise.all([
          fetch("https://financialmodelingprep.com/api/v3/quote/AAPL,MSFT,GOOGL,META").then(r => r.json()),
          fetch("https://financialmodelingprep.com/api/v3/stock_market/actives").then(r => r.json()),
          fetch("https://financialmodelingprep.com/api/v3/stock_market/sectors-performance").then(r => r.json()),
        ]);
        setQuoteData(quotes);
        setActives(active.slice(0, 6));
        setSectorPerf(sectors.slice(0, 12));
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dari API Finansial.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Draw line chart untuk sektor performance
  useEffect(() => {
    if (sectorPerf.length === 0) return;
    const ctx = lineRef.current.getContext("2d");
    const w = (lineRef.current.width = lineRef.current.clientWidth);
    const h = (lineRef.current.height = lineRef.current.clientHeight);
    const max = Math.max(...sectorPerf.map(s => s.changesPercentage));
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#00ff88";
      sectorPerf.forEach((s, i) => {
        const x = (i / (sectorPerf.length - 1)) * (w - 20) + 10;
        const y = h - ((s.changesPercentage / max) * (h - 20) * t + 10);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(0,255,100,0.2)");
      grad.addColorStop(1, "rgba(0,255,100,0)");
      ctx.lineTo(w - 10, h - 10);
      ctx.lineTo(10, h - 10);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      t += 0.03;
      if (t <= 1) requestAnimationFrame(draw);
    }
    draw();
  }, [sectorPerf]);

  // Draw bar chart untuk saham aktif
  useEffect(() => {
    if (actives.length === 0) return;
    const ctx = barRef.current.getContext("2d");
    const w = (barRef.current.width = barRef.current.clientWidth);
    const h = (barRef.current.height = barRef.current.clientHeight);
    const max = Math.max(...actives.map(a => a.changesPercentage));
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const gap = 16;
      const bw = (w - gap * (actives.length + 1)) / actives.length;
      actives.forEach((a, i) => {
        const x = gap + i * (bw + gap);
        const bh = ((a.changesPercentage / max) * (h - 30)) * t;
        ctx.fillStyle = "rgba(0,255,100,0.85)";
        ctx.fillRect(x, h - bh - 10, bw, bh);
      });
      t += 0.03;
      if (t <= 1) requestAnimationFrame(draw);
    }
    draw();
  }, [actives]);

  if (loading) return <div className="loading">Memuat data keuangan...</div>;
  if (error) return <div className="error">{error}</div>;

  const totalCap = quoteData.reduce((sum, q) => sum + (q.marketCap || 0), 0);
  const totalChange = quoteData.reduce((sum, q) => sum + q.changesPercentage, 0);
  const todayTop = actives[0];

  return (
    <>
      <div id="bg1"></div>
      <div id="bg2"></div>
      <div className="dashboard-grid">
        {/* === STAT CARDS === */}
        <div className="stat-card">
          <h3>Market Cap</h3>
          <p className="value">${(totalCap / 1e12).toFixed(2)}T</p>
        </div>
        <div className="stat-card">
          <h3>Active Stocks</h3>
          <p className="value">{actives.length}</p>
        </div>
        <div className="stat-card">
          <h3>Avg Change</h3>
          <p className="value">{totalChange.toFixed(2)}%</p>
        </div>
        <div className="stat-card">
          <h3>Top Gainer</h3>
          <p className="value">{todayTop ? todayTop.symbol : "—"}</p>
        </div>

        {/* === LINE CHART === */}
        <div className="chart-card line">
          <h3>Sector Performance</h3>
          <canvas ref={lineRef}></canvas>
        </div>

        {/* === BAR CHART === */}
        <div className="chart-card bar">
          <h3>Active Stocks %Change</h3>
          <canvas ref={barRef}></canvas>
        </div>

        {/* === PROJECTS === */}
        <div className="table-card">
          <h3>Active Stocks Overview</h3>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Change %</th>
              </tr>
            </thead>
            <tbody>
              {actives.map((a) => (
                <tr key={a.symbol}>
                  <td>{a.symbol}</td>
                  <td>${a.price.toFixed(2)}</td>
                  <td className={a.changesPercentage > 0 ? "pos" : "neg"}>
                    {a.changesPercentage.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* === ORDERS / UPDATES === */}
        <div className="list-card">
          <h3>Recent Quote Updates</h3>
          <ul>
            {quoteData.map((q) => (
              <li key={q.symbol}>
                <strong>{q.symbol}</strong>: ${q.price.toFixed(2)} —{" "}
                <span className={q.changesPercentage > 0 ? "pos" : "neg"}>
                  {q.changesPercentage.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
