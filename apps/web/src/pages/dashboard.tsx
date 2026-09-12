import { useState, useEffect, type FormEvent } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/authcontext';

interface UrlItem {
  id: string;
  original_url: string;
  short_code: string;
  click_count: number;
  created_at: string;
}

export default function Dashboard() {
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
      await api.post('/urls', { originalUrl });
      setOriginalUrl('');
      fetchUrls();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Gagal membuat short URL');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(`http://localhost:3000/${code}`);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 1500);
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
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-sm mb-6 flex gap-3">
          <input
            type="url"
            required
            placeholder="Tempel URL panjang di sini..."
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div key={url.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-blue-600 font-medium truncate">
                  localhost:3000/{url.short_code}
                </p>
                <p className="text-xs text-gray-500 truncate">{url.original_url}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-xs text-gray-500">{url.click_count} klik</span>
                <button
                  onClick={() => handleCopy(url.short_code)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                >
                  {copiedId === url.short_code ? 'Tersalin!' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}