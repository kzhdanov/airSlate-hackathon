---
description: Ревью только изменённых файлов этого проекта — реальные баги + чистка, строго по диффу
argument-hint: "[base-branch]   # опционально; по умолчанию = изменения рабочего дерева vs HEAD"
allowed-tools: Bash(git:*), Read, Grep, Glob, Task
---

Review **only the changed files** in this repository (the cwd). Do not touch unchanged files.

This is a **Next.js 16 (App Router) / React 19 / TypeScript** project; the app lives in `web/`.

## Current state (auto-collected)

- status: !`git status --short 2>/dev/null || echo "(not a repo / no changes)"`
- diffstat vs HEAD: !`git --no-pager diff --stat HEAD 2>/dev/null`

## Scope

Determine the changed-file set:
- **Default (no argument):** the working-tree changes — staged + unstaged + untracked. Use `git diff HEAD` plus any untracked files from `git status --short`.
- **If a base branch `$1` is given** (e.g. `main`, `origin/main`): also include what the current branch added on top of it — `git diff <base>...HEAD` — merged with the working-tree changes above.
- If there are no changes, say so in one line. Do not invent work.

## How to review

For each changed file:
1. Read the actual diff (`git diff [<base>...HEAD] -- <file>`) and enough surrounding code to judge it in context.
2. Honor this repo's `CLAUDE.md` / `AGENTS.md` (root and nearest-directory) as binding guidance when present.
3. Flag, in priority order: correctness bugs → broken/contradicted call paths → reuse / simplification / efficiency cleanups. Watch for the pitfalls common in this stack:
   - **Client/server boundary** — `"use client"` correctness, secrets or Node-only APIs leaking into client components, `async`/streaming API routes (`app/api/**`).
   - **React 19 / hooks** — missing/incorrect effect dependencies, state updates that re-mount or reset a component, stale closures, keys on lists.
   - **Data flow** — the extract → form → generate → edit pipeline: field keys, `FormData` shape, and the streamed-text handling staying consistent end to end.
   - **TypeScript** — real type holes (`any`, unchecked casts, non-null `!` that can actually be null), not formatter nits.
4. If more than ~5 files changed, fan out parallel review subagents (one per file or small batch) and merge their findings; otherwise review inline.

Bar for reporting (avoid noise):
- Report only issues a senior engineer would call out. Verify the main call path before labeling something a regression.
- Skip: pure style/lint/type-checker/formatting nits, pre-existing issues on unmodified lines, speculative concerns you can't substantiate, and changes that are likely intentional.

## Severity (3 levels)

Classify every finding into exactly one of three levels:
- **[Критично]** — ломает корректность или данные, падение/исключение, уязвимость, либо разрыв основного пользовательского пути (upload → extract → generate → edit).
- **[Средне]** — реальный баг на edge-case или неосновном пути, либо заметная проблема качества/производительности, которую стоит починить.
- **[Низко]** — мелкая чистка, упрощение, дублирование, низкий риск.

## Output

Write the review **in Russian** — it is read by a Russian-speaking engineer. Keep code identifiers, file paths, and `path:line` references verbatim (never translate or transliterate them). Terse. Group by file. No preamble, no emojis.
- Lead with a one-line verdict, e.g. `Изменено 2 файла — 1 баг, 1 чистка`.
- For each finding: `path:line` + one-line description + why it matters.
- Clean tree: `<n> файлов проверено — проблем нет.` or `Без изменений.`

Always end with a concise summary ordered from critical to low, under an `Итог (критичное → низкое):` heading. One numbered line per issue: a bracketed severity tag (`[Критично]` / `[Средне]` / `[Низко]`) + `path:line` + the fix in a few words — e.g. `1. [Критично] web/app/page.tsx:87 — null-разыменование при пустом ответе; добавить guard.`
If nothing was flagged, skip the list and say so in one line instead.
