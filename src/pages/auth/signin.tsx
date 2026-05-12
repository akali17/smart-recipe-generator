import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export default function SignIn() {
  useEffect(() => {
    signIn('google', { callbackUrl: '/' });
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
      <p style={{ color: '#6b7280' }}>Đang chuyển đến đăng nhập Google...</p>
    </div>
  );
}