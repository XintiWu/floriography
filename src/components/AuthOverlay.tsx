"use client";

import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await authService.signIn(email, password);
      } else {
        await authService.signUp(email, password, fullName);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || '發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>
          <X size={20} />
        </button>

        <div style={styles.header}>
          <h2 style={styles.title}>{isLogin ? '會員登入' : '加入會員'}</h2>
          <p style={styles.subtitle}>
            {isLogin ? '歡迎回來，繼續創作' : '開啟您的花藝設計之旅'}
          </p>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            {error}
          </div>
        )}

        <form style={styles.form} onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>姓名</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input 
                  type="text" 
                  style={styles.input} 
                  placeholder="您的姓名"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>電子郵件</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input 
                type="email" 
                style={styles.input} 
                className="auth-input"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>密碼</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input 
                type="password" 
                style={styles.input} 
                className="auth-input"
                placeholder="至少 6 位字元"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button style={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? '登入' : '註冊')}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {isLogin ? '還沒有帳號嗎？' : '已經有帳號了？'}
            <button 
              style={styles.toggleBtn} 
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '立即註冊' : '返回登入'}
            </button>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-input::placeholder {
          color: #A08B7B !important;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 15, 10, 0.8)', // 更深、更具沉浸感的遮罩色
    backdropFilter: 'blur(12px)',
    zIndex: 9999, // 確保在最上層
  },
  modal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)', // 強制垂直水平居中
    width: '90%',
    maxWidth: '400px',
    backgroundColor: '#FCF9F6',
    borderRadius: '28px',
    padding: '40px 32px',
    boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(139, 90, 43, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    overflowY: 'auto',
  },
  closeBtn: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '8px',
    borderRadius: '50%',
    backgroundColor: 'rgba(139, 90, 43, 0.1)',
    color: '#8B5A2B',
    cursor: 'pointer',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#3E2A1F',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#8B5A2B',
    margin: 0,
    opacity: 0.7,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    padding: '14px',
    borderRadius: '12px',
    fontSize: '13px',
    marginBottom: '24px',
    textAlign: 'center',
    border: '1px solid #FECACA',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#4A3428', // 加深 Label 顏色
    paddingLeft: '4px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: '#8B5A2B',
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 44px',
    borderRadius: '16px',
    border: '1.5px solid rgba(139, 90, 43, 0.2)',
    backgroundColor: '#FFFFFF',
    fontSize: '15px',
    color: '#2D1B14',
    outline: 'none',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  submitBtn: {
    backgroundColor: '#8B5A2B',
    color: '#FFFFFF',
    padding: '16px',
    borderRadius: '16px',
    fontWeight: 700,
    fontSize: '16px',
    marginTop: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    boxShadow: '0 10px 20px -5px rgba(139, 90, 43, 0.4)',
    transition: 'all 0.2s',
  },
  footer: {
    marginTop: '32px',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#8B5A2B',
    fontWeight: 500,
  },
  toggleBtn: {
    color: '#8B5A2B',
    fontWeight: 800,
    marginLeft: '8px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    textDecoration: 'underline',
    textUnderlineOffset: '4px',
  }
};
