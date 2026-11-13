# API Security and Reliability Checklist: Admin Approves or Rejects Jobs

**Purpose**: Check that requirements for admin-only access, double decisions, email failures and the kept reason are complete before planning
**Created**: 2026-11-13
**Feature**: [spec.md](../spec.md)

**Review Ownership**: reviewer-owned; `[x]` means the requirement-quality criterion is satisfied, not that code is done.

## Access Control

- [ ] CHK001 - Are allowed roles stated for all four admin job actions? [Completeness, Spec §FR-001]
- [ ] CHK002 - Is it stated that the creator email appears only in admin responses? [Gap, Spec §FR-002]

## Double Decisions

- [ ] CHK003 - Is "only a pending job may be decided" defined for draft, published, rejected and closed jobs alike? [Coverage, Spec §FR-006]
- [ ] CHK004 - Is SC-003 measurable with a concrete concurrent scenario? [Measurability, Spec §SC-003]

## Visibility

- [ ] CHK005 - Is the interaction between job approval and an unapproved company defined (E5)? [Clarity, Spec §FR-008]
- [ ] CHK006 - Is it stated that a rejected job never appears to candidates? [Completeness, Spec §FR-004]

## Kept Reason

- [ ] CHK007 - Is it consistent that the reason is kept on resubmit (FR-011) and cleared on approve (FR-004)? [Consistency]
- [ ] CHK008 - Is the effect of the kept reason on the recruiter's pages stated? [Gap, Spec §Clarifications]

## Email

- [ ] CHK009 - Is email content limited to job title, company name, outcome and reason? [Completeness, Spec §FR-009]
- [ ] CHK010 - Is it stated that a refused decision sends no email? [Consistency, Spec §FR-009, §SC-004]
