import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignOut() {
  useEffect(() => {
    signOut({ callbackUrl: '/' });
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      background: '#f9fafb'
    }}>
      <p style={{ color: '#6b7280' }}>Đang đăng xuất...</p>
    </div>
  );
}