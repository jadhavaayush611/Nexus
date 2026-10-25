import React from 'react';
import { Layers, AlertTriangle, ShieldCheck, FileText, Clock } from 'lucide-react';
import './EvaluationMethodology.css';

export const EvaluationMethodology: React.FC = () => {
  return (
    <div className="cw-method-wrapper" role="region" aria-label="Methodology and Limitations">
      {/* Method Pipeline */}
      <div className="cw-method-section">
        <div className="cw-method-header">
          <Layers size={16} className="cw-method-icon" aria-hidden="true" />
          <div>
            <h3 className="cw-method-title">Matching Pipeline Methodology</h3>
            <p className="cw-method-subtitle">
              Deterministic, explainable multi-signal architecture designed for institutional auditability.
            </p>
          </div>
        </div>

        <div className="cw-method-pipeline">
          <div className="cw-method-step">
            <div className="cw-method-step__num">1</div>
            <div className="cw-method-step__body">
              <span className="cw-method-step__title">Identity Resolution & Alias Normalization</span>
              <p className="cw-method-step__desc">
                Extracts raw complainant institution text and resolves it against AICTE permanent
                institution identifiers and known alias directories. Discrepancies are flagged
                honestly as unverified.
              </p>
            </div>
          </div>

          <div className="cw-method-step">
            <div className="cw-method-step__num">2</div>
            <div className="cw-method-step__body">
              <span className="cw-method-step__title">Temporal Window Correlation</span>
              <p className="cw-method-step__desc">
                Calculates calendar distance between complaint submission dates. Filings within a
                45-day window receive positive temporal weighting; distant academic sessions are
                flagged for scrutiny.
              </p>
            </div>
          </div>

          <div className="cw-method-step">
            <div className="cw-method-step__num">3</div>
            <div className="cw-method-step__body">
              <span className="cw-method-step__title">Cross-Bureau Category Compatibility</span>
              <p className="cw-method-step__desc">
                Evaluates category compatibility using a deterministic cross-cell matrix (e.g. Student
                Welfare hostel grievances linked with Approval cell infrastructure audits).
              </p>
            </div>
          </div>

          <div className="cw-method-step">
            <div className="cw-method-step__num">4</div>
            <div className="cw-method-step__body">
              <span className="cw-method-step__title">TF-IDF Narrative Cosine Similarity</span>
              <p className="cw-method-step__desc">
                Analyzes textual overlap in grievance narratives, stripping common administrative
                boilerplate to identify shared specific factual descriptions across bureaus.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Limitations & Constraints */}
      <div className="cw-method-section cw-method-section--limitations">
        <div className="cw-method-header">
          <AlertTriangle size={16} className="cw-method-icon cw-method-icon--warning" aria-hidden="true" />
          <div>
            <h3 className="cw-method-title">Known Limitations & Operational Caveats</h3>
            <p className="cw-method-subtitle">
              Transparent assessment of prototype boundaries and validation constraints.
            </p>
          </div>
        </div>

        <div className="cw-method-limits-grid">
          <div className="cw-method-limit-card">
            <div className="cw-method-limit-card__header">
              <ShieldCheck size={14} className="cw-method-limit-icon" aria-hidden="true" />
              <span className="cw-method-limit-card__title">Labelled Synthetic Benchmark</span>
            </div>
            <p className="cw-method-limit-card__text">
              All reported metrics are measured against synthetic test scenarios curated for PS
              SIH26264. Real-world complainant language will exhibit regional variations and phrasing
              diversity requiring ongoing calibration.
            </p>
          </div>

          <div className="cw-method-limit-card">
            <div className="cw-method-limit-card__header">
              <FileText size={14} className="cw-method-limit-icon" aria-hidden="true" />
              <span className="cw-method-limit-card__title">Unstructured Complainant Input</span>
            </div>
            <p className="cw-method-limit-card__text">
              Complainants often submit informal college abbreviations without permanent AICTE
              IDs. While alias normalization captures high-frequency variants, unverified records
              must be confirmed manually.
            </p>
          </div>

          <div className="cw-method-limit-card">
            <div className="cw-method-limit-card__header">
              <Clock size={14} className="cw-method-limit-icon" aria-hidden="true" />
              <span className="cw-method-limit-card__title">Human Review Primacy</span>
            </div>
            <p className="cw-method-limit-card__text">
              CaseWeave is an operations review assistant, not an autonomous adjudicator. A score
              band organizes reviewer attention; it does not substitute for human regulatory
              decision-making.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
