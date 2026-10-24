import type { EvidencePayload, SignalDetail, ScoreBand } from '../types/entities.ts';

export interface EvaluatedSignal {
  name: string;
  label: string;
  direction: 'supports' | 'conflicts' | 'neutral' | 'unavailable';
  observedValue: string;
  explanation: string;
  score?: number;
}

export interface CategorizedEvidence {
  scoreBand: ScoreBand;
  score: number;
  summaryReasoning?: string;
  supportingSignals: EvaluatedSignal[];
  conflictingSignals: EvaluatedSignal[];
  unavailableSignals: EvaluatedSignal[];
}

/**
 * Deterministically categorize backend-supplied matching signals into
 * Supporting, Conflicting/Scrutiny, and Unavailable groups without fabricating data.
 */
export function categorizeEvidence(
  evidence: EvidencePayload | undefined,
  fallbackScoreBand: ScoreBand = 'Review',
  fallbackScore: number = 0.5
): CategorizedEvidence {
  const supportingSignals: EvaluatedSignal[] = [];
  const conflictingSignals: EvaluatedSignal[] = [];
  const unavailableSignals: EvaluatedSignal[] = [];

  if (!evidence) {
    unavailableSignals.push({
      name: 'evidence_payload',
      label: 'Evidence Payload',
      direction: 'unavailable',
      observedValue: 'Not provided',
      explanation: 'The matching service did not attach an evidence payload for this candidate link.',
    });

    return {
      scoreBand: fallbackScoreBand,
      score: fallbackScore,
      supportingSignals,
      conflictingSignals,
      unavailableSignals,
    };
  }

  // 1. If explicit signals_list is provided by backend
  if (Array.isArray(evidence.signals_list) && evidence.signals_list.length > 0) {
    evidence.signals_list.forEach((sig: SignalDetail) => {
      const evaluated: EvaluatedSignal = {
        name: sig.name,
        label: sig.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        direction: sig.direction,
        observedValue: sig.observed_value || `${Math.round(sig.score * 100)}% match weight`,
        explanation: sig.explanation || 'Signal evaluated by matching service.',
        score: sig.score,
      };

      if (sig.direction === 'supports') {
        supportingSignals.push(evaluated);
      } else if (sig.direction === 'conflicts') {
        conflictingSignals.push(evaluated);
      } else {
        unavailableSignals.push(evaluated);
      }
    });
  }

  // 2. Institution Match Signal
  if (evidence.institution_match) {
    const im = evidence.institution_match;
    if (im.matched) {
      supportingSignals.push({
        name: 'institution_match',
        label: 'Institution Match',
        direction: 'supports',
        observedValue: im.canonical_id
          ? `Canonical ID: ${im.canonical_id}`
          : `${Math.round(im.similarity * 100)}% text similarity`,
        explanation:
          im.notes ||
          (im.canonical_id
            ? 'Complaints resolve to identical permanent institution identifier.'
            : 'Institution names demonstrate strong textual correspondence.'),
        score: im.similarity,
      });
    } else {
      conflictingSignals.push({
        name: 'institution_match',
        label: 'Institution Match',
        direction: 'conflicts',
        observedValue: `${Math.round(im.similarity * 100)}% similarity (Different IDs)`,
        explanation:
          im.notes ||
          'Complaints originate from distinct or unresolved institution identities. Scrutiny required.',
        score: im.similarity,
      });
    }
  } else if (!evidence.signals_list) {
    unavailableSignals.push({
      name: 'institution_match',
      label: 'Institution Identity Match',
      direction: 'unavailable',
      observedValue: 'Unavailable / Not provided',
      explanation: 'No explicit institution match score supplied by backend.',
    });
  }

  // 3. Text / Description Similarity Signal
  if (evidence.text_similarity) {
    const ts = evidence.text_similarity;
    const pct = Math.round(ts.score * 100);
    const methodLabel = ts.method ? ` (${ts.method})` : '';

    if (ts.score >= 0.65) {
      supportingSignals.push({
        name: 'text_similarity',
        label: `Description Similarity${methodLabel}`,
        direction: 'supports',
        observedValue: `${pct}% cosine similarity`,
        explanation:
          ts.excerpt_overlap && ts.excerpt_overlap.length > 0
            ? `High semantic overlap in grievance narrative: "${ts.excerpt_overlap[0]}"`
            : 'Complaint narratives describe substantially similar operational grievances.',
        score: ts.score,
      });
    } else if (ts.score <= 0.35) {
      conflictingSignals.push({
        name: 'text_similarity',
        label: `Description Similarity${methodLabel}`,
        direction: 'conflicts',
        observedValue: `${pct}% cosine similarity`,
        explanation: 'Grievance narratives describe largely disparate concerns or topics.',
        score: ts.score,
      });
    } else {
      supportingSignals.push({
        name: 'text_similarity',
        label: `Description Similarity${methodLabel}`,
        direction: 'supports',
        observedValue: `${pct}% cosine similarity`,
        explanation: 'Moderate topic overlap detected across grievance descriptions.',
        score: ts.score,
      });
    }
  } else if (!evidence.signals_list) {
    unavailableSignals.push({
      name: 'text_similarity',
      label: 'Narrative Text Similarity',
      direction: 'unavailable',
      observedValue: 'Unavailable / Not provided',
      explanation: 'TF-IDF or embedding similarity calculation was not attached.',
    });
  }

  // 4. Category Compatibility Signal
  if (evidence.category_compatibility) {
    const cc = evidence.category_compatibility;
    if (cc.compatible) {
      supportingSignals.push({
        name: 'category_compatibility',
        label: 'Category Compatibility',
        direction: 'supports',
        observedValue: `${cc.category_a} ↔ ${cc.category_b}`,
        explanation: 'Grievance classifications across bureaus are complementary or related.',
        score: cc.similarity,
      });
    } else {
      conflictingSignals.push({
        name: 'category_compatibility',
        label: 'Category Divergence',
        direction: 'conflicts',
        observedValue: `${cc.category_a} vs ${cc.category_b}`,
        explanation: 'Categories belong to separate non-overlapping operational domains.',
        score: cc.similarity,
      });
    }
  } else if (!evidence.signals_list) {
    unavailableSignals.push({
      name: 'category_compatibility',
      label: 'Category Compatibility',
      direction: 'unavailable',
      observedValue: 'Unavailable / Not provided',
      explanation: 'Category correlation matrix data not provided by backend.',
    });
  }

  // 5. Date Proximity Signal
  if (evidence.date_proximity) {
    const dp = evidence.date_proximity;
    if (dp.days_apart <= 45) {
      supportingSignals.push({
        name: 'date_proximity',
        label: 'Submission Date Proximity',
        direction: 'supports',
        observedValue: `${dp.days_apart} day${dp.days_apart === 1 ? '' : 's'} apart`,
        explanation: 'Complaints were submitted within a close temporal window.',
        score: dp.score,
      });
    } else {
      conflictingSignals.push({
        name: 'date_proximity',
        label: 'Temporal Distance',
        direction: 'conflicts',
        observedValue: `${dp.days_apart} days apart`,
        explanation: 'Filing dates are separated by more than 45 days. Examine whether grievances relate to distinct academic sessions.',
        score: dp.score,
      });
    }
  } else if (!evidence.signals_list) {
    unavailableSignals.push({
      name: 'date_proximity',
      label: 'Date Proximity',
      direction: 'unavailable',
      observedValue: 'Unavailable / Not provided',
      explanation: 'Temporal distance score not computed by backend.',
    });
  }

  return {
    scoreBand: fallbackScoreBand,
    score: fallbackScore,
    summaryReasoning: evidence.summary_reasoning,
    supportingSignals,
    conflictingSignals,
    unavailableSignals,
  };
}
