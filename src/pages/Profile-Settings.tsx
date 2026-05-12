import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const SPICE_LEVELS = [
  { value: 1, label: 'Không cay', emoji: '😊' },
  { value: 2, label: 'Hơi cay', emoji: '🌱' },
  { value: 3, label: 'Vừa cay', emoji: '🌶️' },
  { value: 4, label: 'Khá cay', emoji: '🔥' },
  { value: 5, label: 'Rất cay', emoji: '💥' },
];

const COMMON_DISLIKES: { name: string; emoji: string }[] = [
  { name: 'hành', emoji: '🧅' },
  { name: 'ngò', emoji: '🌿' },
  { name: 'tỏi', emoji: '🧄' },
  { name: 'ớt', emoji: '🌶️' },
  { name: 'gừng', emoji: '🫚' },
  { name: 'mắm tôm', emoji: '🦐' },
  { name: 'sầu riêng', emoji: '🟡' },
];

const COMMON_ALLERGIES: { name: string; emoji: string }[] = [
  { name: 'hải sản', emoji: '🦞' },
  { name: 'đậu phộng', emoji: '🥜' },
  { name: 'sữa', emoji: '🥛' },
  { name: 'trứng', emoji: '🥚' },
  { name: 'gluten', emoji: '🌾' },
];

const CUISINES = [
  { name: 'Việt Nam', emoji: '🇻🇳' },
  { name: 'Nhật Bản', emoji: '🇯🇵' },
  { name: 'Hàn Quốc', emoji: '🇰🇷' },
  { name: 'Trung Quốc', emoji: '🇨🇳' },
  { name: 'Thái Lan', emoji: '🇹🇭' },
  { name: 'Ý', emoji: '🇮🇹' },
  { name: 'Ấn Độ', emoji: '🇮🇳' },
  { name: 'Mỹ', emoji: '🇺🇸' },
];

const SERVING_OPTIONS = [
  { value: 1, label: '1 người' },
  { value: 2, label: '2 người' },
  { value: 4, label: '3-4 người' },
  { value: 6, label: '5+ người' },
];

