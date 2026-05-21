---
"@formbar/core": minor
"@formbar/from-schema": minor
"@formbar/react": minor
---

Initial 0.1.0 release of the @formbar form engine.

@formbar/core:
- Headless form state management with reactive field API
- Validation pipeline with async support and Standard Schema v1 compatibility
- Transform system (ingress/egress) for data normalization
- Middleware hooks for submit lifecycle
- Optional arbiter integration for declarative UI governance
- Path system supporting dot-notation and JSON Pointer
- Transaction system for batched updates

@formbar/from-schema:
- JSON Schema ingestion with conditional-required resolution
- Zod v3 and v4 schema extraction (via @scheman/core)
- Layout compiler with pluggable node registry
- Layout middleware pipeline for extensible field arrangement
- UI schema validation utilities

@formbar/react:
- useForm hook with reactive re-rendering
- useField hook with scoped field state
- useSchemaForm for schema-driven forms
- Renderer registry with layout tree rendering
- Full a11y utilities (labels, descriptions, errors, focus management)
- Field state resolution from arbiter rules
