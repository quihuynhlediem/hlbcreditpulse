#!/usr/bin/env bash
# Re-sync the product contract from the pipeline build pack (never edited here), merge the demo overlay, regenerate types.
set -euo pipefail
cp "$HOME/repos/prdcontext/outputs/hlb/05-deliver/build-pack/openapi.yaml" "$(dirname "$0")/../openapi/openapi.yaml"
npm run api:generate
