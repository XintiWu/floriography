"use client";

import { useEffect, useState } from "react";
import { 
  Package, 
  Users, 
  ShoppingBag, 
  Layout, 
  RefreshCcw, 
  AlertCircle,
  Save,
  CheckCircle2
} from "lucide-react";
import { authService } from "@/services/authService";

type Tab = 'inventory' | 'users' | 'orders' | 'designs';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // 1. 權限檢查：確保只有登入者可以查看
  useEffect(() => {
    authService.getUser().then(u => {
      setUser(u);
      if (u) fetchData('inventory');
    });
  }, []);

  // 2. 抓取資料
  const fetchData = async (tab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = `/api/admin/${tab === 'inventory' ? 'assets' : tab}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('無法讀取資料');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. 更新庫存
  const updateStock = async (id: string, newQuantity: number) => {
    setSavingId(id);
    try {
      const res = await fetch('/api/admin/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock_quantity: newQuantity }),
      });
      if (!res.ok) throw new Error('更新失敗');
      
      // 更新本地狀態
      setData(prev => prev.map(item => item.id === id ? { ...item, stock_quantity: newQuantity } : item));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border-2 border-dashed border-[color:var(--line)]">
        <p className="text-[color:var(--muted)]">請先登入會員以存取管理後台</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* 側邊導覽列 */}
      <div className="w-full shrink-0 md:w-64">
        <nav className="flex flex-col gap-2">
          <TabButton 
            active={activeTab === 'inventory'} 
            onClick={() => { setActiveTab('inventory'); fetchData('inventory'); }}
            icon={<Package size={18} />}
            label="庫存管理"
          />
          <TabButton 
            active={activeTab === 'orders'} 
            onClick={() => { setActiveTab('orders'); fetchData('orders'); }}
            icon={<ShoppingBag size={18} />}
            label="訂單管理"
          />
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => { setActiveTab('users'); fetchData('users'); }}
            icon={<Users size={18} />}
            label="會員管理"
          />
          <TabButton 
            active={activeTab === 'designs'} 
            onClick={() => { setActiveTab('designs'); fetchData('designs'); }}
            icon={<Layout size={18} />}
            label="作品管理"
          />
        </nav>
      </div>

      {/* 主內容區 */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[color:var(--foreground)]">
            {activeTab === 'inventory' && '庫存管理'}
            {activeTab === 'orders' && '訂單管理'}
            {activeTab === 'users' && '會員管理'}
            {activeTab === 'designs' && '作品管理'}
          </h2>
          <button 
            onClick={() => fetchData(activeTab)}
            className="flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--accent)]"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            重新整理
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--card)] shadow-sm">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--line)] border-t-[color:var(--accent)]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                {activeTab === 'inventory' && (
                  <>
                    <thead>
                      <tr className="border-b border-[color:var(--line)] bg-black/5">
                        <th className="px-6 py-4 font-bold">名稱</th>
                        <th className="px-6 py-4 font-bold">類型</th>
                        <th className="px-6 py-4 font-bold">目前庫存</th>
                        <th className="px-6 py-4 font-bold">價格</th>
                        <th className="px-6 py-4 font-bold">狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(item => (
                        <tr key={item.id} className="border-b border-[color:var(--line)] hover:bg-black/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={item.url} alt="" className="h-10 w-10 rounded-lg object-contain bg-white border border-[color:var(--line)]" />
                              <span className="font-semibold">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 opacity-70">{item.type}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                defaultValue={item.stock_quantity}
                                onBlur={(e) => updateStock(item.id, parseInt(e.target.value))}
                                className={`w-20 rounded-lg border px-3 py-1 outline-none focus:ring-2 ${
                                  item.stock_quantity <= item.min_stock_level ? 'border-red-300 bg-red-50 text-red-700' : 'border-[color:var(--line)]'
                                }`}
                              />
                              {savingId === item.id && <Save size={14} className="animate-pulse text-[color:var(--accent)]" />}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono">NT$ {item.price}</td>
                          <td className="px-6 py-4">
                            {item.stock_quantity <= item.min_stock_level ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                                低庫存
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                                充足
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'users' && (
                  <>
                    <thead>
                      <tr className="border-b border-[color:var(--line)] bg-black/5">
                        <th className="px-6 py-4 font-bold">會員</th>
                        <th className="px-6 py-4 font-bold">Email</th>
                        <th className="px-6 py-4 font-bold">註冊時間</th>
                        <th className="px-6 py-4 font-bold">身分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(u => (
                        <tr key={u.id} className="border-b border-[color:var(--line)]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[color:var(--line)] flex items-center justify-center overflow-hidden">
                                {u.avatar_url ? <img src={u.avatar_url} /> : <Users size={14} />}
                              </div>
                              <span className="font-semibold">{u.full_name || '未命名用戶'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">{u.email}</td>
                          <td className="px-6 py-4 text-[color:var(--muted)]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'orders' && (
                  <>
                    <thead>
                      <tr className="border-b border-[color:var(--line)] bg-black/5">
                        <th className="px-6 py-4 font-bold">訂單編號</th>
                        <th className="px-6 py-4 font-bold">客戶</th>
                        <th className="px-6 py-4 font-bold">金額</th>
                        <th className="px-6 py-4 font-bold">狀態</th>
                        <th className="px-6 py-4 font-bold">時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(o => (
                        <tr key={o.id} className="border-b border-[color:var(--line)]">
                          <td className="px-6 py-4 font-mono text-xs">{o.id.slice(0, 8)}...</td>
                          <td className="px-6 py-4">
                            <div className="font-semibold">{o.customer_name}</div>
                            <div className="text-xs text-[color:var(--muted)]">{o.customer_phone}</div>
                          </td>
                          <td className="px-6 py-4">NT$ {o.total_amount}</td>
                          <td className="px-6 py-4">
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              {o.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-[color:var(--muted)]">
                            {new Date(o.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {activeTab === 'designs' && (
                  <>
                    <thead>
                      <tr className="border-b border-[color:var(--line)] bg-black/5">
                        <th className="px-6 py-4 font-bold">作品</th>
                        <th className="px-6 py-4 font-bold">名稱</th>
                        <th className="px-6 py-4 font-bold">建議售價</th>
                        <th className="px-6 py-4 font-bold">更新時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(d => (
                        <tr key={d.id} className="border-b border-[color:var(--line)]">
                          <td className="px-6 py-4">
                            <img src={d.preview_url || '/placeholder-design.png'} className="h-12 w-20 rounded-lg object-cover bg-oat-200" />
                          </td>
                          <td className="px-6 py-4 font-semibold">{d.name}</td>
                          <td className="px-6 py-4">NT$ {d.total_price}</td>
                          <td className="px-6 py-4 text-xs text-[color:var(--muted)]">
                            {new Date(d.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}

                {data.length === 0 && !loading && (
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[color:var(--muted)]">
                        尚無資料
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
        active 
          ? 'bg-[color:var(--ink)] text-[color:var(--paper)] shadow-md' 
          : 'text-[color:var(--muted)] hover:bg-black/5 hover:text-[color:var(--foreground)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
