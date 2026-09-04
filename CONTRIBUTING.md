# Contributing

We welcome all contributions! Thank you for taking the time to contribute to this project.

## Commit Naming

Please name your commits something that will be useful in future years. Also, it's helpful if you make changes in disparate places to make separate commits. For example, mapping-editor changes to add a new argument type, and `build-patch.py` changes to add the UI for it.

## Branch Naming Convention

`main` is protected. All changes go through pull requests, from a branch named:

```
main.<new-branch>
```

An optional sub-branch is fine too: `main.<feature>.<sub-branch>`.

**Examples:**
- `main.fix-typo`
- `main.add-feature`
- `main.update-docs`
- `main.bug-123`

## Editing the Device

`sndwrks-osc.maxpat` and `sndwrks-osc.amxd` are **generated output**. Edit `build-patch.py` and regenerate — a PR that hand-edits the `.maxpat` JSON will be asked to move the change into the script.

```bash
python3 build-patch.py
```

The script asserts what is easy to break by hand: dangling cords, duplicate parameter names, fractional rects, Live's fixed 169px height ceiling, and the pattr metadata that persistence depends on.

## Three JavaScript Runtimes

Each script runs in a different Max object, with a different engine. This catches people out, so check which file you are in before you reach for a language feature:

| File | Object | Engine |
|---|---|---|
| `sndwrksMap.js` | `[js]` | **ES5 only.** Top-level `var` — `let`/`const` at top level break the test harness too. |
| `sndwrksGrid.js`, `sndwrksLogo.js` | `[v8ui]` | V8, so ES6+ is fine. |
| `sndwrksTcp.js` | `[node.script]` | Node bundled inside Max. CommonJS. |

Two hard constraints worth knowing before you open a PR:

- **Runtime dependencies stay at zero.** `dependencies` is `{}` and needs to remain so — native modules are the documented way to break a frozen `.amxd`. Dev tooling in `devDependencies` is fine.
- **All six files ship together.** The device is not frozen; it resolves the four scripts through Max's search path at load time.

See [NOTES.md](NOTES.md) for the longer list of Max and Live behaviours that fail silently.

## Pull Request Process

1. Ensure your code follows the project's style and conventions — `npm run lint` is the formatter here, there is no Prettier
2. Update documentation as needed
3. Make sure all tests pass — `npm test`
4. Submit your pull request with a clear description of the changes
5. Please provide a simple list to validate the changes that you've made

Every PR to `main` runs lint, all three test suites and `build-patch.py`. The installer's suite needs a macOS runner; off macOS it reports a skip.

## Questions?

If you have any questions or need help, feel free to open an issue or reach out to the maintainers.

Thank you for contributing!
