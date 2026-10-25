import React from 'react';
import { AlertCircle } from 'lucide-react';
import './SyntheticBanner.css';

export const SyntheticBanner: React.FC = () => {
  return (
    <div className="cw-synthetic-banner" role="region" aria-label="Dataset Notice">
      <div className="cw-synthetic-banner__content">
        <span className="cw-synthetic-banner__badge">
          <AlertCircle size={13} aria-hidden="true" />
          SYNTHETIC DEMO DATA
        </span>
        <span className="cw-synthetic-banner__text">
          Operational research prototype for PS SIH26264. Not connected to official AICTE live systems. All cases and institutions are synthetic.
        </span>
      </div>
    </div>
  );
};
