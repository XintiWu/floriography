"use client";

import React, { useState, useEffect } from 'react';
import { useEditorState } from '../store/useEditorState';
import { X, Send, CreditCard, User, Phone, MapPin, MessageSquare, ChevronLeft, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CheckoutOverlay: React.FC = () => {
  const { setCheckoutOpen, getTotalPrice, getUsedAssets } = useEditorState();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Auto-close after 3 seconds or let user click back
    setTimeout(() => {
      // setCheckoutOpen(false); // Optional: stay on success page
    }, 3000);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => setCheckoutOpen(false)}>
          <ChevronLeft size={20} />
          {isSubmitted ? '關閉' : '返回編輯'}
        </button>
        <div style={styles.headerTitle}>{isSubmitted ? '預訂成功' : '預訂詳情'}</div>
      </div>

      <div style={styles.scrollContent}>
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="checkout-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Preview Section */}
              <div style={styles.previewSection}>
                <div style={styles.priceSummary}>
                  <h3 style={styles.summaryTitle}>訂單摘要</h3>
                  <div style={styles.summaryList}>
                    {getUsedAssets().map(({ asset, count }) => (
                      <div key={asset.id} style={styles.summaryItem}>
                        <span style={styles.itemName}>{asset.name} <span style={styles.itemCount}>x{count}</span></span>
                        <span style={styles.itemPrice}>NT$ {asset.price * count}</span>
                      </div>
                    ))}
                  </div>
                  <div style={styles.totalRow}>
                    <span>總計金額</span>
                    <span style={styles.totalPrice}>NT$ {getTotalPrice()}</span>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div style={styles.formSection}>
                <div style={styles.formHeader}>
                  <h2 style={styles.sectionTitle}>配送資訊</h2>
                  <p style={styles.sectionSub}>請提供正確的聯繫資訊，以便我們與您確認訂單細節</p>
                </div>

                <form style={styles.form} onSubmit={handleSubmit}>
                  <div style={styles.field}>
                    <label style={styles.label}><User size={14} /> 姓名</label>
                    <input 
                      type="text" 
                      required 
                      style={styles.input} 
                      placeholder="請輸入姓名"
                      value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}><Phone size={14} /> 電話</label>
                    <input 
                      type="tel" 
                      required 
                      style={styles.input} 
                      placeholder="09xx-xxx-xxx"
                      value={form.phone}
                      onChange={(e) => setForm({...form, phone: e.target.value})}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}><MapPin size={14} /> 收件地址</label>
                    <input 
                      type="text" 
                      required 
                      style={styles.input} 
                      placeholder="請輸入收件地址"
                      value={form.address}
                      onChange={(e) => setForm({...form, address: e.target.value})}
                    />
                  </div>

                  <div style={styles.field}>
                    <label style={styles.label}><MessageSquare size={14} /> 備註 (選填)</label>
                    <textarea 
                      style={styles.textarea} 
                      placeholder="有什麼想告訴我們的嗎？"
                      value={form.notes}
                      onChange={(e) => setForm({...form, notes: e.target.value})}
                    />
                  </div>

                  <button type="submit" style={styles.submitBtn}>
                    <Send size={18} />
                    確認預訂
                  </button>
                  
                  <div style={styles.paymentInfo}>
                    <CreditCard size={14} />
                    <span>下單後將由專人聯繫確認付款細節</span>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success-message"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              style={styles.successContainer}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 12, stiffness: 200 }}
              >
                <CheckCircle size={80} color="#4CAF50" strokeWidth={1.5} />
              </motion.div>
              
              <h2 style={styles.successTitle}>感謝您的預訂！</h2>
              <p style={styles.successSub}>
                我們已收到您的訂單需求。<br />
                專人將於 24 小時內透過電話與您聯繫確認細節。
              </p>
              
              <div style={styles.successInfo}>
                <div style={styles.successInfoRow}>
                  <span>預訂編號</span>
                  <span style={{ fontWeight: 600 }}>FL-{Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</span>
                </div>
                <div style={styles.successInfoRow}>
                  <span>收件姓名</span>
                  <span>{form.name}</span>
                </div>
              </div>

              <button 
                style={styles.continueBtn} 
                onClick={() => setCheckoutOpen(false)}
              >
                返回工作區
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};



const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 2000,
    pointerEvents: 'none',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    pointerEvents: 'auto',
  },
  panel: {
    height: '100%',
    backgroundColor: 'var(--color-oat-100)',
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'auto',
    width: '100%',
  },
  header: {
    padding: '24px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: 'var(--color-brown-300)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    flex: 1,
    textAlign: 'center',
    marginRight: '80px', // Offset backBtn width
  },
  scrollContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '40px',
  },
  previewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  previewCard: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-md)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: '4/5',
    overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '2px',
  },
  loader: {
    color: 'var(--color-brown-300)',
    fontSize: '14px',
    fontStyle: 'italic',
  },
  priceSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
  },
  summaryTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-brown-500)',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: 'var(--color-brown-700)',
  },
  itemName: {
    color: 'var(--color-brown-900)',
    fontWeight: 500,
  },
  itemCount: {
    color: 'var(--color-brown-300)',
    fontSize: '12px',
    marginLeft: '4px',
  },
  itemPrice: {
    fontFamily: 'monospace',
    fontWeight: 500,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '20px',
    borderTop: '1px dashed var(--color-border)',
    fontSize: '16px',
    fontWeight: 700,
  },
  totalPrice: {
    color: 'var(--color-accent)',
    fontSize: '24px',
    fontFamily: 'Outfit',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    margin: 0,
  },
  sectionSub: {
    fontSize: '13px',
    color: 'var(--color-brown-400)',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-brown-500)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  input: {
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
  },
  textarea: {
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    outline: 'none',
    minHeight: '120px',
    resize: 'none',
    backgroundColor: '#fff',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '18px',
    backgroundColor: 'var(--color-brown-700)',
    color: '#fff',
    borderRadius: 'var(--radius-lg)',
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: 'none',
    boxShadow: '0 10px 20px rgba(62, 39, 35, 0.15)',
  },
  paymentInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--color-brown-300)',
    marginTop: '8px',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    textAlign: 'center',
    height: '100%',
  },
  successTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--color-brown-700)',
    marginTop: '24px',
    marginBottom: '8px',
  },
  successSub: {
    fontSize: '15px',
    color: 'var(--color-brown-400)',
    lineHeight: 1.6,
    marginBottom: '32px',
  },
  successInfo: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '40px',
    border: '1px solid var(--color-border)',
  },
  successInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: 'var(--color-brown-500)',
  },
  continueBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: 'var(--color-brown-700)',
    color: '#fff',
    borderRadius: 'var(--radius-lg)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  }
};

