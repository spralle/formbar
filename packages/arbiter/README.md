# @formbar/arbiter

Formbar plugin bridge for Arbitre production rules. It syncs form data and `$ui` state into an Arbitre session, fires rules during Formbar evaluation, and applies resulting writes back to form state.

## Install

```bash
bun add @formbar/arbiter @formbar/core @arbitre/core kuery
# or
npm install @formbar/arbiter @formbar/core @arbitre/core kuery
```

## Minimal usage

```ts
import { createArbiterPlugin } from "@formbar/arbiter";
import { createForm } from "@formbar/core";

const form = createForm({
	initialData: { qty: 0 },
	plugins: [
		createArbiterPlugin({
			rules: [
				{
					name: "showDiscount",
					when: { qty: { $gte: 10 } },
					then: [{ $set: { "$ui.showDiscount": true } }],
				},
			],
		}),
	],
});

form.setValue("qty", 12);
console.log(form.getState().uiState); // { showDiscount: true }
form.dispose();
```

Pass rules through `createArbiterPlugin` in the `plugins` option. The former top-level `arbiterRules` form option is
not supported; non-production core builds warn with this migration path when they encounter it.

## When to use this package

- Use `@formbar/arbiter` when visibility, requiredness, computed values, or other form behavior should be governed by Arbitre production rules.
- Use `@formbar/core` plugins or middleware directly for simple imperative form behavior.
- Combine with `@formbar/react-schema` when schema-driven React layouts should react to rule-produced `$ui` state.

## Dependencies

- Depends on `@formbar/core`.
- Peer dependencies: `@arbitre/core >=0.1.0` and `kuery >=2.0.0`.
