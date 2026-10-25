import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Card } from '../components/common/Card.tsx';
import { Button } from '../components/common/Button.tsx';

export const NotFound: React.FC = () => {
  return (
    <div className="page-container" style={{ paddingTop: 'var(--space-12)' }}>
      <Card padding="lg" style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-warning-bg)',
              color: 'var(--color-warning-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={24} aria-hidden="true" />
          </div>
        </div>
        <h2 style={{ marginBottom: 'var(--space-2)' }}>Page Not Found</h2>
        <p style={{ marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
          The requested route does not exist in the CaseWeave operations console.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link to="/overview">
            <Button variant="secondary" icon={<ArrowLeft size={16} />}>
              Return to Overview
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
