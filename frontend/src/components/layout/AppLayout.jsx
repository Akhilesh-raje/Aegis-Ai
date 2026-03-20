import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';
import CommandPalette from './CommandPalette';
import CyberBattlefield from './CyberBattlefield';
import AIChatAssistant from '../dashboard/AIChatAssistant';

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden relative">
      <CyberBattlefield />
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative z-10">
        <StatusBar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-[var(--color-bg-primary)]/40 backdrop-blur-sm">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
      <AIChatAssistant />
    </div>
  );
}
