# Jira reference

Launchly tracks work in Jira Cloud. Site, cloud ID, project and issue types are in `AGENTS.md` ("Jira workspace") and `.claude/create-implementation-item.md`. Never guess an id (issue type, user, field): look it up first.

## Detect the item

| URL shape                                                               | Item id                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `https://hcmut-team-vmaq1hvy.atlassian.net/browse/SCRUM-<n>`            | `SCRUM-n`                                            |
| `https://hcmut-team-vmaq1hvy.atlassian.net/...?selectedIssue=SCRUM-<n>` | `SCRUM-n`                                            |
| any other host                                                          | ask the user; this skill writes to Jira `SCRUM` only |

## Access routes (try in order)

1. **Atlassian MCP** (`mcp__plugin_productivity_atlassian__*`). The tools are deferred: load them with ToolSearch (`select:<name>`) before the first call. After the first call, tell the user once that the connection uses the deprecated v1 endpoint, as the server instructs.
2. **REST API** with a token the user already has in an env var (ask for the var name, never for the token).

None works: pause per SKILL.md, "When a tool is unusable".

## Operations

| Operation                                          | MCP tool                                                             | Notes                                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Read item (description, comments, subtasks, links) | `getJiraIssue`                                                       | Ask for comments and subtasks; read each Subtask with its own call.                                                    |
| Find existing items                                | `searchJiraIssuesUsingJql`                                           | e.g. `parent = SCRUM-<n>`, `project = SCRUM AND summary ~ "<term>"`                                                    |
| Field and type ids                                 | `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields` | Look up before the first create in a session.                                                                          |
| Create Story / Subtask                             | `createJiraIssue`                                                    | Story: project `SCRUM`, type `Story`, `labels: [<delivery label>]`. Subtask: type `Subtask`, `parent` = the Story key. |
| Write description, set labels                      | `createJiraIssue` / `editJiraIssue`                                  | Check the content format the server expects (markdown vs ADF) with `getContentFormatGuide` once.                       |
| Comment                                            | `addCommentToJiraIssue`                                              |                                                                                                                        |
| Link items                                         | `createIssueLink` (types from `getIssueLinkTypes`)                   | `Relates` for siblings outside the Story.                                                                              |
| User ids                                           | `lookupJiraAccountId`, `atlassianUserInfo` (current user)            | Mentions and assignees use the accountId.                                                                              |

Never call `transitionJiraIssue` from this skill. People transition tickets.

## Reading a ticket (step 2)

- Read the description, all comments, Subtasks and linked items.
- Not found: check whether the key is a Subtask and scope its parent Story instead. Otherwise stop and ask for the right link.
- **Existing Subtask match:** compare titles trimmed and case-insensitive, by area prefix (`api:`, `web:`, ...). The clarification Subtask must match the config name exactly.
- **Delivery label:** the Story must carry exactly one of `feature`, `bug`, `maintenance`. Missing or several: the Gate 1 table includes the label edit.

## Creating the parent (Idea mode)

- Summary = the approved title. Never use an em dash as a separator.
- Type `Story`, status from config, `labels: [<delivery label>]`, description in the same call, then read it back.
- Any field from config that came back empty: set it with `editJiraIssue`.

## Writing the description

1. Drop the `# Title` line and the metadata block (summary and fields hold them).
2. Write it, then **read it back**. Verified only if the call succeeded and the read-back contains every section heading.
3. Failed or unverifiable: tell the user the exact error, don't loop on retries, and offer (a) the user pastes the draft shown in chat, or (b) post it as the item's first comment. Never claim the description is set without a read-back or the user's confirmation.

## Link Subtasks back (step 6)

- **Idea mode (we wrote the Story):** fill the Subtask keys into its `## Related` section and re-run the description write.
- **Ticket mode (the Story already existed):** never rewrite its description. Post one comment, previewed at Gate 1:
  ```
  Implementation subtasks for this story:
  - <area>: SCRUM-<n> <title>
  ```
  Read it back: the newest comment must contain every key.

## Clarification comment (Gate 2 preview, then post)

One comment on the clarification Subtask. Include an owner's section only if that owner has questions, and mention only those owners (accountId mentions).

```
Hi <business owner>, <technical owner>,
While scoping <story title> we have a few open points we can't settle ourselves:

Business (<business owner>)
1. <question, answerable without knowing the code>

Technical (<technical owner>)
1. <question + what we already checked>

Until we hear back we're assuming: <assumption per question>.
```

If the clarification Subtask doesn't exist, its creation is part of the Gate 2 preview. Read the comment back after posting.
