import { useState, useEffect, type FormEvent } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/authcontext';

interface UrlItem {
  id: string;
  original_url: string;
  short_code: string;
  click_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AnalyticsData {
  totalClicks: number;
  clicksByDay: { date: string; count: number }[];
  byDevice: { device_type: string; count: number }[];
  byReferrer: { referrer: string; count: number }[];
}

export default function Dashboard() {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, AnalyticsData>>({});
  const { user, logout } = useAuth();

  const fetchUrls = async () => {
    const res = await api.get('/urls');
    setUrls(res.data.data);
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/urls', { originalUrl, customAlias: customAlias || undefined });
      setOriginalUrl('');
      setCustomAlias('');
      fetchUrls();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal membuat short URL');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/${code}`);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus URL ini?')) return;
    await api.delete(`/urls/${id}`);
    fetchUrls();
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/urls/${id}/toggle`);
    fetchUrls();
  };

  const handleToggleAnalytics = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!analytics[id]) {
      const res = await api.get(`/urls/${id}/analytics`);
      setAnalytics((prev) => ({ ...prev, [id]: res.data.data }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">URL Shortener</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-6">
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm mb-6 flex gap-3 flex-wrap">
          <input
            type="url"
            required
            placeholder="Tempel URL panjang di sini..."
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Alias custom (opsional)"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
            className="w-48 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Membuat...' : 'Persingkat'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {urls.length === 0 && (
            <p className="p-6 text-gray-500 text-sm">Belum ada URL yang dibuat.</p>
          )}
          {urls.map((url) => (
            <div key={url.id} className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${url.is_active ? 'text-blue-600' : 'text-gray-400 line-through'}`}>
                    localhost:3000/{url.short_code}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{url.original_url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">{url.click_count} klik</span>
                  <button onClick={() => handleToggleAnalytics(url.id)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                    {openId === url.id ? 'Tutup' : 'Analytics'}
                  </button>
                  <button onClick={() => handleCopy(url.short_code)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg">
                    {copiedId === url.short_code ? 'Tersalin!' : 'Copy'}
                  </button>
                  <button onClick={() => handleToggle(url.id)} className="text-xs bg-yellow-50 text-yellow-700 hover:bg-yellow-100 px-3 py-1.5 rounded-lg">
                    {url.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button onClick={() => handleDelete(url.id)} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg">
                    Hapus
                  </button>
                </div>
              </div>

              {openId === url.id && (
                <div className="mt-3 bg-gray-50 rounded-lg p-4 text-sm">
                  {!analytics[url.id] ? (
                    <p className="text-gray-500">Memuat analytics...</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="font-medium">Total klik: {analytics[url.id].totalClicks}</p>
                      <div>
                        <p className="text-gray-500 mb-1">Klik 14 hari terakhir:</p>
                        {analytics[url.id].clicksByDay.length === 0 && <p className="text-gray-400">Belum ada data.</p>}
                        {analytics[url.id].clicksByDay.map((d) => (
                          <div key={d.date} className="flex items-center gap-2">
                            <span className="w-24 text-xs text-gray-500">{d.date}</span>
                            <div className="bg-blue-500 h-2 rounded" style={{ width: `${Math.min(d.count * 10, 200)}px` }} />
                            <span className="text-xs">{d.count}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-8 flex-wrap">
                        <div>
                          <p className="text-gray-500 mb-1">Device:</p>
                          {analytics[url.id].byDevice.map((d) => (
                            <p key={d.device_type} className="text-xs">{d.device_type}: {d.count}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Sumber (referrer):</p>
                          {analytics[url.id].byReferrer.map((r) => (
                            <p key={r.referrer} className="text-xs truncate max-w-[160px]">{r.referrer}: {r.count}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}