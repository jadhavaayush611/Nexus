import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { Topbar } from './Topbar.tsx';
import { SyntheticBanner } from './SyntheticBanner.tsx';
import './AppShell.css';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="cw-app-shell">
      {/* Accessible skip link for keyboard users */}
      <a href="#main-content" className="cw-skip-link">
        Skip to main content
      </a>

      {/* Persistent Synthetic Demo Data Disclosure */}
      <SyntheticBanner />

      <div className="cw-app-shell__body">
        {/* Navigation Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Content Area */}
        <div className="cw-app-shell__workspace">
          <Topbar onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />

          <main id="main-content" className="cw-main-content" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
