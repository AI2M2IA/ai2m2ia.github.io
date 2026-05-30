# Contributing

## Branch Flow

This repository uses a staged release flow:

```text
feature/** -> develop -> main -> tag
```

- `feature/**`: isolated work branches. Every feature branch opens a pull
  request into `develop`.
- `develop`: integration branch. It collects reviewed features and must stay
  deployable enough for preview and validation.
- `main`: production branch. Changes reach `main` only through a pull request
  from `develop`.
- Tags: public releases are cut from `main` with version tags such as
  `v1.0.0`.

## Pull Requests

Feature pull requests target `develop`.

Release pull requests target `main` and should use `develop` as the source
branch.

Before requesting review, run:

```bash
npm run test:ci
```

For production checks after a release, run:

```bash
npm run test:prod
```

## Required Gates

Pull requests should not be merged unless the GitHub Actions CI passes. The CI
gate runs the API contract validation, Node tests with coverage thresholds, and
the Playwright E2E suite.

Coverage thresholds are:

- Lines: 80%
- Branches: 80%
- Functions: 80%

## Recommended GitHub Branch Protection

Configure these protections in GitHub repository settings:

- Require pull requests before merging into `develop`.
- Require pull requests before merging into `main`.
- Require the CI status check before merging.
- Block direct pushes to `main`.
- Prefer deleting feature branches after merge.
- Create version tags only from `main`.
