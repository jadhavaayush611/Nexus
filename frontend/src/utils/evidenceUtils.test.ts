import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { categorizeEvidence } from './evidenceUtils.ts';
import type { EvidencePayload } from '../types/entities.ts';

describe('CaseWeave Evidence Categorization Utility', () => {
  it('handles empty/undefined evidence payload by classifying as unavailable without throwing', () => {
    const result = categorizeEvidence(undefined, 'Weak', 0.25);
    assert.equal(result.scoreBand, 'Weak');
    assert.equal(result.score, 0.25);
    assert.equal(result.supportingSignals.length, 0);
    assert.equal(result.conflictingSignals.length, 0);
    assert.equal(result.unavailableSignals.length, 1);
    assert.equal(result.unavailableSignals[0].direction, 'unavailable');
  });

  it('correctly maps structured backend signals into supporting and conflicting groups', () => {
    const mockEvidence: EvidencePayload = {
      institution_match: {
        matched: true,
        canonical_id: 'INST-2026-084',
        similarity: 1.0,
        notes: 'Identical AICTE permanent ID',
      },
      text_similarity: {
        score: 0.88,
        method: 'tfidf_cosine',
        excerpt_overlap: ['arbitrary fee escalation for hostel accommodation'],
      },
      date_proximity: {
        days_apart: 12,
        score: 0.9,
      },
      category_compatibility: {
        compatible: false,
        category_a: 'Hostel Facilities',
        category_b: 'Faculty Approval',
        similarity: 0.2,
      },
      summary_reasoning: 'Strong institution and temporal correspondence with divergent grievance domains.',
    };

    const result = categorizeEvidence(mockEvidence, 'High', 0.82);

    assert.equal(result.scoreBand, 'High');
    assert.equal(result.score, 0.82);
    assert.equal(result.summaryReasoning, 'Strong institution and temporal correspondence with divergent grievance domains.');

    // Supporting: institution_match (matched), text_similarity (0.88), date_proximity (12 days)
    assert.equal(result.supportingSignals.length, 3);
    const instSignal = result.supportingSignals.find((s) => s.name === 'institution_match');
    assert.ok(instSignal);
    assert.equal(instSignal?.observedValue, 'Canonical ID: INST-2026-084');

    // Conflicting: category_compatibility (incompatible)
    assert.equal(result.conflictingSignals.length, 1);
    const catSignal = result.conflictingSignals[0];
    assert.equal(catSignal.name, 'category_compatibility');
    assert.equal(catSignal.observedValue, 'Hostel Facilities vs Faculty Approval');
  });

  it('marks distant dates (> 45 days) as conflicting / scrutiny required', () => {
    const mockEvidence: EvidencePayload = {
      date_proximity: {
        days_apart: 120,
        score: 0.15,
      },
    };

    const result = categorizeEvidence(mockEvidence);
    const dateSignal = result.conflictingSignals.find((s) => s.name === 'date_proximity');
    assert.ok(dateSignal);
    assert.equal(dateSignal?.direction, 'conflicts');
    assert.equal(dateSignal?.observedValue, '120 days apart');
  });

  it('respects backend signals_list if explicitly provided', () => {
    const mockEvidence: EvidencePayload = {
      signals_list: [
        {
          name: 'student_cohort_match',
          score: 0.95,
          direction: 'supports',
          explanation: 'Both complaints mention batch of 2024–2028',
          observed_value: 'Batch 2024–2028',
        },
        {
          name: 'geographical_discrepancy',
          score: 0.1,
          direction: 'conflicts',
          explanation: 'Off-campus center vs Main campus',
          observed_value: 'Campus B vs Main',
        },
      ],
    };

    const result = categorizeEvidence(mockEvidence);
    assert.equal(result.supportingSignals.length, 1);
    assert.equal(result.supportingSignals[0].name, 'student_cohort_match');
    assert.equal(result.conflictingSignals.length, 1);
    assert.equal(result.conflictingSignals[0].name, 'geographical_discrepancy');
  });
});
