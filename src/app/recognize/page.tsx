'use client';
import { useState, useRef, useCallback } from 'react';

export default function RecognizePage() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh!');
      return;
    }

    setError(null);
    setIngredients([]);

    // Hiển thị preview
    const previewReader = new FileReader();
    previewReader.onload = (e) => setPreview(e.target?.result as string);
    previewReader.readAsDataURL(file);

    // Gọi API nhận dạng
    setLoading(true);
    const base64Reader = new FileReader();
    base64Reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      try {
        const res = await fetch('/api/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        const data = await res.json();
        if (data.error) {
          setError('Lỗi: ' + data.error + ' — Kiểm tra lại OPENAI_API_KEY trong .env.local');
        } else {
          setIngredients(data.ingredients || []);
        }
      } catch {
        setError('Không kết nối được API. Kiểm tra lại npm run dev có đang chạy không.');
      } finally {
        setLoading(false);
      }
    };
    base64Reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImage(file);
  }, [handleImage]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1923 0%, #162230 100%)',
      padding: '2rem',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#00B4A6', margin: 0 }}>
            AI Food Recognition
          </h1>
          <p style={{ color: '#8899A6', marginTop: '0.5rem' }}>
            Upload ảnh nguyên liệu → AI nhận dạng → Sinh công thức tự động
          </p>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? '#00B4A6' : '#2A3F52'}`,
            borderRadius: 16,
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(0,180,166,0.08)' : 'rgba(22,34,48,0.8)',
            transition: 'all 0.2s',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📷</div>
          <p style={{ color: '#ffffff', fontWeight: 600, margin: '0 0 0.25rem' }}>
            Click hoặc kéo thả ảnh vào đây
          </p>
          <p style={{ color: '#8899A6', fontSize: '0.875rem', margin: 0 }}>
            Hỗ trợ JPG, PNG, WEBP
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(255,80,80,0.1)',
            border: '1px solid rgba(255,80,80,0.3)',
            borderRadius: 10,
            padding: '1rem',
            color: '#ff6b6b',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: '1.5rem' }}>
            <img
              src={preview}
              alt="preview"
              style={{
                width: '100%',
                maxHeight: 300,
                objectFit: 'contain',
                borderRadius: 12,
                border: '1px solid #2A3F52',
              }}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            background: 'rgba(0,180,166,0.1)',
            border: '1px solid rgba(0,180,166,0.3)',
            borderRadius: 10,
            padding: '1rem',
            color: '#00B4A6',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
            {' '}Đang phân tích ảnh bằng GPT-4V...
          </div>
        )}

        {/* Kết quả */}
        {ingredients.length > 0 && (
          <div style={{
            background: 'rgba(22,34,48,0.9)',
            border: '1px solid rgba(0,180,166,0.3)',
            borderRadius: 16,
            padding: '1.5rem',
          }}>
            <h2 style={{ color: '#ffffff', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
              🥬 Nguyên liệu phát hiện ({ingredients.length})
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {ingredients.map((ing, i) => (
                <span key={i} style={{
                  background: 'rgba(0,180,166,0.15)',
                  border: '1px solid rgba(0,180,166,0.4)',
                  color: '#00B4A6',
                  padding: '0.375rem 0.875rem',
                  borderRadius: 999,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}>
                  {ing}
                </span>
              ))}
            </div>

            {/* Nút sinh công thức */}
            <button
              onClick={() => {
                const params = new URLSearchParams({ ingredients: ingredients.join(',') });
                window.location.href = `/?${params}`;
              }}
              style={{
                background: '#00B4A6',
                color: '#0f1923',
                border: 'none',
                borderRadius: 10,
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              🍳 Sinh công thức từ nguyên liệu này →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}