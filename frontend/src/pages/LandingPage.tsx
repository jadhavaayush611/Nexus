import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  Building2,
  FileCheck2,
  Scale,
} from 'lucide-react';
import { Button } from '../components/common/Button.tsx';
import { StaticEvidenceDiagram } from '../components/landing/StaticEvidenceDiagram.tsx';
import './LandingPage.css';

// Lazy-load the 3D scene so the initial bundle stays fast and lightweight
const EvidenceThreadScene = React.lazy(() =>
  import('../components/landing/EvidenceThreadScene.tsx').then((module) => ({
    default: module.EvidenceThreadScene,
  }))
);

export const LandingPage: React.FC = () => {
  const [activeBeat, setActiveBeat] = useState<number>(1);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const explainerRef = useRef<HTMLElement>(null);
  const beat1Ref = useRef<HTMLDivElement>(null);
  const beat2Ref = useRef<HTMLDivElement>(null);
  const beat3Ref = useRef<HTMLDivElement>(null);

  // Monitor scroll over the 3 narrative explainer sections to drive 3D scene progress
  useEffect(() => {
    const handleScroll = () => {
      if (!explainerRef.current) return;
      const rect = explainerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Start when explainer enters viewport, finish when it leaves
      const totalDist = rect.height - windowHeight * 0.5;
      const currentDist = -rect.top + windowHeight * 0.25;

      const progress = Math.min(1, Math.max(0, currentDist / Math.max(1, totalDist)));
      setScrollProgress(progress);

      // Determine active beat
      if (progress < 0.35) {
        setActiveBeat(1);
      } else if (progress < 0.7) {
        setActiveBeat(2);
      } else {
        setActiveBeat(3);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToExplainer = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('explainer-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cw-landing">
      {/* Prototype Notice Header */}
      <div className="cw-landing__notice-bar">
        <div className="cw-landing__notice-inner">
          <ShieldAlert size={14} className="cw-landing__notice-icon" aria-hidden="true" />
          <span>
            <strong>SYNTHETIC PROTOTYPE:</strong> Developed for PS SIH26264 evaluation. Uses synthetic demo records and is not connected to official AICTE systems.
          </span>
        </div>
      </div>

      {/* A. Compact Header */}
      <header className="cw-landing__header">
        <div className="cw-landing__header-inner">
          <div className="cw-landing__brand">
            <span className="cw-landing__brand-badge">CW</span>
            <div className="cw-landing__brand-names">
              <span className="cw-landing__brand-title">CaseWeave</span>
              <span className="cw-landing__brand-sub">PS SIH26264 Prototype</span>
            </div>
          </div>

          <div className="cw-landing__header-nav">
            <a
              href="#explainer-section"
              onClick={scrollToExplainer}
              className="cw-landing__nav-link"
            >
              How Review Works
            </a>
            <Link to="/overview">
              <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} iconPosition="right">
                Open workspace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* B. Hero Section */}
      <section className="cw-landing__hero" aria-labelledby="hero-headline">
        <div className="cw-landing__hero-inner">
          <div className="cw-landing__hero-copy">
            <div className="cw-landing__eyebrow">
              INSTITUTIONAL CASE COORDINATION · SYNTHETIC PROTOTYPE
            </div>
            <h1 id="hero-headline" className="cw-landing__headline">
              Connect the evidence.<br />
              Keep the cases distinct.
            </h1>
            <p className="cw-landing__supporting-text">
              A review workspace for exploring potentially related institution complaints across bureaus, with evidence, human decisions and traceable history in one place.
            </p>

            <div className="cw-landing__cta-group">
              <Link to="/overview">
                <Button variant="primary" size="md" icon={<ArrowRight size={16} />} iconPosition="right">
                  Open workspace
                </Button>
              </Link>
              <a
                href="#explainer-section"
                onClick={scrollToExplainer}
                className="cw-landing__secondary-link"
              >
                <span>See how review works</span>
                <ChevronDown size={16} aria-hidden="true" />
              </a>
            </div>

            <div className="cw-landing__hero-note">
              <span>Demonstration uses fixed synthetic records. No AICTE endorsement implied.</span>
            </div>
          </div>

          {/* Hero 3D / Fallback Container */}
          <div className="cw-landing__hero-visual" aria-hidden="true">
            <Suspense fallback={<StaticEvidenceDiagram currentBeat={1} />}>
              <EvidenceThreadScene scrollProgress={scrollProgress} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* C. Three-Step Explainer with Synchronized 3D Narrative */}
      <section
        id="explainer-section"
        ref={explainerRef}
        className="cw-landing__explainer"
        aria-labelledby="explainer-heading"
      >
        <div className="cw-landing__explainer-inner">
          <div className="cw-landing__section-header">
            <span className="cw-landing__section-eyebrow">THE OPERATIONAL METAPHOR</span>
            <h2 id="explainer-heading" className="cw-landing__section-title">
              The Thread of Evidence
            </h2>
            <p className="cw-landing__section-desc">
              How CaseWeave helps operators discover relationships between complaints across AICTE bureaus without collapsing case boundaries or automating verdicts.
            </p>
          </div>

          <div className="cw-landing__narrative-grid">
            {/* Left: 3-Beat Editorial Narrative */}
            <div className="cw-landing__beats">
              {/* Beat 01 */}
              <article
                ref={beat1Ref}
                className={`cw-landing__beat ${activeBeat === 1 ? 'cw-landing__beat--active' : ''}`}
              >
                <div className="cw-landing__beat-num">01</div>
                <div className="cw-landing__beat-body">
                  <h3 className="cw-landing__beat-title">Find context: separate complaints under one institution</h3>
                  <p className="cw-landing__beat-text">
                    Complaints regarding the same college often reach different bureaus (Approval, Student Welfare, Policy) with distinct references, dates, and separate submitters. CaseWeave roots each matter in an authoritative institution anchor.
                  </p>
                  <div className="cw-landing__beat-highlight">
                    <Building2 size={16} aria-hidden="true" />
                    <span>Institution anchor preserves individual bureau ownership</span>
                  </div>
                </div>
              </article>

              {/* Beat 02 */}
              <article
                ref={beat2Ref}
                className={`cw-landing__beat ${activeBeat === 2 ? 'cw-landing__beat--active' : ''}`}
              >
                <div className="cw-landing__beat-num">02</div>
                <div className="cw-landing__beat-body">
                  <h3 className="cw-landing__beat-title">Inspect evidence: verified signals, not black-box scores</h3>
                  <p className="cw-landing__beat-text">
                    The matching engine generates an explainable evidence thread: normalized institution identity, category compatibility, date proximity, and TF-IDF cosine description similarity. Every signal is explicitly shown with observed values.
                  </p>
                  <div className="cw-landing__beat-highlight">
                    <FileCheck2 size={16} aria-hidden="true" />
                    <span>Same institution alone or similar text alone is never sufficient</span>
                  </div>
                </div>
              </article>

              {/* Beat 03 */}
              <article
                ref={beat3Ref}
                className={`cw-landing__beat ${activeBeat === 3 ? 'cw-landing__beat--active' : ''}`}
              >
                <div className="cw-landing__beat-num">03</div>
                <div className="cw-landing__beat-body">
                  <h3 className="cw-landing__beat-title">Record a decision: human review with mandatory reason</h3>
                  <p className="cw-landing__beat-text">
                    Reviewers confirm, request info, or dismiss suggestions with a mandatory written reason. Both complaint files remain completely separate; no case is merged, reassigned, or closed by the tool.
                  </p>
                  <div className="cw-landing__beat-highlight">
                    <Scale size={16} aria-hidden="true" />
                    <span>Suggestions never merge or alter original complaint status</span>
                  </div>
                </div>
              </article>
            </div>

            {/* Right: Sticky 3D Evidence Thread Canvas */}
            <div className="cw-landing__sticky-visual">
              <div className="cw-landing__sticky-card">
                <Suspense fallback={<StaticEvidenceDiagram currentBeat={activeBeat} />}>
                  <EvidenceThreadScene scrollProgress={scrollProgress} />
                </Suspense>
                <div className="cw-landing__sticky-hint">
                  <span>Beat 0{activeBeat} active · Scroll through the narrative</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* D. "Built for Careful Review" Section */}
      <section className="cw-landing__principles" aria-labelledby="principles-heading">
        <div className="cw-landing__principles-inner">
          <div className="cw-landing__section-header">
            <span className="cw-landing__section-eyebrow">DESIGN PRINCIPLES</span>
            <h2 id="principles-heading" className="cw-landing__section-title">
              Built for careful review
            </h2>
            <p className="cw-landing__section-desc">
              Three operational guarantees grounded in administrative due process.
            </p>
          </div>

          <div className="cw-landing__principles-grid">
            <div className="cw-landing__principle-card">
              <div className="cw-landing__principle-icon">
                <FileCheck2 size={22} aria-hidden="true" />
              </div>
              <h3 className="cw-landing__principle-title">Evidence visible</h3>
              <p className="cw-landing__principle-text">
                Every suggested relationship renders the exact underlying signal values, match direction, and confidence band. No hidden weights or opaque confidence meters.
              </p>
            </div>

            <div className="cw-landing__principle-card">
              <div className="cw-landing__principle-icon">
                <Scale size={22} aria-hidden="true" />
              </div>
              <h3 className="cw-landing__principle-title">Human decision</h3>
              <p className="cw-landing__principle-text">
                The algorithm only suggests candidate relationships. Authority rests entirely with the bureau officer. Dismissing a link requires a documented non-empty reason.
              </p>
            </div>

            <div className="cw-landing__principle-card">
              <div className="cw-landing__principle-icon">
                <Building2 size={22} aria-hidden="true" />
              </div>
              <h3 className="cw-landing__principle-title">Traceable history</h3>
              <p className="cw-landing__principle-text">
                Every review outcome, data load, and case update produces an immutable audit event. Decisions persist cleanly without altering original complaint numbers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* E. Final Call to Action */}
      <section className="cw-landing__final-cta">
        <div className="cw-landing__final-cta-inner">
          <h2>Ready to inspect the prototype?</h2>
          <p>
            Access the operational workspace with database-derived counts, candidate relationship queues, and institution chronologies.
          </p>
          <div className="cw-landing__final-cta-actions">
            <Link to="/overview">
              <Button variant="primary" size="md" icon={<ArrowRight size={16} />} iconPosition="right">
                Open workspace
              </Button>
            </Link>
            <Link to="/relationships">
              <Button variant="secondary" size="md">
                Direct to Relationship Review
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* F. Minimal Footer */}
      <footer className="cw-landing__footer">
        <div className="cw-landing__footer-inner">
          <div className="cw-landing__footer-left">
            <span className="cw-landing__footer-title">CaseWeave</span>
            <span className="cw-landing__footer-desc">
              Integrated Dashboard for Institution-Related Complaint Cases · PS SIH26264 Prototype
            </span>
          </div>

          <div className="cw-landing__footer-right">
            <span className="cw-landing__footer-disclaimer">
              Synthetic demo data only. No official AICTE endorsement or production readiness implied.
            </span>
            <div className="cw-landing__footer-links">
              <Link to="/overview">Overview</Link>
              <Link to="/relationships">Relationship Review</Link>
              <Link to="/evaluation">Evaluation & Method</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
