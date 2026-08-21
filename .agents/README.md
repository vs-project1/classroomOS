# Agent Workspace

This folder is the **paper trail** for multi-agent work. Nothing here is loaded
by opencode automatically — real invocable agents live in `.opencode/agent/`.

## Layout

```
.agents/
├── templates/     # copy-paste skeletons for dispatching a new agent instance
└── runs/
    ├── _archive/  # closed milestone runs (pre-restructure history kept intact)
    └── <date>_<task>/   # one folder per dispatched agent instance
```

## Instance lifecycle

Every dispatched agent gets its own folder under `runs/<date>_<task>/<role>_<n>/`
with four artifacts:

| File | Written by | Purpose |
|---|---|---|
| `BRIEFING.md` | orchestrator | role, scope (owned paths), constraints, done-criteria |
| `DISPATCH.md` | orchestrator | the exact prompt sent to the model |
| `progress.md` | agent | running log of what was tried/found |
| `handoff.md` | agent (last) | result summary returned to the orchestrator |

## Rules

1. A worker may only edit paths listed in its briefing's **Owned paths**.
2. Every run ends with a `handoff.md` — no silent completions.
3. Archive whole run folders into `_archive/<campaign>/` when the milestone closes; never delete history.
