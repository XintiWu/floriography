import { TopBar } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { CanvasArea } from './components/CanvasArea';
import { useEditorState } from './store/useEditorState';

function App() {
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
      }}
    >
      <TopBar />
      <div 
        className="main-workspace"
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <LeftSidebar />
        <CanvasArea />
        <RightSidebar />
      </div>
    </div>
  );
}

export default App;
