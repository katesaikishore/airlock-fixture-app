# airlock-fixture-app

A tiny dependency-free Node 22 web app with deliberately seeded bugs, used as the target for Airlock QA acceptance tests.
Read `SEEDED_BUGS.md` first. Not for production use; it has no persistence and a destructive demo button on purpose.

    npm run build && npm start            # seeded bugs active, port 3000
    FIXED=1 npm start                     # every seeded bug disabled

Validation note: this branch is the live target for the PR-triggered QA workflow.
Auto-trigger validation line 104936.
