## Summary

- describe the user-facing change in one or two bullets

## Testing

- list the commands or checks you ran

## Release Notes

- Keep the PR title in conventional commit form such as `fix: ...`,
  `feat(scope): ...`, `docs: ...`, or `chore(ci): ...`.
- GitHub squash merge uses the PR title as the default commit title, and
  `release-please` reads that title from git history.
- If this PR should affect extension release notes, prefer a releasable title
  such as `fix:` or `feat:`.
