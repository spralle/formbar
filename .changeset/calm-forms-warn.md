---
"@formbar/core": patch
"@formbar/react": patch
---

Warn outside production when form creation receives unknown option keys, including targeted guidance for migrating
the removed `arbiterRules` option. Keep React-only options out of core diagnostics.
