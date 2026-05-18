import { motion, AnimatePresence } from 'framer-motion';
import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { CanvasArea } from './components/CanvasArea';
import { useEditorState } from './store/useEditorState';

import { CheckoutOverlay } from './components/CheckoutOverlay';
import { ShareOverlay } from './components/ShareOverlay';

function App() {
  const { isCheckoutOpen, isShareOpen } = useEditorState();
  const clearSelection = () => {
    useEditorState.getState().setSelectedItem(null);
  };

  return (
    <div 
      className="app-container" 
      onClick={clearSelection}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: 'var(--color-bg)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <TopBar />
      
      <div 
        className="main-workspace"
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <AnimatePresence>
          {!isCheckoutOpen && !isShareOpen && (
            <motion.div
              key="left-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ overflow: 'hidden' }}
            >
              <LeftSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          layout
          style={{ 
            flex: 1, 
            display: 'flex', 
            position: 'relative',
            zIndex: 1,
            height: '100%',
          }}
        >
          <CanvasArea />
        </motion.div>

        <AnimatePresence initial={false}>
          {!isCheckoutOpen && !isShareOpen ? (
            <motion.div
              key="right-sidebar"
              initial={{ width: 0, opacity: 0, x: 50 }}
              animate={{ width: 280, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 50 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ overflow: 'hidden' }}
            >
              <RightSidebar />
            </motion.div>
          ) : isCheckoutOpen ? (
            <motion.div
              key="checkout-panel"
              initial={{ width: 0, opacity: 0, x: 100 }}
              animate={{ width: 500, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 100 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ overflow: 'hidden' }}
            >
              <CheckoutOverlay />
            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>

      {/* Immersive Full Page Share Overlay */}
      <AnimatePresence>
        {isShareOpen && <ShareOverlay />}
      </AnimatePresence>
    </div>
  );
}

export default App;

