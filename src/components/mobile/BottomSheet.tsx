import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { MobileTab } from './MobileToolbar';

interface BottomSheetProps {
  activeTab: MobileTab | null;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ activeTab, onClose, children, title }) => {
  return (
    <AnimatePresence>
      {activeTab && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={styles.backdrop}
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            style={styles.sheet}
            className="glass"
          >
            {/* Drag Handle */}
            <div style={styles.dragHandleWrapper}>
              <div style={styles.dragHandle} />
            </div>

            {/* Header */}
            <div style={styles.header}>
              <h3 style={styles.title}>{title}</h3>
              <button onClick={onClose} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            {/* Content container */}
            <div style={styles.content}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#5C4033',
    zIndex: 108,
  },
  sheet: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))',
    height: '46vh',
    borderTopLeftRadius: 'var(--radius-xl)',
    borderTopRightRadius: 'var(--radius-xl)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 109,
    boxShadow: '0 -8px 32px rgba(92, 64, 51, 0.12)',
    overflow: 'hidden',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderTop: '1px solid rgba(139, 90, 43, 0.15)',
  },
  dragHandleWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0',
    cursor: 'grab',
  },
  dragHandle: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: 'var(--color-oat-400)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px 12px 16px',
    borderBottom: '1px solid var(--color-border)',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-brown-700)',
    margin: 0,
  },
  closeBtn: {
    padding: '4px',
    color: 'var(--color-brown-300)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    WebkitOverflowScrolling: 'touch', // Smooth iOS scrolling
  }
};
