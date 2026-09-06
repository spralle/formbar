# @formbar/from-schema

Schema ingestion utilities for turning JSON Schema, Zod, and Standard Schema definitions into Formbar field metadata, validators, defaults, and layout trees.

## Install

```bash
bun add @formbar/from-schema @formbar/core
# or
npm install @formbar/from-schema @formbar/core
```

Install Zod only if you ingest Zod schemas:

```bash
bun add zod
# or
npm install zod
```

## Minimal usage

```ts
import { createForm } from "@formbar/core";
import { createSchemaForm } from "@formbar/from-schema";

const schema = {
	type: "object",
	properties: {
		name: { type: "string" },
		email: { type: "string", format: "email" },
	},
	required: ["name", "email"],
} as const;

const prepared = createSchemaForm(schema);
const form = createForm({
	initialData: prepared.defaults,
	validators: prepared.validators,
});

console.log(prepared.fields.map((field) => field.path));
console.log(prepared.layout.type);
form.dispose();
```

## When to use this package

- Use `@formbar/from-schema` when you need schema extraction, schema-backed validators, default values, or compiled layout nodes without React.
- Use `@formbar/core` alone when fields and validation are defined directly in application code.
- Use `@formbar/react-schema` when you want this schema preparation combined with React hooks and renderers.

## Dependencies

- Depends on `@formbar/core` and `@scheman/core`.
- Peer dependency: `zod >=3.24.0 <4 || >=4.0.0 <5`, marked optional. It is required only for Zod schema ingestion.