export default function ProfileSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState({
    spiceLevel: 3,
    dislikedIngredients: [] as string[],
    allergies: [] as string[],
    dietaryNotes: '',
    preferredCuisines: [] as string[],
    servingSize: 2,
  });

  const [history, setHistory] = useState<{ recipeName: string; date: string }[]>([]);
  const [stats, setStats] = useState({ cooked: 0, liked: 0, avoided: 0 });
  const [newDislike, setNewDislike] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    if (status === 'authenticated') {
      fetch('/api/user-profile')
        .then(r => r.json())
        .then(data => {
          setProfile({
            spiceLevel: data.spiceLevel || 3,
            dislikedIngredients: data.dislikedIngredients || [],
            allergies: data.allergies || [],
            dietaryNotes: data.dietaryNotes || '',
            preferredCuisines: data.preferredCuisines || [],
            servingSize: data.servingSize || 2,
          });
          const hist = (data.cookedHistory || [])
            .slice(-10)
            .reverse()
            .map((h: any) => ({
              recipeName: h.recipeName,
              date: new Date(h.date).toLocaleDateString('vi-VN'),
            }));
          setHistory(hist);
          setStats({
            cooked: data.cookedHistory?.length || 0,
            liked: data.likedRecipeIds?.length || 0,
            avoided: (data.dislikedIngredients?.length || 0) + (data.allergies?.length || 0),
          });
        });
    }
  }, [status]);

  const save = async () => {
    setSaving(true);
    await fetch('/api/user-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    setSaving(false);
    setSaved(true);
    setStats(s => ({ ...s, avoided: profile.dislikedIngredients.length + profile.allergies.length }));
    setTimeout(() => setSaved(false), 2500);
  };

  const addDislike = (name: string) => {
    if (!name || profile.dislikedIngredients.includes(name)) return;
    setProfile(p => ({ ...p, dislikedIngredients: [...p.dislikedIngredients, name] }));
    setNewDislike('');
  };

  const removeDislike = (name: string) =>
    setProfile(p => ({ ...p, dislikedIngredients: p.dislikedIngredients.filter(d => d !== name) }));

  const addAllergy = (name: string) => {
    if (!name || profile.allergies.includes(name)) return;
    setProfile(p => ({ ...p, allergies: [...p.allergies, name] }));
    setNewAllergy('');
  };

  const removeAllergy = (name: string) =>
    setProfile(p => ({ ...p, allergies: p.allergies.filter(a => a !== name) }));

  const toggleCuisine = (name: string) => {
    setProfile(p => ({
      ...p,
      preferredCuisines: p.preferredCuisines.includes(name)
        ? p.preferredCuisines.filter(c => c !== name)
        : [...p.preferredCuisines, name],
    }));
  };

  const currentSpice = SPICE_LEVELS.find(s => s.value === profile.spiceLevel) || SPICE_LEVELS[2];

  const aiSummary = [
    `Mức cay: ${currentSpice.label}`,
    profile.dislikedIngredients.length ? `Tránh: ${profile.dislikedIngredients.join(', ')}` : null,
    profile.allergies.length ? `Dị ứng: ${profile.allergies.join(', ')}` : null,
    profile.preferredCuisines.length ? `Ưa thích: ${profile.preferredCuisines.join(', ')}` : null,
    `Nấu cho: ${profile.servingSize === 6 ? '5+' : profile.servingSize} người`,
    profile.dietaryNotes ? profile.dietaryNotes : null,
  ].filter(Boolean).join(' · ');

  if (status === 'loading') return <p style={{ padding: '2rem' }}>Đang tải...</p>;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Cá nhân hóa của tôi</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            AI dùng thông tin này để gợi ý công thức phù hợp riêng với bạn
          </p>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Món đã nấu', value: stats.cooked, emoji: '🍳' },
            { label: 'Món yêu thích', value: stats.liked, emoji: '❤️' },
            { label: 'Nguyên liệu tránh', value: stats.avoided, emoji: '🚫' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#fff', borderRadius: 12, padding: '1rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '1.5rem' }}>{stat.emoji}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {(['settings', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.9rem',
                background: activeTab === tab ? '#111827' : '#e5e7eb',
                color: activeTab === tab ? '#fff' : '#374151',
              }}
            >
              {tab === 'settings' ? '⚙️ Cài đặt khẩu vị' : '📅 Lịch sử nấu ăn'}
            </button>
          ))}
        </div>

        {/* ── TAB SETTINGS ── */}
        {activeTab === 'settings' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>

            {/* Mức độ cay — slider */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '1rem', fontSize: '1rem' }}>
                🌶️ Mức độ cay ưa thích
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                {SPICE_LEVELS.map(s => (
                  <span key={s.value} style={{ fontSize: '1.25rem', opacity: profile.spiceLevel === s.value ? 1 : 0.3 }}>
                    {s.emoji}
                  </span>
                ))}
              </div>
              <input
                type="range" min={1} max={5} step={1}
                value={profile.spiceLevel}
                onChange={e => setProfile(p => ({ ...p, spiceLevel: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#ef4444' }}
              />
              <div style={{ textAlign: 'center', marginTop: '0.5rem', fontWeight: 600, color: '#ef4444', fontSize: '0.95rem' }}>
                {currentSpice.emoji} {currentSpice.label}
              </div>
            </div>

            {/* Nguyên liệu không thích */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>
                😕 Không thích (tránh nếu có thể)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {COMMON_DISLIKES.filter(d => !profile.dislikedIngredients.includes(d.name)).map(item => (
                  <button key={item.name} onClick={() => addDislike(item.name)}
                    style={{ padding: '0.375rem 0.75rem', borderRadius: 999, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {item.emoji} + {item.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input value={newDislike} onChange={e => setNewDislike(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDislike(newDislike)}
                  placeholder="Thêm nguyên liệu khác..."
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.9rem' }} />
                <button onClick={() => addDislike(newDislike)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#6b7280', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Thêm
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profile.dislikedIngredients.map(item => {
                  const found = COMMON_DISLIKES.find(d => d.name === item);
                  return (
                    <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fef3c7', color: '#92400e', padding: '0.375rem 0.75rem', borderRadius: 999, fontSize: '0.875rem' }}>
                      {found?.emoji || '🚫'} {item}
                      <button onClick={() => removeDislike(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Dị ứng */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>
                ⚠️ Dị ứng (bỏ hoàn toàn)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {COMMON_ALLERGIES.filter(a => !profile.allergies.includes(a.name)).map(item => (
                  <button key={item.name} onClick={() => addAllergy(item.name)}
                    style={{ padding: '0.375rem 0.75rem', borderRadius: 999, border: '1px solid #fca5a5', background: '#fff1f2', cursor: 'pointer', fontSize: '0.85rem', color: '#991b1b' }}>
                    {item.emoji} + {item.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input value={newAllergy} onChange={e => setNewAllergy(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAllergy(newAllergy)}
                  placeholder="Thêm dị ứng khác..."
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #fca5a5', fontSize: '0.9rem' }} />
                <button onClick={() => addAllergy(newAllergy)}
                  style={{ padding: '0.5rem 1rem', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Thêm
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {profile.allergies.map(item => {
                  const found = COMMON_ALLERGIES.find(a => a.name === item);
                  return (
                    <span key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#fee2e2', color: '#991b1b', padding: '0.375rem 0.75rem', borderRadius: 999, fontSize: '0.875rem' }}>
                      {found?.emoji || '⚠️'} {item}
                      <button onClick={() => removeAllergy(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Ẩm thực ưa thích */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>
                🌍 Ẩm thực ưa thích
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {CUISINES.map(c => (
                  <button key={c.name} onClick={() => toggleCuisine(c.name)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: 999, border: '2px solid',
                      borderColor: profile.preferredCuisines.includes(c.name) ? '#10b981' : '#e5e7eb',
                      background: profile.preferredCuisines.includes(c.name) ? '#ecfdf5' : '#fff',
                      color: profile.preferredCuisines.includes(c.name) ? '#065f46' : '#374151',
                      fontWeight: profile.preferredCuisines.includes(c.name) ? 700 : 400,
                      cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s',
                    }}>
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Số người ăn */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.75rem' }}>
                👥 Thường nấu cho bao nhiêu người?
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {SERVING_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setProfile(p => ({ ...p, servingSize: opt.value }))}
                    style={{
                      flex: 1, padding: '0.625rem', borderRadius: 8, border: '2px solid',
                      borderColor: profile.servingSize === opt.value ? '#3b82f6' : '#e5e7eb',
                      background: profile.servingSize === opt.value ? '#eff6ff' : '#fff',
                      color: profile.servingSize === opt.value ? '#1d4ed8' : '#374151',
                      fontWeight: profile.servingSize === opt.value ? 700 : 400,
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                📝 Ghi chú thêm cho AI
              </label>
              <textarea value={profile.dietaryNotes}
                onChange={e => setProfile(p => ({ ...p, dietaryNotes: e.target.value }))}
                placeholder="Ví dụ: Tôi ăn chay, không ăn hải sản, thích món Việt Nam..."
                rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            {/* AI Summary preview */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534' }}>
                <strong>🤖 AI sẽ hiểu bạn như thế này:</strong><br />
                <span style={{ color: '#15803d' }}>{aiSummary}</span>
              </p>
            </div>

            {/* Save button */}
            <button onClick={save} disabled={saving}
              style={{ width: '100%', padding: '0.875rem', background: saved ? '#10b981' : '#111827', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}>
              {saving ? 'Đang lưu...' : saved ? '✓ Đã lưu!' : 'Lưu cài đặt'}
            </button>
          </div>
        )}

        {/* ── TAB HISTORY ── */}
        {activeTab === 'history' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: 0, marginBottom: '1.25rem' }}>
              📅 10 món gần đây nhất
            </h2>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍳</div>
                <p>Chưa có lịch sử nấu ăn.<br />Hãy tạo và lưu công thức đầu tiên!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      🍽️
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#111' }}>{item.recipeName}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{item.date}</p>
                    </div>
                    {i === 0 && (
                      <span style={{ background: '#dcfce7', color: '#166534', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 999 }}>
                        Mới nhất
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#eff6ff', borderRadius: 10, fontSize: '0.85rem', color: '#1d4ed8' }}>
              💡 AI tự động tránh gợi ý lại 5 món gần nhất để bữa ăn của bạn luôn đa dạng.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}