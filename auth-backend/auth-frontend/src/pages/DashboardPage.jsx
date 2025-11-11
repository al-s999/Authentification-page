import React, { useEffect, useRef, useState } from "react";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState(null);
  const [error, setError] = useState("");
  const lineRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers = {
          "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
          "x-rapidapi-key": "4694fcd259msh4ce08ee6b31d275p1bb825jsn3afa5f1e1c2a", // ganti dengan key kamu
        };

        const symbol = "AAPL"; // ambil 1 simbol agar tidak 429
        const res = await fetch(
          `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-timeseries?symbol=${symbol}&region=US`,
          { headers }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data?.timeseries?.length) throw new Error("Data kosong");

        // ambil 30 poin harga terakhir
        const points = data.timeseries
          .filter((p) => p.close)
          .slice(-30)
          .map((p) => p.close);

        setStock({
          symbol,
          prices: points,
          current: points[points.length - 1],
          prev: points[points.length - 2],
        });
      } catch (err) {
        console.error(err);
        setError("Gagal memuat data dari Yahoo Finance (429 atau invalid JSON).");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // === Chart line ===
  useEffect(() => {
    if (!stock) return;
    const ctx = lineRef.current.getContext("2d");
    const w = (lineRef.current.width = lineRef.current.clientWidth);
    const h = (lineRef.current.height = lineRef.current.clientHeight);
    const max = Math.max(...stock.prices);
    const min = Math.min(...stock.prices);
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#00ff99";
      stock.prices.forEach((v, i) => {
        const x = (i / (stock.prices.length - 1)) * (w - 20) + 10;
        const y = h - ((v - min) / (max - min)) * (h - 20) * t - 10;
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
  }, [stock]);

  if (loading) return <div className="loading">Memuat data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stock) return <div className="error">Tidak ada data tersedia.</div>;

  const change = ((stock.current - stock.prev) / stock.prev) * 100;

  return (
    <>
      <div id="bg1"></div>
      <div id="bg2"></div>
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Symbol</h3>
          <p className="value">{stock.symbol}</p>
        </div>
        <div className="stat-card">
          <h3>Current Price</h3>
          <p className="value">${stock.current.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Change</h3>
          <p className={`value ${change >= 0 ? "pos" : "neg"}`}>
            {change.toFixed(2)}%
          </p>
        </div>
        <div className="chart-card line" style={{ gridColumn: "span 3" }}>
          <h3>{stock.symbol} Price (Last 30 Days)</h3>
          <canvas ref={lineRef}></canvas>
        </div>
      </div>
    </>
  );
}
