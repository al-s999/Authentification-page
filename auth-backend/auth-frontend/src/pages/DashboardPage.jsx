import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import '../styles/dashboard.css';

const WEATHER_API_KEY = '297c5a3dfd625198a0a24b428105526e'

function DashboardPage() {
  // ==== STATE CRYPTO ====
  const [coins, setCoins] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [trending, setTrending] = useState([]);
  const [btcChart, setBtcChart] = useState([]);
  const [loading, setLoading] = useState(true);

  // search untuk table crypto
  const [searchTerm, setSearchTerm] = useState('');

  // ==== NAVIGATION (SIDEBAR) ====
  const [activePage, setActivePage] = useState('home'); // 'home' | 'weather' | 'profile'

  // ==== PROFILE STATE ====
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');

  // ==== WEATHER STATE ====
  const [weatherSearch, setWeatherSearch] = useState('');
  const [weatherSuggestions, setWeatherSuggestions] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [geoError, setGeoError] = useState('');

  const navigate = useNavigate();

  // ==== FETCH DATA CRYPTO ====
  useEffect(() => {
    async function fetchData() {
      try {
        const [marketRes, globalRes, trendingRes, btcRes] = await Promise.all([
          fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false'
          ),
          fetch('https://api.coingecko.com/api/v3/global'),
          fetch('https://api.coingecko.com/api/v3/search/trending'),
          fetch(
            'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1'
          ),
        ]);

        const [marketData, globalJson, trendingJson, btcJson] =
          await Promise.all([
            marketRes.json(),
            globalRes.json(),
            trendingRes.json(),
            btcRes.json(),
          ]);

        setCoins(Array.isArray(marketData) ? marketData : []);
        setGlobalData(globalJson?.data || null);
        setTrending(trendingJson?.coins || []);
        setBtcChart(
          (btcJson?.prices || []).map(([time, price]) => ({
            time: new Date(time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            price,
          }))
        );
      } catch (error) {
        console.error('Gagal memuat data market:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ==== LOAD USER & AVATAR DARI LOCALSTORAGE ====
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Gagal parse user dari localStorage:', err);
    }

    const savedAvatar = localStorage.getItem('avatar_url');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  // ==== WEATHER: AMBIL LOKASI SAAT MASUK MENU WEATHER ====
  useEffect(() => {
    if (activePage !== 'weather') return;
    // otomatis coba lokasi saat ini saat pertama kali buka weather
    if (!currentWeather && navigator.geolocation) {
      handleUseCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  // ==== LOGOUT ====
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    // localStorage.removeItem('avatar_url'); // kalau mau sekalian hapus avatar
    navigate('/');
  };

  // ==== HAPUS AKUN & DATA ====
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      'Yakin ingin menghapus akun dan semua data lokal? Tindakan ini tidak bisa dibatalkan.'
    );
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('auth_token');

      if (token) {
        // Contoh endpoint – sesuaikan dengan backend kamu
        await fetch('/api/delete-account', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch((err) => {
          console.error('Gagal memanggil API delete account:', err);
        });
      }
    } catch (error) {
      console.error('Error saat menghapus akun:', error);
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('avatar_url');
      navigate('/');
    }
  };

  // ==== PROFILE: GANTI AVATAR DARI FILE ====
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    localStorage.setItem('avatar_url', url);
  };

  // ==== PROFILE: GANTI AVATAR DARI URL ====
  const handleApplyAvatarUrl = () => {
    const trimmed = avatarUrlInput.trim();
    if (!trimmed) return;
    setAvatarUrl(trimmed);
    localStorage.setItem('avatar_url', trimmed);
  };

  // ==== SEARCH COIN (PER KARAKTER) ====
  const filteredCoins = coins.filter((coin) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      coin.name.toLowerCase().includes(term) ||
      coin.symbol.toLowerCase().includes(term)
    );
  });

  // ==== WEATHER UTILS ====
  const degToCompass = (num) => {
    if (num === undefined || num === null) return '-';
    const val = Math.floor(num / 22.5 + 0.5);
    const arr = [
      'N',
      'NNE',
      'NE',
      'ENE',
      'E',
      'ESE',
      'SE',
      'SSE',
      'S',
      'SSW',
      'SW',
      'WSW',
      'W',
      'WNW',
      'NW',
      'NNW',
    ];
    return arr[val % 16];
  };

  const formatTime = (timestamp, timezoneOffsetSec) => {
    if (!timestamp) return '-';
    const date = new Date((timestamp + timezoneOffsetSec) * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ==== WEATHER: FETCH BY KOORDINAT ====
  const fetchWeatherByCoords = async (lat, lon, label) => {
    if (!WEATHER_API_KEY) {
      setGeoError("API key tidak ditemukan. Pastikan sudah diisi.");
      return;
    }

    try {
      setWeatherLoading(true);
      setGeoError("");

      const currentRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=id`
      );

      const currentJson = await currentRes.json();
      if (!currentRes.ok) {
        throw new Error(currentJson.message || "Gagal mengambil cuaca.");
      }

      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=id&cnt=8`
      );

      const forecastJson = await forecastRes.json();
      if (!forecastRes.ok) {
        throw new Error(forecastJson.message || "Gagal mengambil perkiraan cuaca.");
      }

      // SET CURRENT WEATHER
      setCurrentWeather({
        placeLabel:
          label ||
          `${currentJson.name || ""}${
            currentJson.sys?.country ? `, ${currentJson.sys.country}` : ""
          }`,
        temp: currentJson.main?.temp,
        humidity: currentJson.main?.humidity,
        windSpeed: currentJson.wind?.speed,
        windDeg: currentJson.wind?.deg,
        description: currentJson.weather?.[0]?.description || "",
        icon: currentJson.weather?.[0]?.icon || "01d",
        timezoneOffset: currentJson.timezone || 0,
        time: currentJson.dt,
      });

      // SET HOURLY FORECAST
      const hourly = Array.isArray(forecastJson.list)
        ? forecastJson.list.map((item) => ({
            dt: item.dt,
            temp: item.main?.temp,
            humidity: item.main?.humidity,
            windSpeed: item.wind?.speed,
            windDeg: item.wind?.deg,
            description: item.weather?.[0]?.description || "",
            icon: item.weather?.[0]?.icon || "01d",
          }))
        : [];

      setHourlyWeather(hourly);
    } catch (err) {
      console.error("Gagal mengambil data cuaca:", err);
      setGeoError(err.message);
    } finally {
      setWeatherLoading(false);
    }
  };


  // ==== WEATHER: GUNAKAN LOKASI SAAT INI ====
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Browser tidak mendukung geolokasi.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedPlace({
          name: 'Lokasi saat ini',
          country: '',
          lat: latitude,
          lon: longitude,
        });
        fetchWeatherByCoords(latitude, longitude, 'Lokasi saat ini');
      },
      (err) => {
        console.error(err);
        setGeoError(
          'Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.'
        );
      }
    );
  };

  // ==== WEATHER: SEARCH SUGGESTION ====
  const handleWeatherSearchChange = async (e) => {
    const value = e.target.value;
    setWeatherSearch(value);

    if (!WEATHER_API_KEY) return;
    if (!value || value.length < 2) {
      setWeatherSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
          value
        )}&limit=5&appid=${WEATHER_API_KEY}`
      );
      const data = await res.json();
      const suggestions = Array.isArray(data)
        ? data.map((item) => ({
            name: item.name,
            state: item.state,
            country: item.country,
            lat: item.lat,
            lon: item.lon,
            label: `${item.name}${
              item.state ? `, ${item.state}` : ''
            }, ${item.country}`,
          }))
        : [];
      setWeatherSuggestions(suggestions);
    } catch (err) {
      console.error('Gagal mengambil suggestion lokasi:', err);
    }
  };

  // ==== WEATHER: PILIH SUGGESTION ====
  const handleSelectSuggestion = (suggestion) => {
    setWeatherSearch(suggestion.label);
    setWeatherSuggestions([]);
    setSelectedPlace(suggestion);
    fetchWeatherByCoords(suggestion.lat, suggestion.lon, suggestion.label);
  };

  // ==== WEATHER: SUBMIT SEARCH (ENTER / TOMBOL) ====
  const handleWeatherSearchSubmit = (e) => {
    e.preventDefault();
    if (weatherSuggestions.length > 0) {
      handleSelectSuggestion(weatherSuggestions[0]);
    }
  };

  // ==== DISPLAY NAME / EMAIL ====
  const displayName =
    user?.name || user?.username || user?.fullName || 'Pengguna';
  const displayEmail = user?.email || 'email@contoh.com';

  if (loading) return <div className="loading">Loading data...</div>;

  return (
    <div className="dashboard-layout">
      {/* ==== SIDEBAR ==== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-dot" />
          <span>Aplication</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-item ${
              activePage === 'home' ? 'active' : ''
            }`}
            onClick={() => setActivePage('home')}
          >
            <span>🏠</span>
            <span>Home</span>
          </button>
          <button
            className={`sidebar-item ${
              activePage === 'weather' ? 'active' : ''
            }`}
            onClick={() => setActivePage('weather')}
          >
            <span>🌦️</span>
            <span>Weather</span>
          </button>
          <button
            className={`sidebar-item ${
              activePage === 'profile' ? 'active' : ''
            }`}
            onClick={() => setActivePage('profile')}
          >
            <span>👤</span>
            <span>Profile</span>
          </button>
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      {/* ==== MAIN AREA ==== */}
      <motion.main
        className="dashboard-main"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* ==== HEADER ==== */}
        <div className="dashboard-header">
          <div>
            <h2>
              {activePage === 'home'
                ? 'Crypto Dashboard'
                : activePage === 'weather'
                ? 'Weather Center'
                : 'User Profile'}
            </h2>
            <p className="dashboard-subtitle">
              {activePage === 'home' &&
                'Live market overview & trending coins'}
              {activePage === 'weather' &&
                'Pantau cuaca di lokasi saat ini maupun kota lain'}
              {activePage === 'profile' &&
                'Kelola informasi akun dan pengaturan profil'}
            </p>
          </div>

          {activePage === 'home' && (
            <div className="dashboard-actions">
              <input
                type="text"
                className="search-input"
                placeholder="Cari koin (nama / simbol)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}

          {activePage === 'weather' && (
            <div className="dashboard-actions weather-actions">
              <form
                className="weather-search-form"
                onSubmit={handleWeatherSearchSubmit}
              >
                <input
                  type="text"
                  className="search-input"
                  placeholder="Cari kota / lokasi..."
                  value={weatherSearch}
                  onChange={handleWeatherSearchChange}
                />
                <button type="submit" className="primary-btn">
                  Search
                </button>
              </form>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleUseCurrentLocation}
              >
                Gunakan lokasi saat ini
              </button>
              {weatherSuggestions.length > 0 && (
                <div className="weather-suggestions">
                  {weatherSuggestions.map((sug) => (
                    <button
                      key={`${sug.name}-${sug.lat}-${sug.lon}`}
                      type="button"
                      className="weather-suggestion-item"
                      onClick={() => handleSelectSuggestion(sug)}
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==== HOME PAGE (CRYPTO) ==== */}
        {activePage === 'home' && (
          <>
            {/* GLOBAL SUMMARY */}
            <motion.div
              className="global-summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              {globalData && (
                <>
                  <div className="summary-card">
                    <h4>Total Market Cap</h4>
                    <p>
                      {globalData.total_market_cap &&
                      globalData.total_market_cap.usd != null
                        ? `$${(
                            globalData.total_market_cap.usd / 1e12
                          ).toFixed(2)}T`
                        : '-'}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h4>24h Volume</h4>
                    <p>
                      {globalData.total_volume &&
                      globalData.total_volume.usd != null
                        ? `$${(
                            globalData.total_volume.usd / 1e9
                          ).toFixed(2)}B`
                        : '-'}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h4>BTC Dominance</h4>
                    <p>
                      {globalData.market_cap_percentage &&
                      globalData.market_cap_percentage.btc != null
                        ? `${globalData.market_cap_percentage.btc.toFixed(1)}%`
                        : '-'}
                    </p>
                  </div>
                  <div className="summary-card">
                    <h4>Active Cryptos</h4>
                    <p>
                      {globalData.active_cryptocurrencies != null
                        ? globalData.active_cryptocurrencies.toLocaleString()
                        : '-'}
                    </p>
                  </div>
                </>
              )}
            </motion.div>

            {/* BTC PRICE CHART */}
            <motion.div
              className="chart-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <h3>📈 Bitcoin 24h Price Chart</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={btcChart}>
                  <XAxis
                    dataKey="time"
                    stroke="#7fe0ff"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis stroke="#7fe0ff" domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(0, 0, 30, 0.7)',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#00e0ff"
                    strokeWidth={2}
                    dot={false}
                    animationDuration={1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* MAIN TABLE */}
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
                  {filteredCoins.map((coin) => {
                    const change = coin.price_change_percentage_24h;
                    const changeClass =
                      change == null
                        ? ''
                        : change >= 0
                        ? 'pos'
                        : 'neg';

                    return (
                      <motion.tr
                        key={coin.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <td className="coin-cell">
                          <img
                            src={coin.image}
                            alt={coin.name}
                            className="coin-icon"
                          />
                          <div className="coin-name-symbol">
                            <span className="coin-name">{coin.name}</span>
                            <span className="coin-symbol">
                              {coin.symbol.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td>${coin.current_price.toLocaleString()}</td>
                        <td className={changeClass}>
                          {change == null
                            ? '-'
                            : `${change.toFixed(2)}%`}
                        </td>
                        <td>${coin.market_cap.toLocaleString()}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>

            {/* TRENDING COINS */}
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
                    <p>Rank #{item.market_cap_rank ?? 'N/A'}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* ==== WEATHER PAGE ==== */}
        {activePage === 'weather' && (
          <div className="weather-page">
            {geoError && <div className="weather-error">{geoError}</div>}

            <motion.div
              className="weather-top"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* CUACA SAAT INI */}
              <div className="weather-current-card">
                {weatherLoading && !currentWeather && (
                  <div className="weather-loading">Mengambil data cuaca...</div>
                )}

                {!weatherLoading && !currentWeather && (
                  <div className="weather-placeholder">
                    Cari lokasi atau gunakan lokasi saat ini untuk melihat
                    cuaca.
                  </div>
                )}

                {currentWeather && (
                  <>
                    <div className="weather-current-main">
                      <div className="weather-current-left">
                        <p className="weather-location-label">
                          {currentWeather.placeLabel}
                        </p>
                        <p className="weather-current-temp">
                          {currentWeather.temp != null
                            ? `${currentWeather.temp.toFixed(1)}°C`
                            : '-'}
                        </p>
                        <p className="weather-current-desc">
                          {currentWeather.description}
                        </p>
                        <p className="weather-current-time">
                          {currentWeather.time
                            ? formatTime(
                                currentWeather.time,
                                currentWeather.timezoneOffset || 0
                              )
                            : ''}
                        </p>
                      </div>
                      <div className="weather-current-right">
                        <img
                          src={`https://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`}
                          alt={currentWeather.description}
                          className="weather-icon-large"
                        />
                      </div>
                    </div>

                    <div className="weather-current-detail">
                      <div className="weather-detail-item">
                        <span className="label">Kelembapan</span>
                        <span className="value">
                          {currentWeather.humidity != null
                            ? `${currentWeather.humidity}%`
                            : '-'}
                        </span>
                      </div>
                      <div className="weather-detail-item">
                        <span className="label">Angin</span>
                        <span className="value">
                          {currentWeather.windSpeed != null
                            ? `${currentWeather.windSpeed.toFixed(1)} m/s`
                            : '-'}{' '}
                          {currentWeather.windDeg != null
                            ? `(${degToCompass(currentWeather.windDeg)})`
                            : ''}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* HOURLY / 24H FORECAST */}
              <div className="weather-hourly-card">
                <h3>Perkiraan 24 jam ke depan</h3>
                {weatherLoading && currentWeather && (
                  <div className="weather-loading">Memuat perkiraan...</div>
                )}
                {!weatherLoading && hourlyWeather.length === 0 && (
                  <div className="weather-placeholder">
                    Belum ada data perkiraan.
                  </div>
                )}
                <div className="weather-hourly-list">
                  {hourlyWeather.map((item) => (
                    <div
                      key={item.dt}
                      className="weather-hourly-item"
                    >
                      <span className="weather-hour">
                        {currentWeather
                          ? formatTime(
                              item.dt,
                              currentWeather.timezoneOffset || 0
                            )
                          : ''}
                      </span>
                      <img
                        src={`https://openweathermap.org/img/wn/${item.icon}.png`}
                        alt={item.description}
                        className="weather-icon-small"
                      />
                      <span className="weather-hour-temp">
                        {item.temp != null
                          ? `${item.temp.toFixed(1)}°C`
                          : '-'}
                      </span>
                      <span className="weather-hour-desc">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* TABEL RINGKAS */}
            <motion.div
              className="weather-table-wrapper"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
            >
              <h3>Ringkasan Cuaca</h3>
              <table className="data-table weather-table">
                <thead>
                  <tr>
                    <th>Tempat</th>
                    <th>Waktu</th>
                    <th>Cuaca</th>
                    <th>Suhu</th>
                    <th>Kelembapan</th>
                    <th>Arah Angin</th>
                  </tr>
                </thead>
                <tbody>
                  {currentWeather && (
                    <tr>
                      <td>{currentWeather.placeLabel}</td>
                      <td>
                        {formatTime(
                          currentWeather.time,
                          currentWeather.timezoneOffset || 0
                        )}
                      </td>
                      <td>{currentWeather.description}</td>
                      <td>
                        {currentWeather.temp != null
                          ? `${currentWeather.temp.toFixed(1)}°C`
                          : '-'}
                      </td>
                      <td>
                        {currentWeather.humidity != null
                          ? `${currentWeather.humidity}%`
                          : '-'}
                      </td>
                      <td>
                        {currentWeather.windSpeed != null
                          ? `${currentWeather.windSpeed.toFixed(1)} m/s`
                          : '-'}{' '}
                        {currentWeather.windDeg != null
                          ? degToCompass(currentWeather.windDeg)
                          : ''}
                      </td>
                    </tr>
                  )}
                  {currentWeather &&
                    hourlyWeather.map((item) => (
                      <tr key={`tbl-${item.dt}`}>
                        <td>{currentWeather.placeLabel}</td>
                        <td>
                          {formatTime(
                            item.dt,
                            currentWeather.timezoneOffset || 0
                          )}
                        </td>
                        <td>{item.description}</td>
                        <td>
                          {item.temp != null
                            ? `${item.temp.toFixed(1)}°C`
                            : '-'}
                        </td>
                        <td>
                          {item.humidity != null
                            ? `${item.humidity}%`
                            : '-'}
                        </td>
                        <td>
                          {item.windSpeed != null
                            ? `${item.windSpeed.toFixed(1)} m/s`
                            : '-'}{' '}
                          {item.windDeg != null
                            ? degToCompass(item.windDeg)
                            : ''}
                        </td>
                      </tr>
                    ))}
                  {!currentWeather && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center' }}>
                        Belum ada data untuk ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          </div>
        )}

        {/* ==== PROFILE PAGE ==== */}
        {activePage === 'profile' && (
          <div className="profile-wrapper">
            <div className="profile-card">
              <div className="profile-left">
                <div className="profile-avatar">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" />
                  ) : (
                    <span className="avatar-initial">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <h3>{displayName}</h3>
                <p className="profile-email">{displayEmail}</p>
              </div>

              <div className="profile-right">
                <h4>Foto Profil</h4>
                <div className="profile-upload-group">
                  <label className="upload-btn">
                    <span>📁 Pilih dari perangkat</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                    />
                  </label>
                  <div className="profile-url-input">
                    <input
                      type="text"
                      placeholder="Atau tempel URL gambar..."
                      value={avatarUrlInput}
                      onChange={(e) => setAvatarUrlInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="apply-url-btn"
                      onClick={handleApplyAvatarUrl}
                    >
                      Gunakan URL
                    </button>
                  </div>
                </div>

                <h4>Akun</h4>
                <p>
                  Nama pengguna dan email diambil dari data yang kamu simpan
                  saat registrasi (localStorage <code>user</code>).
                </p>

                <div className="profile-actions">
                  <button
                    type="button"
                    className="profile-logout-btn"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    className="profile-delete-btn"
                    onClick={handleDeleteAccount}
                  >
                    Hapus Akun &amp; Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.main>
    </div>
  );
}

export default DashboardPage;
