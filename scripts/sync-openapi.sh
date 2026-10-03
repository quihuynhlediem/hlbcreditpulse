#!/usr/bin/env bash
# Re-sync the contract from the pipeline build pack, then regenerate the typed client.
set -euo pipefail
cp "$HOME/repos/prdcontext/outputs/hlb/05-deliver/build-pack/openapi.yaml" "$(dirname "$0")/../openapi/openapi.yaml"
npm run api:generate
