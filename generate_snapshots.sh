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
  -e TURBO_TEAM="$TURBO_TEAM" \
  -e TURBO_TOKEN="$TURBO_TOKEN" \
  -e DEBUG=pw:browser* \
  mcr.microsoft.com/playwright:v1.58.0-noble \
  /bin/bash -c "
    echo 'Installing xvfb...'
    apt-get update && apt-get install -y xvfb
    echo 'Installing pnpm...'
    npm install -g pnpm@9.15.9
    echo 'Installing dependencies...'
    pnpm install --frozen-lockfile=false
    echo 'Running update-snapshots...'
    # Directly reuse the test script from packages/integration_test/package.json
    # CI=true ensures it runs with xvfb-run
    xvfb-run --auto-servernum --server-args='-screen 0 1280x960x24' pnpm --filter integration-test run test --update-snapshots
    echo 'Finished.'
  "
