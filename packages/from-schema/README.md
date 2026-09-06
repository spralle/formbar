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

## Enum option labels

Keep JSON Schema `enum` values as the canonical values you want to store and validate. Put display labels in Formbar metadata via `enumOptions`; do not put label/value objects directly inside JSON Schema `enum` for presentation.

```ts
import { createSchemaForm, normalizeEnumOptions } from "@formbar/from-schema";

const schema = {
	type: "object",
	properties: {
		scope: {
			type: "string",
			enum: ["any", "documents"],
			"x-formbar": {
				enumOptions: [
					{ value: "any", label: "Any" },
					{ value: "documents", label: "Documents", description: "Document fields only" },
				],
			},
		},
	},
} as const;

const prepared = createSchemaForm(schema);
const scopeField = prepared.fields.find((field) => field.path === "scope");
const options = normalizeEnumOptions(scopeField?.metadata);
// options display labels, but selected values remain "any" or "documents".
```

With Zod, use `.meta({ formbar: { enumOptions: [...] } })`:

```ts
import { z } from "zod";

const zodSchema = z.object({
	scope: z.enum(["any", "documents"]).meta({
		formbar: {
			enumOptions: [
				{ value: "any", label: "Any" },
				{ value: "documents", label: "Documents", disabled: false },
			],
		},
	}),
});
```

If `enumOptions` is absent or only covers some values, `normalizeEnumOptions(metadata)` returns one option for each primitive `metadata.enum` value and falls back to `String(value)` labels.

## Dependencies

- Depends on `@formbar/core` and `@scheman/core`.
- Peer dependency: `zod >=3.24.0 <4 || >=4.0.0 <5`, marked optional. It is required only for Zod schema ingestion.
