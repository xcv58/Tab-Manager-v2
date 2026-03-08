See [`AGENTS.md`](./AGENTS.md) for the repository agent policy. Keep
`AGENTS.md` as the single source of truth.

Additional repo-specific instructions for models:

- When coding, do not run tests automatically.
- After implementing a change, run `pnpm build` by default and stop there.
- Let a human verify the change first before running any tests.
- Only run `pnpm test`, unit tests, integration tests, or Linux screenshot /
  snapshot updates when a human explicitly asks for them or approves them.
- For snapshot-sensitive UI work, treat Linux screenshot refreshes as
  follow-up work that happens only after human approval.
