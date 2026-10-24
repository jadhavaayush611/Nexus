import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/shell/AppShell.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { Overview } from './pages/Overview.tsx';
import { Institutions } from './pages/Institutions.tsx';
import { InstitutionProfile } from './pages/InstitutionProfile.tsx';
import { Complaints } from './pages/Complaints.tsx';
import { RelationshipReview } from './pages/RelationshipReview.tsx';
import { Evaluation } from './pages/Evaluation.tsx';
import { NotFound } from './pages/NotFound.tsx';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Product introduction landing page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<LandingPage />} />

        {/* Operational Workspace routes */}
        <Route element={<AppShell />}>
          <Route path="/overview" element={<Overview />} />
          <Route path="/institutions" element={<Institutions />} />
          <Route path="/institutions/:id" element={<InstitutionProfile />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/relationships" element={<RelationshipReview />} />
          <Route path="/review" element={<RelationshipReview />} />
          <Route path="/evaluation" element={<Evaluation />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
