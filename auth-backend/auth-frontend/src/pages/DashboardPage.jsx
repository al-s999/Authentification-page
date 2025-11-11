// src/pages/DashboardPage.jsx
import React, { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState([]);
  const [error, setError] = useState("");
  const lineRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = {
          "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
          "x-rapidapi-key": "4694fcd259msh4ce08ee6b31d275p1bb825jsn3afa5f1e1c2a",
        };

        const symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META"];
        const promises = symbols.map((sym) =>
          fetch(
            `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-summary?symbol=${sym}&region=US`,
            { headers }
          ).then((r) => r.json())
        );

        const results = await Promise.all(promises);
        const formatted = results
          .filter((r) => r.price && r.price.regularMarketPrice)
          .map((r) => ({
            symbol: r.price.symbol,
            name: r.price.shortName,
            price: r.price.regularMarketPrice.raw,
            change: r.price.regularMarketChangePercent.raw,
            marketCap: r.price.marketCap?.raw ?? 0,
          }));

        setStocks(formatted);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dari Yahoo Finance API (RapidAPI).");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // === Line Chart: Market Cap ===
  useEffect(() => {
    if (stocks.length === 0) return;
    const ctx = lineRef.current.getContext("2d");
    const w = (lineRef.current.width = lineRef.current.clientWidth);
    const h = (lineRef.current.height = lineRef.current.clientHeight);
    const max = Math.max(...stocks.map((s) => s.marketCap));
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#00ff88";
      stocks.forEach((s, i) => {
        const x = (i / (stocks.length - 1)) * (w - 20) + 10;
        const y = h - ((s.marketCap / max) * (h - 20) * t + 10);
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
  }, [stocks]);

  // === Bar Chart: %Change ===
  useEffect(() => {
    if (stocks.length === 0) return;
    const ctx = barRef.current.getContext("2d");
    const w = (barRef.current.width = barRef.current.clientWidth);
    const h = (barRef.current.height = barRef.current.clientHeight);
    const max = Math.max(...stocks.map((s) => Math.abs(s.change)));
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const gap = 16;
      const bw = (w - gap * (stocks.length + 1)) / stocks.length;
      stocks.forEach((s, i) => {
        const x = gap + i * (bw + gap);
        const bh = ((Math.abs(s.change) / max) * (h - 30)) * t;
        ctx.fillStyle = s.change > 0 ? "rgba(0,255,100,0.85)" : "rgba(255,60,60,0.85)";
        ctx.fillRect(x, h - bh - 10, bw, bh);
      });
      t += 0.03;
      if (t <= 1) requestAnimationFrame(draw);
    }
    draw();
  }, [stocks]);

  if (loading) return <div className="loading">Memuat data saham...</div>;
  if (error) return <div className="error">{error}</div>;

  const totalCap = stocks.reduce((sum, s) => sum + s.marketCap, 0);
  const avgChange = stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length;

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
          <h3>Top Stock</h3>
          <p className="value">{stocks[0]?.symbol}</p>
        </div>
        <div className="stat-card">
          <h3>Avg Change</h3>
          <p className="value">{avgChange.toFixed(2)}%</p>
        </div>
        <div className="stat-card">
          <h3>Stocks</h3>
          <p className="value">{stocks.length}</p>
        </div>

        {/* === LINE CHART === */}
        <div className="chart-card line">
          <h3>Market Cap Overview</h3>
          <canvas ref={lineRef}></canvas>
        </div>

        {/* === BAR CHART === */}
        <div className="chart-card bar">
          <h3>Change % Overview</h3>
          <canvas ref={barRef}></canvas>
        </div>

        {/* === TABLE === */}
        <div className="table-card">
          <h3>Stock Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s) => (
                <tr key={s.symbol}>
                  <td>{s.symbol}</td>
                  <td>${s.price.toFixed(2)}</td>
                  <td className={s.change > 0 ? "pos" : "neg"}>{s.change.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* === LIST === */}
        <div className="list-card">
          <h3>Recent Stocks</h3>
          <ul>
            {stocks.map((s) => (
              <li key={s.symbol}>
                <strong>{s.symbol}</strong>: ${s.price.toFixed(2)} —{" "}
                <span className={s.change > 0 ? "pos" : "neg"}>{s.change.toFixed(2)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
