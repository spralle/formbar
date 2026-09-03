# npm trusted publishing setup

Formbar publishes packages from `.github/workflows/publish.yml` with GitHub Actions OIDC and npm provenance.
Do not create or configure an `NPM_TOKEN` secret for this workflow.

In npm, add a trusted publisher for each public package:

- `@formbar/core`
- `@formbar/from-schema`
- `@formbar/react`
- `@formbar/react-schema`
- `@formbar/arbiter`

Use these settings for each package:

- Provider: GitHub Actions
- Repository owner/name: `surikaterna/formbar`
- Workflow filename: `publish.yml`
- Environment: leave blank unless a GitHub environment is added later

The workflow grants `id-token: write` and sets `NPM_CONFIG_PROVENANCE=true` for `bunx changeset publish`,
allowing npm to verify the GitHub Actions run without `NODE_AUTH_TOKEN` or `NPM_TOKEN`.
