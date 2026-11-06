---
name: publish-jira-issue
description: Use when the user has approved a local issue draft under .tmp/jira-issues/ (written by create-implementation-issue) and wants it created in, or synced to, Jira. Publishes only after explicit confirmation through the Atlassian MCP. Do not use to draft, refine, or implement issues.
---

# Publish an Approved Issue Draft to Jira

Create or update exactly one Jira issue from one approved local draft, write the
assigned key back into the draft, report the result, and stop. This skill does
not draft or rewrite requirements, implement the change, transition the ticket,
or assign it unless the user explicitly asks.

## Preconditions

1. Read the "Jira workspace" section of the nearest `AGENTS.md` for the site URL,
   cloud ID, project key, issue types, and field conventions. If it is missing,
   stop and ask the user for them; do not guess.
2. The Atlassian MCP must be connected with Jira write access. If a call fails
   with an authentication or permission error, stop and report it. This is a
   terminal failure: do not retry and do not switch to another publishing route.
3. The draft must be a direct child of `.tmp/jira-issues/` in the current
   repository. Reject absolute paths that resolve elsewhere, `..`, and symbolic
   links for `.tmp`, `.tmp/jira-issues`, or the draft.

## Validate the draft

Read the draft and its YAML front matter. Stop and report every problem at once if:

- `project_key` differs from the configured project key;
- `issue_type` is not one of the project's issue types (check with
  `getJiraProjectIssueTypesMetadata`);
- `summary` is empty, contains the Jira key, or exceeds 255 characters;
- `parent` or any `links[].key` does not exist (check with `getJiraIssue`);
- the body still contains template comments (`<!--`), unfilled `<...>` placeholders,
  or any placeholder other than `{{JIRA_KEY}}`;
- the body exceeds 32,000 characters;
- `jira_key` is a real key but that issue does not exist or belongs to another project.

Do not fix the draft yourself. Point the user back to `create-implementation-issue`
or ask them to edit the file.

Check for likely duplicates before creating: run `searchJiraIssuesUsingJql` with
`project = <KEY> AND summary ~ "<distinctive words>" AND statusCategory != Done`.
List matches in the preview.

## Confirm before writing

Show one preview and ask for an explicit yes in this turn. Approval for a
previous draft or an earlier publish does not carry over.

```text
Action:      create | update <KEY>
Project:     <KEY> on <site>
Type:        <issue type>      Parent: <key or none>
Summary:     <summary>
Labels:      <labels or none>  Priority: <priority or default>
Links:       <type key, ... or none>
Description: <N> lines, <M> characters, from .tmp/jira-issues/<slug>.md
Duplicates:  <keys + summaries, or none found>
```

For an update, also fetch the current description with `getJiraIssue` and say
plainly that the description will be replaced. If the current description holds
content that is not in the draft (for example notes added in Jira), list it and
ask whether to merge it into the draft first.

## Publish

Split the front matter from the body. Publish only the body, with
`contentFormat: "markdown"`.

**Create** (draft `jira_key` is `{{JIRA_KEY}}`):

1. `createJiraIssue` with `cloudId`, `projectKey`, `issueTypeName`, `summary`,
   `parent` when set, the body as `description`, and `labels`/`priority` through
   `additional_fields` when set.
2. Read the new key from the response. Replace every `{{JIRA_KEY}}` in the body
   with it and call `editJiraIssue` to set the final description.
3. If step 1 succeeded but step 2 failed, do not create again. Report the new key
   and tell the user the description still contains `{{JIRA_KEY}}`.

**Update** (draft `jira_key` is an existing key): call `editJiraIssue` with the
confirmed fields and description. Never change status, assignee, sprint, or
fields that are not in the front matter.

Then create each requested link with `createIssueLink`. Assign the ticket
(`lookupJiraAccountId`, then `editJiraIssue`) or transition it
(`getTransitionsForJiraIssue`, then `transitionJiraIssue`) only when the user
asked for that in this request.

## Write back and report

In the local draft, set `jira_key` to the real key and replace every
`{{JIRA_KEY}}` in the body. Leave everything else unchanged. Do not stage or
commit the draft.

Report:

- the key and `https://<site>/browse/<KEY>`;
- what was created or changed, including links, assignee, or transition;
- the branch name and PR title the implementer must use, taken from the draft's
  Delivery identity section;
- the next step: a human hands the ticket to the implementing agent (local or
  cloud). The implementing agent works from the Jira description, which is
  self-contained.

Then stop.
