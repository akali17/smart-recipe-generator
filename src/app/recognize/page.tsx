'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

type Mode = 'upload' | 'camera';

export default function RecognizePage() {
  const [mode, setMode]               = useState<Mode>('upload');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [previews, setPreviews]       = useState<string[]>([]);
  const [dragOver, setDragOver]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [progress, setProgress]       = useState('');
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);

  const fileRef   = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch {
      setError('Không thể truy cập camera. Hãy cho phép quyền camera trong trình duyệt.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (mode === 'camera') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  // Nhận dạng 1 ảnh base64
  const recognizeSingle = async (base64: string): Promise<string[]> => {
    const res = await fetch('/api/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64 }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.ingredients || [];
  };

  // Xử lý nhiều file — gộp vào danh sách cũ
  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) { setError('Vui lòng chọn file ảnh!'); return; }

    setError(null);
    setLoading(true);

    // Đọc tất cả file thành base64
    const newPreviews: string[] = [];
    for (const file of imageFiles) {
      const url = await new Promise<string>(resolve => {
        const r = new FileReader();
        r.onload = e => resolve(e.target?.result as string);
        r.readAsDataURL(file);
      });
      newPreviews.push(url);
    }

    // Gộp preview mới vào danh sách cũ
    setPreviews(prev => [...prev, ...newPreviews]);

    // Nhận dạng từng ảnh, gộp kết quả
    const newIngredients = new Set<string>();
    for (let i = 0; i < newPreviews.length; i++) {
      setProgress(`Đang phân tích ảnh ${i + 1}/${newPreviews.length}...`);
      try {
        const base64 = newPreviews[i].split(',')[1];
        const found = await recognizeSingle(base64);
        found.forEach(ing => newIngredients.add(ing.toLowerCase()));
      } catch (e: any) {
        setError('Lỗi ảnh ' + (i + 1) + ': ' + e.message);
      }
    }

    // Gộp với ingredients đã có
    setIngredients(prev => Array.from(new Set([...prev, ...newIngredients])));
    setProgress('');
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  // Chụp ảnh từ camera — gộp kết quả, không reset
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCameraPreview(dataUrl);
    setLoading(true);
    setError(null);
    recognizeSingle(dataUrl.split(',')[1])
      .then(found => {
        // Gộp với ingredients cũ
        setIngredients(prev => Array.from(new Set([...prev, ...found.map(f => f.toLowerCase())])));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // Reset toàn bộ
  const resetAll = () => {
    setIngredients([]);
    setPreviews([]);
    setCameraPreview(null);
    setError(null);
  };

  // Xóa 1 ingredient
  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Sinh công thức
  const goGenerate = () => {
    const params = new URLSearchParams();
    ingredients.forEach(ing => params.append('oldIngredients', ing));
    window.location.href = `/CreateRecipe?${params.toString()}`;
  };

  const S = {
    page:     { minHeight: '100vh', background: 'linear-gradient(135deg,#0f1923 0%,#162230 100%)', padding: '2rem', fontFamily: 'sans-serif' } as React.CSSProperties,
    wrap:     { maxWidth: 700, margin: '0 auto' } as React.CSSProperties,
    tab:      (active: boolean): React.CSSProperties => ({
      flex: 1, padding: '0.75rem', borderRadius: 10, border: 'none', cursor: 'pointer',
      fontWeight: 700, fontSize: '1rem', transition: 'all 0.2s',
      background: active ? '#00B4A6' : 'rgba(22,34,48,0.9)',
      color: active ? '#0f1923' : '#8899A6',
    }),
    uploadBox: (over: boolean): React.CSSProperties => ({
      border: `2px dashed ${over ? '#00B4A6' : '#2A3F52'}`, borderRadius: 16,
      padding: '2.5rem 2rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
      background: over ? 'rgba(0,180,166,0.08)' : 'rgba(22,34,48,0.8)',
    }),
    error:    { background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 10, padding: '1rem', color: '#ff6b6b', marginBottom: '1rem', fontSize: '0.875rem' } as React.CSSProperties,
    loading:  { background: 'rgba(0,180,166,0.1)', border: '1px solid rgba(0,180,166,0.3)', borderRadius: 10, padding: '1rem', color: '#00B4A6', textAlign: 'center' as const, marginBottom: '1rem' },
    tag:      { display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(0,180,166,0.15)', border: '1px solid rgba(0,180,166,0.4)', color: '#00B4A6', padding: '0.375rem 0.75rem', borderRadius: 999, fontSize: '0.875rem', fontWeight: 500 } as React.CSSProperties,
    genBtn:   { width: '100%', padding: '0.875rem', background: '#00B4A6', color: '#0f1923', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: '1rem' } as React.CSSProperties,
    addMore:  { width: '100%', padding: '0.6rem', background: 'transparent', border: '1px dashed #2A3F52', borderRadius: 10, color: '#8899A6', cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.5rem' } as React.CSSProperties,
    resetBtn: { width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid #2A3F52', borderRadius: 8, color: '#8899A6', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '0.5rem' } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#00B4A6', margin: 0 }}>
            AI Food Recognition
          </h1>
          <p style={{ color: '#8899A6', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>
            Upload nhiều ảnh hoặc chụp camera → AI nhận dạng → Sinh công thức
          </p>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button style={S.tab(mode === 'upload')} onClick={() => setMode('upload')}>📁 Upload ảnh</button>
          <button style={S.tab(mode === 'camera')} onClick={() => setMode('camera')}>📷 Camera Realtime</button>
        </div>

        {/* ── UPLOAD MODE ── */}
        {mode === 'upload' && (
          <>
            {/* Drop zone — luôn hiện để upload thêm */}
            <div
              style={S.uploadBox(dragOver)}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
              <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 0.25rem' }}>
                {previews.length > 0 ? 'Click để thêm ảnh khác' : 'Click hoặc kéo thả ảnh vào đây'}
              </p>
              <p style={{ color: '#8899A6', fontSize: '0.875rem', margin: 0 }}>
                Hỗ trợ nhiều ảnh cùng lúc · JPG, PNG, WEBP
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => e.target.files && handleFiles(Array.from(e.target.files))}
              />
            </div>

            {/* Grid previews với nút xóa từng ảnh */}
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img
                      src={src}
                      alt={`ảnh ${i + 1}`}
                      style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 10, border: '1px solid #2A3F52', display: 'block' }}
                    />
                    <button
                      onClick={() => setPreviews(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 16, lineHeight: '24px', textAlign: 'center', padding: 0 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── CAMERA MODE ── */}
        {mode === 'camera' && (
          <div>
            {/* Viewfinder */}
            <div style={{ borderRadius: 16, overflow: 'hidden', background: '#000', marginBottom: '1rem', position: 'relative' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxHeight: 320, display: 'block', objectFit: 'cover' }}
              />
              {!cameraReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8899A6' }}>
                  Đang khởi động camera...
                </div>
              )}
            </div>

            {/* Ảnh vừa chụp */}
            {cameraPreview && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ color: '#8899A6', fontSize: '0.8rem', margin: '0 0 0.4rem' }}>Ảnh vừa chụp:</p>
                <img src={cameraPreview} alt="captured" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, border: '1px solid #2A3F52' }} />
              </div>
            )}

            {/* Nút chụp */}
            <button
              style={{ width: '100%', padding: '0.875rem', background: '#00B4A6', color: '#0f1923', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginBottom: '0.5rem', opacity: (!cameraReady || loading) ? 0.6 : 1 }}
              onClick={capturePhoto}
              disabled={!cameraReady || loading}
            >
              {loading ? '⏳ Đang nhận dạng...' : '📸 Chụp & Nhận dạng'}
            </button>

            {/* Nút reset */}
            {ingredients.length > 0 && (
              <button style={S.resetBtn} onClick={resetAll}>
                🔄 Xóa tất cả & chụp lại từ đầu
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div style={{ ...S.error, marginTop: '1rem' }}>⚠️ {error}</div>}

        {/* Loading */}
        {loading && (
          <div style={{ ...S.loading, marginTop: '1rem' }}>
            ⏳ {progress || 'Đang phân tích ảnh bằng GPT-4V...'}
          </div>
        )}

        {/* ── KẾT QUẢ ── */}
        {ingredients.length > 0 && (
          <div style={{ background: 'rgba(22,34,48,0.9)', border: '1px solid rgba(0,180,166,0.3)', borderRadius: 16, padding: '1.5rem', marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#fff', fontWeight: 600, margin: 0 }}>
                🥬 Nguyên liệu phát hiện ({ingredients.length})
              </h2>
              <button
                onClick={resetAll}
                style={{ background: 'none', border: 'none', color: '#8899A6', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Xóa tất cả
              </button>
            </div>

            {/* Tags nguyên liệu — có nút xóa từng cái */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {ingredients.map((ing, i) => (
                <span key={i} style={S.tag}>
                  {ing}
                  <button
                    onClick={() => removeIngredient(i)}
                    style={{ background: 'none', border: 'none', color: '#00B4A6', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, marginLeft: 2 }}
                  >×</button>
                </span>
              ))}
            </div>

            {/* Gợi ý thêm ảnh */}
            {mode === 'upload' && (
              <p style={{ color: '#8899A6', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                💡 Muốn thêm nguyên liệu? Upload thêm ảnh phía trên — kết quả sẽ được gộp lại.
              </p>
            )}
            {mode === 'camera' && (
              <p style={{ color: '#8899A6', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                💡 Muốn thêm nguyên liệu? Chụp thêm ảnh — kết quả sẽ được gộp lại.
              </p>
            )}

            {/* Nút sinh công thức */}
            <button style={S.genBtn} onClick={goGenerate}>
              🍳 Sinh công thức từ {ingredients.length} nguyên liệu này →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}