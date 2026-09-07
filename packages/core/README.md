# @formbar/core

Headless form state engine with validation, transforms, middleware, typed field APIs, and plugin support. It has no UI framework dependency.

## Install

```bash
bun add @formbar/core
# or
npm install @formbar/core
```

## Minimal usage

```ts
import { createForm } from "@formbar/core";

type Contact = {
	name: string;
	email: string;
};

const form = createForm<Contact, Record<string, never>>({
	initialData: { name: "", email: "" },
	onSubmit: async ({ payload }) => {
		await saveContact(payload);
		return { ok: true, submitId: "contact-create" };
	},
});

form.field("email").handleChange("ada@example.com");
await form.submit();
form.dispose();
```

## When to use this package

- Use `@formbar/core` when you need framework-agnostic form state, validation, submission, transforms, middleware, or plugin integration.
- Use `@formbar/react` instead when you want React hooks around a core form.
- Add `@formbar/from-schema` when your fields, validators, or layouts should be derived from JSON Schema, Zod, or Standard Schema.
- Add `@formbar/arbiter` when form state should be governed by Arbitre production rules.

## Dependencies

No peer dependencies. The package is framework-agnostic and marked side-effect free.

## Unknown options

Outside production, `createForm` warns once per call about unknown own enumerable option keys. Warnings list only
option names, never values. The removed `arbiterRules` option receives a migration warning directing callers to
`@formbar/arbiter`. Warnings are suppressed when `process.env.NODE_ENV` is unavailable or unusable.
