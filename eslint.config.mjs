/**
 * Rules cast into flat-config form — 2026-09-03T00:00:00Z
 */

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import globals from 'globals';

const baseConfig = defineConfig([
  // ESLint recommended config
  {
    name: 'js/config',
    ...js.configs.recommended,
  },
  // stylistic plugin — this is the formatter, there is no Prettier/Biome here
  plugins.stylistic,
  // import x plugin
  plugins.importX,
  // airbnb base recommended config
  ...configs.base.recommended,
  // strict import rules
  rules.base.importsStrict,
]);

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      'sndwrks-osc.maxpat',
      '*.amxd',
      'dist/**',
      'build/**',
    ],
  },
  // JavaScript config
  ...baseConfig,
  // custom project rules — carried at minimum, per the sndwrks house style
  {
    files: ['**/*.{js,mjs}'],
    rules: {
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/indent': ['error', 2],
      '@stylistic/semi': ['error', 'always'],
      // airbnb-extended's variant of this rule treats function declarations the same
      // as variables (functions: true), so two functions that legitimately call each
      // other (sndwrksTcp.js's connect()/scheduleReconnect(), each invoked from
      // inside the other's async callback) can never both satisfy it — one direction
      // is always "used before defined" no matter which is written first. Function
      // declarations are safely hoisted by the language itself, so exempting them
      // (functions: false, the classic airbnb-base default) keeps the rule doing its
      // real job: catching a var/let actually read before assignment.
      'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
    },
  },
  // node-hosted CommonJS files. `.mjs` (this file) stays ESM and is untouched.
  //
  // Node for Max requires CommonJS (see package.json's "//type" note), so
  // sourceType is 'commonjs' rather than the airbnb base default of 'module' — that
  // is what gives require()/module.exports/exports their globals without treating
  // this as an ES module.
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // max-api is provided by the Node for Max runtime at load time, not through
      // npm — it will never be resolvable from node_modules, and dependencies stay
      // deliberately empty (see the comment at the top of sndwrksTcp.js)
      'import-x/no-unresolved': 'off',
      // airbnb's ForOfStatement ban exists for browser code that would otherwise
      // need regenerator-runtime under Babel. This project targets Node >=20 only —
      // for..of needs no transpilation there, and it is the clearest way to walk
      // the argument list in sndwrksTcp.js.
      // ForInStatement/LabeledStatement/WithStatement stay banned.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'for..in walks the prototype chain — use Object.keys/values/entries instead.',
        },
        {
          selector: 'LabeledStatement',
          message: 'labels are a form of goto and make control flow hard to follow.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode.',
        },
      ],
    },
  },
  // sndwrksTcp.js only — toOSCArgs() short-circuits its numeric branch with a single
  // `continue` inside a for..of loop; rewriting that into if/else nesting is a
  // structural change this slice is not making
  {
    files: ['sndwrksTcp.js'],
    rules: {
      'no-continue': 'off',
    },
  },
  // test runner files — plain node scripts whose entire output IS console.log, and
  // whose harnesses use a few conventions airbnb's app-code rules do not anticipate
  {
    files: ['*.test.js'],
    rules: {
      'no-console': 'off',
      // mapping.test.js's vm harness marks its own bookkeeping fields with a
      // leading underscore (_calls, _posts, _tasks, _notified) to set them apart
      // from the Max-global properties the same object also carries — not an
      // attempt at privacy, so airbnb's convention for that doesn't apply here
      'no-underscore-dangle': 'off',
      // the unicode-safety test asserts a string is pure ASCII with
      // /^[\x00-\x7f]*$/ — that range has to include the control-character block by
      // definition, which is exactly what is being tested for
      'no-control-regex': 'off',
      // seed(m, maps, host) exists to mutate the harness object it is handed —
      // that is the entire point of a test fixture helper, not an accidental
      // side effect airbnb's rule is meant to catch
      'no-param-reassign': 'off',
    },
  },
  // override block for the Max-hosted files — sndwrksMap.js, sndwrksGrid.js,
  // sndwrksLogo.js. These run inside Max ([js] / [v8ui]), not Node, so none of the
  // Node-CommonJS assumptions above apply to them.
  {
    files: ['sndwrksMap.js', 'sndwrksGrid.js', 'sndwrksLogo.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        outlet: 'readonly',
        post: 'readonly',
        error: 'readonly',
        Task: 'readonly',
        messagename: 'readonly',
        jsarguments: 'readonly',
        setoutletassist: 'readonly',
        setinletassist: 'readonly',
        notifyclients: 'readonly',
        autowatch: 'writable',
        inlets: 'writable',
        outlets: 'writable',
        mgraphics: 'readonly',
        sketch: 'readonly',
        max: 'readonly',
        patcher: 'readonly',
        this: 'readonly',
        // v8ui's own containing-box handle, and Max's helper for normalising a
        // message's arguments into a plain array — both real globals inside
        // Max's [js]/[v8ui] host, not listed in the slice doc's minimum set
        box: 'readonly',
        arrayfromargs: 'readonly',
      },
    },
    rules: {
      // Max calls every top-level function declaration as a message handler by
      // name; ESLint cannot see that, and would otherwise flag every one of them
      // as unused
      'no-unused-vars': 'off',
      // arrayfromargs(arguments) is the documented Max idiom for turning a
      // message's atoms into an array, and is what Cycling '74's own bundled
      // jsui/v8ui code uses. rest parameters may well work on [v8], but this
      // cannot be tested outside Max, and swapping a proven host idiom for an
      // untested one to satisfy a linter is the wrong trade
      'prefer-rest-params': 'off',
      // the paint loops skip dead cells with a continue; the alternative is
      // nesting the whole cell-drawing body in an else, which reads worse
      'no-continue': 'off',
    },
  },
  // sndwrksMap.js only — Max's [js] object is an ES5-only engine, and this slice's
  // mandate for this specific file is narrow: rename locals, fix the one named
  // hoisting violation, add the header tagline — nothing else. The rules below are
  // split into two groups.
  {
    files: ['sndwrksMap.js'],
    rules: {
      // group 1 — genuinely ES5-only. [js] cannot parse any of let/const, rest
      // params, arrow functions or template literals. no-var/prefer-const are
      // doubly justified: mapping.test.js also reaches top-level var declarations
      // as vm-context properties, which let/const do not become.
      'no-var': 'off',
      'prefer-const': 'off',
      'prefer-rest-params': 'off',
      'prefer-arrow-callback': 'off',
      'prefer-template': 'off',

      // group 2 — not ES5-specific, but pre-existing structure/formatting this
      // slice is not cleared to rewrite (only renames, the one hoisting fix, and
      // the header are in scope here; slice 03 owns this file's structure next
      // wave). Every one of these fires on code that was already in the file
      // before this slice touched it.
      //
      // vars-on-top would force every var to the top of its function, which is the
      // opposite of this repo's own "no hoisting: define before use" rule — the
      // file already declares each var at its first point of use.
      'vars-on-top': 'off',
      // guarded for..in over maps[] (with an explicit hasOwnProperty check on every
      // loop) is how the whole persistence/grid code walks note-keyed objects.
      'no-restricted-syntax': 'off',
      'no-prototype-builtins': 'off',
      'no-continue': 'off',
      // every counter and index in this file is incremented with i++, including
      // every for-loop afterthought — airbnb bans that unconditionally (even
      // there), and swapping to i += 1 throughout is a body edit, not a rename
      'no-plusplus': 'off',
      // selectnote() was used before it was defined (list() calls it) and so was
      // countAll() (setvalueof() calls it) — real forward references, but neither
      // is "the hoisting issue" this slice was told to fix (that was specifically
      // `new Task(init, this)` before `function init`, already moved above). The
      // project-wide no-use-before-define override (functions: false) already
      // covers both, since function declarations are safely hoisted.
      //
      // isNaN(n) reads a parseInt() result, so Number.isNaN would behave
      // identically here — but swapping it is a body edit, not a rename.
      'no-restricted-globals': 'off',
      // selectnote(n) reassigns its own parameter after parseInt-ing it. Avoiding
      // that needs a new local variable, which is a step past "rename existing
      // locals."
      'no-param-reassign': 'off',
      // the file's dense one-line guards (`if (x) { y; } else { z; }`), long
      // string-building lines, and hand-aligned trailing comments are pre-existing
      // formatting choices, not something to reflow as a side effect of renaming.
      '@stylistic/brace-style': 'off',
      '@stylistic/max-statements-per-line': 'off',
      '@stylistic/max-len': 'off',
      '@stylistic/no-multi-spaces': 'off',
      '@stylistic/function-paren-newline': 'off',
      '@stylistic/function-call-argument-newline': 'off',
    },
  },
]);
