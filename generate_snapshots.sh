#!/bin/bash
# Helper script to generate linux snapshots via Docker
# Reuses existing test scripts from package.json with CI=true to enforce single worker/xvfb.

echo "Starting Docker container..."
docker run --rm --ipc=host \
  -v "$(pwd):/work" \
  -v /work/node_modules \
  -v /work/packages/extension/node_modules \
  -v /work/packages/integration_test/node_modules \
  -w /work \
  -e CI=true \
  -e DEBUG=pw:browser* \
  mcr.microsoft.com/playwright:v1.58.0-jammy \
  /bin/bash -c "
    echo 'Installing pnpm...'
    npm install -g pnpm@9.15.9
    echo 'Installing dependencies...'
    pnpm install --frozen-lockfile=false
    echo 'Running update-snapshots...'
    # Directly reuse the test script from packages/integration_test/package.json
    # CI=true ensures it runs with xvfb-run
    pnpm --filter integration-test run test -- --update-snapshots
    echo 'Finished.'
  "
