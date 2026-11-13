# UX and Access Checklist: Admin Moderation Page for Companies

**Purpose**: Check that the UI requirements are complete and unambiguous before planning
**Created**: 2026-11-13
**Feature**: [spec.md](../spec.md)

**Review Ownership**: reviewer-owned; `[x]` means the requirement-quality criterion is satisfied.

## Access

- [ ] CHK001 - Is the behaviour defined for each non-admin case (recruiter, candidate, signed out)? [Coverage, Spec §E3]
- [ ] CHK002 - Is it stated that the menu entry is hidden, not just disabled, for non-admins? [Clarity, Spec §FR-001]

## States

- [ ] CHK003 - Are loading, empty, error and decided states each specified for the queue and the review page? [Completeness, Spec §FR-006, §FR-007]
- [ ] CHK004 - Is the post-decision state defined for both outcomes, including the reason text? [Clarity, Spec §FR-006]

## Reject Flow

- [ ] CHK005 - Is "disabled until a reason is typed" defined for a reason of only spaces? [Edge Case, Spec §FR-005]
- [ ] CHK006 - Is the cancel behaviour of the reason box specified? [Gap]

## Recruiter Side

- [ ] CHK007 - Is it specified where the reason appears in the recruiter workspace and how long text is handled? [Clarity, Spec §FR-008]

## Accessibility and Copy

- [ ] CHK008 - Are all new strings listed with their exact Vietnamese copy? [Completeness]
- [ ] CHK009 - Is the dialog required to be labelled and keyboard-closable? [Gap]
