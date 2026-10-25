import React from 'react';
import './StaticEvidenceDiagram.css';

interface StaticEvidenceDiagramProps {
  currentBeat?: number; // 1, 2, or 3
  className?: string;
}

export const StaticEvidenceDiagram: React.FC<StaticEvidenceDiagramProps> = ({
  currentBeat = 2,
  className = '',
}) => {
  return (
    <div
      className={`cw-static-diagram ${className}`}
      role="img"
      aria-label="Diagram depicting two separate complaint records connected by an evidence thread around an institution anchor"
    >
      <svg
        viewBox="0 0 600 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="cw-static-diagram__svg"
      >
        {/* Background Grid Accent */}
        <pattern id="diag-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1" fill="#D7E0E3" />
        </pattern>
        <rect width="600" height="420" fill="url(#diag-grid)" rx="8" />

        {/* Central Institution Anchor */}
        <g className="cw-diagram__anchor">
          <rect
            x="200"
            y="30"
            width="200"
            height="46"
            rx="6"
            fill="#172B36"
            stroke="#146B62"
            strokeWidth="1.5"
          />
          <text x="300" y="52" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="600" letterSpacing="0.05em">
            INSTITUTION ANCHOR
          </text>
          <text x="300" y="66" textAnchor="middle" fill="#9cb1b8" fontSize="9.5" fontFamily="monospace">
            INST-2026-084 · Apex Institute
          </text>
        </g>

        {/* The Evidence Thread Curves */}
        <path
          d="M 300 76 C 300 130 170 140 170 190"
          stroke="#146B62"
          strokeWidth="2.5"
          strokeDasharray={currentBeat === 1 ? '4 4' : 'none'}
          className="cw-diagram__thread"
        />
        <path
          d="M 300 76 C 300 130 430 140 430 190"
          stroke="#146B62"
          strokeWidth="2.5"
          strokeDasharray={currentBeat === 1 ? '4 4' : 'none'}
          className="cw-diagram__thread"
        />

        {/* Direct Evidence Connection Line between Records */}
        <path
          d="M 230 250 C 300 230 300 230 370 250"
          stroke="#B57A4B"
          strokeWidth="2"
          strokeDasharray="3 3"
        />

        {/* Evidence Signal Badges on the Thread */}
        <g className="cw-diagram__signal">
          <circle cx="300" cy="235" r="12" fill="#FFFFFF" stroke="#B57A4B" strokeWidth="2" />
          <text x="300" y="239" textAnchor="middle" fill="#B57A4B" fontSize="9" fontWeight="700">
            92%
          </text>
          <rect x="235" y="210" width="130" height="18" rx="3" fill="#F8F3EF" stroke="#D7E0E3" />
          <text x="300" y="222" textAnchor="middle" fill="#8A4F00" fontSize="8.5" fontWeight="600">
            TF-IDF Cosine Similarity: 0.84
          </text>
        </g>

        {/* Complaint Record A (Left Card) */}
        <g className="cw-diagram__card-a">
          <rect
            x="50"
            y="170"
            width="220"
            height="180"
            rx="6"
            fill="#FFFFFF"
            stroke="#D7E0E3"
            strokeWidth="1.5"
            filter="drop-shadow(0 4px 6px rgba(23,43,54,0.06))"
          />
          <rect x="50" y="170" width="220" height="34" rx="6" fill="#F8FAF9" />
          <line x1="50" y1="204" x2="270" y2="204" stroke="#D7E0E3" strokeWidth="1" />
          <text x="64" y="191" fill="#172B36" fontSize="10.5" fontWeight="600">
            Complaint Record A
          </text>
          <text x="256" y="191" textAnchor="end" fill="#146B62" fontSize="9" fontWeight="500">
            Approval Bureau
          </text>
          <text x="64" y="222" fill="#72848C" fontSize="8.5" fontFamily="monospace">
            REF: AICTE/APP/2026/0412
          </text>
          <text x="64" y="240" fill="#4A5D65" fontSize="9">
            Category: Faculty Norms & Bio-metric
          </text>
          <text x="64" y="258" fill="#4A5D65" fontSize="9">
            Submitted: 12-Oct-2026 · Status: Open
          </text>
          {/* Mock description lines */}
          <rect x="64" y="274" width="190" height="6" rx="2" fill="#EBF4F3" />
          <rect x="64" y="286" width="160" height="6" rx="2" fill="#EBF4F3" />
          <rect x="64" y="298" width="130" height="6" rx="2" fill="#EBF4F3" />
          {/* Action indicator */}
          <rect x="64" y="322" width="80" height="16" rx="3" fill="#EDF7F0" stroke="#C3E6CF" />
          <text x="104" y="333" textAnchor="middle" fill="#1B633C" fontSize="8" fontWeight="600">
            Case Distinct
          </text>
        </g>

        {/* Complaint Record B (Right Card) */}
        <g className="cw-diagram__card-b">
          <rect
            x="330"
            y="170"
            width="220"
            height="180"
            rx="6"
            fill="#FFFFFF"
            stroke="#D7E0E3"
            strokeWidth="1.5"
            filter="drop-shadow(0 4px 6px rgba(23,43,54,0.06))"
          />
          <rect x="330" y="170" width="220" height="34" rx="6" fill="#F8FAF9" />
          <line x1="330" y1="204" x2="550" y2="204" stroke="#D7E0E3" strokeWidth="1" />
          <text x="344" y="191" fill="#172B36" fontSize="10.5" fontWeight="600">
            Complaint Record B
          </text>
          <text x="536" y="191" textAnchor="end" fill="#B57A4B" fontSize="9" fontWeight="500">
            Student Welfare
          </text>
          <text x="344" y="222" fill="#72848C" fontSize="8.5" fontFamily="monospace">
            REF: AICTE/SW/2026/0989
          </text>
          <text x="344" y="240" fill="#4A5D65" fontSize="9">
            Category: Faculty Attendance Discrepancy
          </text>
          <text x="344" y="258" fill="#4A5D65" fontSize="9">
            Submitted: 16-Oct-2026 · Status: Review
          </text>
          {/* Mock description lines */}
          <rect x="344" y="274" width="190" height="6" rx="2" fill="#F8F3EF" />
          <rect x="344" y="286" width="150" height="6" rx="2" fill="#F8F3EF" />
          <rect x="344" y="298" width="110" height="6" rx="2" fill="#F8F3EF" />
          {/* Action indicator */}
          <rect x="344" y="322" width="80" height="16" rx="3" fill="#EDF7F0" stroke="#C3E6CF" />
          <text x="384" y="333" textAnchor="middle" fill="#1B633C" fontSize="8" fontWeight="600">
            Case Distinct
          </text>
        </g>

        {/* Footer Guarantee */}
        <g className="cw-diagram__guarantee">
          <rect x="160" y="380" width="280" height="26" rx="4" fill="#FFFFFF" stroke="#D7E0E3" />
          <text x="300" y="397" textAnchor="middle" fill="#4A5D65" fontSize="9" fontWeight="500">
            ✓ Evidence linked · Never merged · Decisions audited
          </text>
        </g>
      </svg>
    </div>
  );
};
