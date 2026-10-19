---
name: flow-code-review
description: "Code review — review a pull request, a branch or a code path with the review lenses of this app, then merge, grade and write the findings to a JSON file. Use when you review a pull request or a diff, when a person asks for a review of a file or a directory, or when a CI job needs a findings file."
---
# Code Review

This skill reviews a change with the review lenses of this app. Each lens searches for one kind of defect. This skill runs the lenses, then merges and grades their findings. It writes the findings to a file. It does not post to GitHub.

## 1. Find what to review

- When the request gives a base and a head, review the diff from their merge base to the head: `git diff <base>...<head>`.
- When the request names a path, review each file under that path, whole.
- In all other cases, review the working tree against the default branch.

In a diff, review only the lines that the change adds or modifies. You can read the rest of a file, and other files, to understand those lines. Do not report on them.

## 2. Read the settings

Read `.flow/review.yml` if it exists. It can set `maxFindings`, `maxParallel`, an `ignore` list of globs, an `accepted` list of findings, and a `lenses` list. Each entry of `accepted` has a `lens`, the `finding` in a few words, and a `reason`.

Each entry of `lenses` has a `ref`, and can have a list of `globs` and a `severity`. The `ref` is the name of a Flow lens in the table below, such as `review-access-control`, or the path from the project root to the `SKILL.md` of a lens of the app. A lens without `globs` reviews the whole change. A `severity` gives each finding of the lens that severity.

When the file has a `lenses` list, it is the whole set of lenses to run. When it does not, run the lenses in this table, with their globs and severities. The default `maxFindings` is 10. The default `maxParallel` is 4.

| Lens                                       | Default globs                                                                    | Severity |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------- |
| `/flow-review-access-control`     | `app/**`                                                             | graded   |
| `/flow-review-response-exposure`  | `app/**`, `inertia/**`, `resources/views/**` | graded   |
| `/flow-review-response-design`    | `app/**`, `inertia/**`, `resources/views/**` | graded   |
| `/flow-review-cruddy-controllers` | `app/controllers/**`, `start/routes.ts`                  | `nit`    |
| `/flow-review-migration-safety`   | `database/migrations/**`                                             | graded   |
| `/flow-review-input-validation`   | `app/**`, `database/migrations/**`                       | graded   |
| `/flow-review-query-cost`         | `app/**`                                                             | graded   |
| `/flow-review-code-placement`     | `app/**`                                                             | `nit`    |
| `/flow-review-tests`              | `app/**`, `tests/**`                                     | graded   |

## 3. Run each lens

For each lens in the set that has a file to review under its globs:

1. Read the lens.
2. Follow the lens on the files under its globs.
3. Take each finding as one candidate. Record the file, the line, the problem, what the lens asks a finding to name, and the fix.

When a lens says to stop, stop that lens and go to the next one.

If you can start sub-agents, start one for each lens. Give it the lens, the files under its globs, and what to review from step 1. Run at most `maxParallel` sub-agents at a time. When one finishes, start the next lens. If you cannot start sub-agents, do one lens after the other.

Wait until every lens has returned its findings before you go to step 4. Do not end your turn while a lens runs.

## 4. Check each finding

Open the file again for each candidate. Keep the finding only if it clears the Threshold of its lens.

Drop a finding when:

- it is in the `accepted` list of the settings
- a `flow-allow` comment directly above the line or block names the lens and gives a reason
- the problem is in code that the change did not touch
- a lint rule already reports the problem (do not run the linter to find out)
- you are not certain that the defect is real

When the code at the base already has the same problem in other files, the finding is good to fix. End its fix with "Good to fix: other files in the app do the same."

## 5. Merge

Two lenses can report the same problem. Keep one finding for one problem, and name each lens that found it.

## 6. Grade

Give each finding a severity: `critical`, `major`, `minor` or `nit`. Set it from the consequence and the likelihood that the finding states. A worse consequence, or a more likely one, gives a higher severity.

When the entry of a lens sets a `severity`, give each finding of that lens that severity, and do not grade it.

## 7. Reduce

- Write one finding for one problem. When the same problem is in more than one place, put the finding on the first place and name the other places in it.
- Keep at most `maxFindings`. Keep the findings with the highest severity first.

A review with no findings is a correct result.

## 8. Write the findings

Write the findings to `tmp/code-review.json` in this form:

```json
{
  "findings": [
    {
      "lens": ["review-access-control"],
      "severity": "major",
      "path": "app/controllers/invoices_controller.ts",
      "line": 42,
      "endLine": 42,
      "problem": "<the problem, in one sentence>",
      "impact": "<the consequence and who can cause it>",
      "fix": "<the change to make>"
    }
  ]
}
```

- `lens` lists each lens that found the problem.
- Put a finding about a block, such as a whole test or a whole method, on the first line of the block.
- Add a `suggestion` only when the fix is a small change inside the same lines. It holds the new lines.
- When there are no findings, write the file with an empty `findings` list.

Then print the findings as a list: the file and line, the severity, the problem, the impact and the fix. After the list, print each message from a lens that has no line, such as a missing harness.
