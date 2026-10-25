import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, ExternalLink } from 'lucide-react';
import { HealthIndicator } from '../common/HealthIndicator.tsx';
import './Topbar.css';

export interface TopbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Scoped navigation to complaints search with reference or query
      navigate(`/complaints?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="cw-topbar" role="banner">
      <div className="cw-topbar__left">
        <button
          type="button"
          className="cw-topbar__menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
          aria-expanded={isSidebarOpen}
          aria-controls="cw-sidebar"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {/* Honest, clearly-scoped search input */}
        <form className="cw-topbar__search-form" onSubmit={handleSearchSubmit} role="search">
          <label htmlFor="topbar-search" className="sr-only">
            Search complaints register by reference or institution
          </label>
          <div className="cw-topbar__search-input-wrap">
            <Search size={15} className="cw-topbar__search-icon" aria-hidden="true" />
            <input
              id="topbar-search"
              type="search"
              className="cw-topbar__search-input"
              placeholder="Search complaints register (e.g. reference ID)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-describedby="topbar-search-scope"
            />
            <kbd className="cw-topbar__search-kbd" title="Press Enter to filter complaints register">
              ↵ Enter
            </kbd>
          </div>
          <span id="topbar-search-scope" className="sr-only">
            Submitting searches the complaints register with the entered query.
          </span>
        </form>
      </div>

      <div className="cw-topbar__right">
        {/* Honest backend health check indicator */}
        <HealthIndicator />

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="cw-topbar__doc-link"
          aria-label="Problem Statement SIH26264 Reference (opens external window)"
        >
          <span>PS SIH26264</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
};
