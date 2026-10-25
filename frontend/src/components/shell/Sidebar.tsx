import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  GitCompare,
  BarChart3,
  X,
  ShieldCheck,
} from 'lucide-react';
import './Sidebar.css';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavDestination {
  label: string;
  path: string;
  icon: React.ReactNode;
  hint?: string;
}

const NAV_DESTINATIONS: NavDestination[] = [
  {
    label: 'Overview',
    path: '/overview',
    icon: <LayoutDashboard size={18} aria-hidden="true" />,
  },
  {
    label: 'Institutions',
    path: '/institutions',
    icon: <Building2 size={18} aria-hidden="true" />,
    hint: 'Directory & Profiles',
  },
  {
    label: 'Complaints',
    path: '/complaints',
    icon: <FileText size={18} aria-hidden="true" />,
    hint: 'Cross-Bureau Register',
  },
  {
    label: 'Relationship Review',
    path: '/relationships',
    icon: <GitCompare size={18} aria-hidden="true" />,
    hint: 'Candidate Ledger',
  },
  {
    label: 'Evaluation & Method',
    path: '/evaluation',
    icon: <BarChart3 size={18} aria-hidden="true" />,
    hint: 'Benchmark Metrics',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  // Listen for Escape key on mobile when sidebar is open
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="cw-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="cw-sidebar"
        className={`cw-sidebar ${isOpen ? 'cw-sidebar--open' : ''}`}
        aria-label="Primary Navigation"
      >
        <div className="cw-sidebar__header">
          <div className="cw-sidebar__brand">
            <span className="cw-sidebar__brand-mark" aria-hidden="true">
              CW
            </span>
            <div className="cw-sidebar__brand-text">
              <span className="cw-sidebar__brand-title">CaseWeave</span>
              <span className="cw-sidebar__brand-sub">PS SIH26264</span>
            </div>
          </div>
          <button
            type="button"
            className="cw-sidebar__close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="cw-sidebar__nav">
          <div className="cw-sidebar__nav-group">
            <span className="cw-sidebar__nav-heading">OPERATIONS</span>
            <ul className="cw-sidebar__nav-list">
              {NAV_DESTINATIONS.map((dest) => (
                <li key={dest.path} className="cw-sidebar__nav-item">
                  <NavLink
                    to={dest.path}
                    className={({ isActive }) =>
                      `cw-sidebar__nav-link ${isActive ? 'cw-sidebar__nav-link--active' : ''}`
                    }
                    onClick={() => {
                      if (window.innerWidth <= 768) {
                        onClose();
                      }
                    }}
                  >
                    <span className="cw-sidebar__link-icon">{dest.icon}</span>
                    <span className="cw-sidebar__link-text">{dest.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="cw-sidebar__footer">
          <div className="cw-sidebar__env-badge">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Prototype v0.1.0</span>
          </div>
          <p className="cw-sidebar__footnote" style={{ marginBottom: 'var(--space-2)' }}>
            Connect the evidence.<br />
            Keep the cases distinct.
          </p>
          <NavLink
            to="/welcome"
            style={{
              fontSize: '0.72rem',
              color: '#4ed9c7',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            ← View Introduction & 3D Metaphor
          </NavLink>
        </div>
      </aside>
    </>
  );
};
