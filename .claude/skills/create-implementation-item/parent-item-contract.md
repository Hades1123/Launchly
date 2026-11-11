# Parent item contract (business level)

A parent item explains **what the business needs and why**, in words the business owner and the client would use. Every sentence describes what a person sees, does, decides or pays. How it gets built belongs in the implementation issues, which link back to it.

## Research sources

Use the config's knowledge sources (docs, wiki, product guide) for terminology and today's behavior. Use their product names exactly: roles, pages, plans, currencies or credits, and the current name of anything renamed. Code is not a source for this item. A business claim found in none of them goes under Open Questions, never asserted.

## Sections (produce these, in order)

1. **`# <Title>`**: the plain capability name, no id, following the config's title convention. If the user gave a prefix, keep it.
2. **Metadata block**: these lines, then a `---` rule.
   ```
   **Item ID:** <id or TBD (parent item)>
   **Status:** <status from config>
   **Priority:** <... or "To be prioritized">
   **Delivery label:** <feature | bug | maintenance> (exactly one; decides the gates in AGENTS.md)
   **Tracker:** <tool + project/board>
   **URL:** <item url or TBD>
   ```
3. **`## Context: User Stories`**: 3 to 7 bullets, one story each:
   ```
   - As a **<role>**, I want to <action the person takes or sees>, so that <business value>.
   ```
   - `<role>` is a product role name, or "user" when any role applies. Cover every role involved.
   - The "I want" part is something a person does or sees, never what the system does internally.
   - A story the user didn't ask for ends with `(assumed, to confirm)`.
4. **`## Summary`**: 2 to 4 sentences: the capability, who it's for, and what users can do afterwards.
5. **`## Why`**: how things work today from the user's side, and what that costs the business (risk, wasted spend, support load, lost trust). Up to 4 bullets.
6. **`## Business Rules`**: defaults, limits, thresholds, permissions and timing, one bullet per rule, `- D1:`. A rule someone decided ends with `(<name>, <date>)`; a rule the user didn't state ends with `(assumed, to confirm)`.
7. **`## Edge Cases`**: one bullet per case, `- E1: <what a person does or runs into> → <what they should see>`, in plain words. A case only an API client can hit ends with `(API only)`; every other case gets a Playwright test when the Story is a `feature` that changes the web app. The issues' Edge Cases build on these.
8. **`## Out of Scope`**: business-level boundaries (user groups, account types, related features). Bullets, unstated ones marked `(assumed, to confirm)`. End with `Ruled out: <option> (<reason>)` for options discussed and dropped.
9. **`## Acceptance Criteria`**: up to about 6 outcomes a product owner can check by using the product. One clause each.
10. **`## Open Questions`**: every open point from scoping, waiting to be posted. Grouped, and a group with no questions is left out:

```
**Business (<business owner>)**
- <question answerable without knowing the code> (assumed for now: <assumption>)
**Technical (<technical owner>)**
- <question code and docs can't settle> (checked: <what we looked at>)
```

With no owner name in the config, use just "Business" / "Technical". Write "None" if there are no questions. Answers the user guessed ("just guess") stay where they are, marked `(assumed, to confirm)`; they go here only if the user put them on the clarification list.

11. **`## Related`**: the implementation Subtasks (`SCRUM-<n>`, or `TBD` before they exist), sibling tracker items by title or id (with `Depends on:` for prerequisites), and doc section names.

That list is complete. No flow charts, root cause, implementation, file lists or estimates.

## Plain-language check (run before showing the draft)

Read every line except the Technical questions and the issue references in Related, and ask: **could a non-technical admin on the client side understand this line without a developer?** If not, rewrite it as what the user experiences, or drop it. Lines fail when they name: files, functions, components, classes, endpoints, HTTP methods, request fields, error codes, tables, columns, migrations, caches, config keys, "frontend"/"backend", or a split by tech layer. Product names from the UI or the docs pass.

## If the user wants it "dev-ready"

The parent stays business-level. Say in one line that technical detail goes into the implementation issues, and offer to draft those.

## Common mistakes

- **System-shaped stories** ("As the system, I want to block...") or a missing "so that". Every story has a human role and a business reason.
- **Code in business questions.** Ask the business question only.
- **Unmarked assumptions.** Mark them `(assumed, to confirm)`. If it could go either way, make it an Open Question.
- **Local references.** Readers see only Jira and GitHub. Name items by title or `SCRUM-<n>`, docs by repo path and section name.
- **Stale terms.** A term the docs mark as renamed.

## Voice

- Plain and direct, like a colleague explaining it at a desk. Short sentences, active voice, mixed sentence length.
- No filler or hype: drop "seamless", "robust", "leverage", "delve", "comprehensive", "ensure that", "in order to", and rhetorical groups of three.
- **No em dashes at all.** No `—`, no `--`, no inline `---`. The `---` rule after the metadata stays.
- Product terms stay exact. The fixed story shape is the contract, so rhythm rules don't apply to it.
- Before showing the draft, reread it once, cut any line that repeats another, then check for em dashes last.
