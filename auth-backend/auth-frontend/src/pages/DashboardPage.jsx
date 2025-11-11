// src/pages/DashboardPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function formatMoney(n) {
  try {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  } catch {
    return `$${Math.round(n).toLocaleString('en-US')}`;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState({ total: 0, list: [] });
  const [carts, setCarts] = useState({ total: 0, list: [] });
  const [products, setProducts] = useState({ avgRating: 0 });
  const [error, setError] = useState('');

  const lineCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ---- Fetch data from public APIs (DummyJSON) ----
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [usersRes, cartsRes, productsRes] = await Promise.all([
          fetch('https://dummyjson.com/users?limit=100'),
          fetch('https://dummyjson.com/carts?limit=100'),
          fetch('https://dummyjson.com/products?limit=100'),
        ]);

        const usersJson = await usersRes.json();
        const cartsJson = await cartsRes.json();
        const productsJson = await productsRes.json();

        if (!isMounted) return;

        setUsers({ total: usersJson.total ?? usersJson.users?.length ?? 0, list: usersJson.users ?? [] });
        setCarts({
          total: cartsJson.total ?? cartsJson.carts?.length ?? 0,
          list: cartsJson.carts ?? [],
        });

        const ratings = (productsJson.products ?? []).map(p => p.rating ?? 0);
        const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        setProducts({ avgRating: avg });
      } catch (e) {
        setError('Gagal memuat data dari API publik.');
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // ---- Derived metrics ----
  const metrics = useMemo(() => {
    // Total sales (semua cart)
    const totalSales = carts.list.reduce((sum, c) => sum + (c.discountedTotal ?? c.total ?? 0), 0);

    // Today's money (ambil 5 cart terakhir sebagai "hari ini")
    const lastFive = [...carts.list].slice(-5);
    const todaysMoney = lastFive.reduce((sum, c) => sum + (c.discountedTotal ?? c.total ?? 0), 0);

    // New clients (unique userId dari 5 cart terakhir)
    const newClients = new Set(lastFive.map(c => c.userId)).size;

    // Active users (sekadar sample: total users), clicks/sales/items dari agregasi carts
    const clicks = carts.list.reduce((acc, c) => acc + (c.totalProducts ?? 0), 0) * 75; // pseudo-metric
    const salesCount = carts.list.length;
    const items = carts.list.reduce((acc, c) => acc + (c.totalQuantity ?? 0), 0);

    // Satisfaction & safety (skala 0-100 & 0-10) dari rata-rata rating produk
    const satisfaction = Math.round((products.avgRating / 5) * 100);
    const safety = (products.avgRating / 5) * 10;

    // Referral (pseudo, berdasar karakteristik users)
    const invited = Math.min(users.total, 145); // batasi agar tidak berlebihan
    const bonus = Math.round(invited * 10.1);

    return {
      totalSales,
      todaysMoney,
      newClients,
      totalUsers: users.total,
      satisfaction,
      safety,
      active: { users: users.total, clicks, sales: salesCount, items },
      referral: { invited, bonus },
    };
  }, [users, carts, products]);

  // ---- chart helpers ----
  const lineData = useMemo(() => {
    // Buat 12 titik "Sales overview" dari carts: rata-rata per "bulan" sintetis
    const points = Array.from({ length: 12 }, (_, i) => {
      const slice = carts.list.filter((_, idx) => idx % 12 === i);
      const sum = slice.reduce((s, c) => s + (c.discountedTotal ?? c.total ?? 0), 0);
      return Math.round(sum / Math.max(1, slice.length));
    });
    return points;
  }, [carts]);

  const barData = useMemo(() => {
    // 8 batang untuk "Active Users" style—pakai totalQuantity per kelompok
    const groups = 8;
    return Array.from({ length: groups }, (_, g) => {
      const slice = carts.list.filter((_, idx) => idx % groups === g);
      const qty = slice.reduce((s, c) => s + (c.totalQuantity ?? 0), 0);
      return qty;
    });
  }, [carts]);

  // ---- animate charts (simple canvas) ----
  useEffect(() => {
    // line
    const cvs = lineCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width = cvs.clientWidth;
    const h = cvs.height = cvs.clientHeight;

    const maxV = Math.max(...lineData, 1);
    let t = 0; // 0..1
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(127,255,0,0.9)';
      ctx.beginPath();
      lineData.forEach((v, i) => {
        const x = (i / (lineData.length - 1)) * (w - 20) + 10;
        const y = h - (v / maxV) * (h - 20) * t - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // fill
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(127,255,0,0.25)');
      grad.addColorStop(1, 'rgba(127,255,0,0.0)');
      ctx.lineTo(w - 10, h - 10);
      ctx.lineTo(10, h - 10);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      t += 0.025;
      if (t < 1) requestAnimationFrame(draw);
    }
    draw();
  }, [lineData]);

  useEffect(() => {
    // bar
    const cvs = barCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width = cvs.clientWidth;
    const h = cvs.height = cvs.clientHeight;

    const maxV = Math.max(...barData, 1);
    let t = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const gap = 16;
      const bw = (w - gap * (barData.length + 1)) / barData.length;
      barData.forEach((v, i) => {
        const x = gap + i * (bw + gap);
        const target = (v / maxV) * (h - 20);
        const bh = target * t;
        ctx.fillStyle = 'rgba(127,255,0,0.85)';
        ctx.fillRect(x, h - bh - 10, bw, bh);
      });
      t += 0.03;
      if (t < 1) requestAnimationFrame(draw);
    }
    draw();
  }, [barData]);

  if (loading) {
    return <div style={{ color: 'white', textAlign: 'center', paddingTop: 80 }}>Memuat dashboard…</div>;
  }
  if (error) {
    return (
      <div style={{ color: 'white', textAlign: 'center', paddingTop: 80 }}>
        <p>{error}</p>
        <button onClick={handleLogout}>Kembali</button>
      </div>
    );
  }

  return (
    <>
      {/* Background sama seperti halaman auth (pakai style dari index.css) */}
      <div id="bg1"></div>
      <div id="bg2"></div>

      <div className="dashboard" style={{ width: '95%', maxWidth: 1280 }}>
        {/* Top Stats */}
        <div className="container" style={{ maxWidth: 'unset' }}>
          <h2 style={{ marginBottom: 10 }}>Dashboard</h2>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{formatMoney(metrics.todaysMoney)}</div>
              <div className="stat-label">Today's Money</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{metrics.totalUsers.toLocaleString()}</div>
              <div className="stat-label">Today's Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">+{metrics.newClients.toLocaleString()}</div>
              <div className="stat-label">New Clients</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatMoney(metrics.totalSales)}</div>
              <div className="stat-label">Total Sales</div>
            </div>
          </div>
        </div>

        {/* Greeting + Satisfaction + Referral + Safety */}
        <div className="container" style={{ flex: '1 1 380px' }}>
          <h2>Welcome back</h2>
          <p style={{ opacity: 0.8, marginTop: 6 }}>Glad to see you again! Ask me anything.</p>
        </div>
        <div className="container" style={{ flex: '1 1 380px' }}>
          <h2>Satisfaction Rate</h2>
          <div className="countdown" style={{ marginTop: 30 }}>
            <div className="countdown-item">
              <div className="countdown-value">{metrics.satisfaction}%</div>
              <div className="countdown-label">Based on ratings</div>
            </div>
          </div>
        </div>
        <div className="container" style={{ flex: '1 1 380px' }}>
          <h2>Referral Tracking</h2>
          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{metrics.referral.invited}</div>
              <div className="stat-label">Invited people</div>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>{metrics.referral.bonus}</div>
              <div className="stat-label">Bonus</div>
            </div>
          </div>
        </div>
        <div className="container" style={{ flex: '1 1 280px' }}>
          <h2>Safety</h2>
          <div className="countdown" style={{ marginTop: 30 }}>
            <div className="countdown-item">
              <div className="countdown-value">{metrics.safety.toFixed(1)}</div>
              <div className="countdown-label">Total Score</div>
            </div>
          </div>
        </div>

        {/* Sales overview (Line) */}
        <div className="container" style={{ flex: '1 1 680px' }}>
          <h2>Sales overview</h2>
          <div className="line-chart">
            <canvas ref={lineCanvasRef} />
          </div>
        </div>

        {/* Active Users (Bar) */}
        <div className="container" style={{ flex: '1 1 480px' }}>
          <h2>Active Users</h2>
          <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
            <div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{metrics.active.users.toLocaleString()}</div>
              <div className="stat-label">Users</div>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{Math.round(metrics.active.clicks).toLocaleString()}</div>
              <div className="stat-label">Clicks</div>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{metrics.active.sales.toLocaleString()}</div>
              <div className="stat-label">Sales</div>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{metrics.active.items.toLocaleString()}</div>
              <div className="stat-label">Items</div>
            </div>
          </div>
          <div className="line-chart" style={{ marginTop: 10, height: 220 }}>
            <canvas ref={barCanvasRef} />
          </div>
        </div>

        {/* Projects / Orders overview */}
        <div className="container" style={{ flex: '1 1 680px' }}>
          <h2>Projects</h2>
          <table className="data-table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Members</th>
                <th>Budget</th>
                <th>Completion</th>
              </tr>
            </thead>
            <tbody>
              {carts.list.slice(0, 6).map((c, i) => (
                <tr key={c.id}>
                  <td>Cart #{c.id}</td>
                  <td>{Array.from({ length: Math.min(5, c.totalProducts ?? 1) }).map((_, idx) => '👤').join(' ')}</td>
                  <td>{formatMoney(c.discountedTotal ?? c.total ?? 0)}</td>
                  <td>{Math.min(100, (c.totalQuantity ?? 0) * 5)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="container" style={{ flex: '1 1 480px' }}>
          <h2>Orders overview</h2>
          <ul style={{ marginTop: 10, listStyle: 'none', padding: 0 }}>
            {carts.list.slice(-6).reverse().map(c => (
              <li key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.2)' }}>
                <div style={{ fontWeight: 700 }}>{formatMoney(c.discountedTotal ?? c.total ?? 0)}</div>
                <div style={{ opacity: .85 }}>User #{c.userId} • {c.totalProducts} products • {c.totalQuantity} items</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer actions */}
        <div className="container" style={{ maxWidth: 'unset' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <small>Data source: dummyjson.com (users, carts, products)</small>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </>
  );
}
