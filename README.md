# HLB CreditPulse — demo (mock mode)

Embedded-credit demo for the HLB Business Challenge 2026. Every flow starts at an e-commerce checkout (Shopee), continues in the shopper's e-wallet (Viettel Money, Grab or Sổ Bán Hàng: the same point-of-purchase lending, different customer segments) and ends in CreditPulse; HLB is the lender. All data and decisions come from an in-browser mock (MSW) that implements the product contract in `openapi/openapi.yaml` (v1.2.0, 114 operations, synced from PRD 2.2) plus the demo-only overlay `openapi/demo-overlay.yaml`. The demo shows a subset of the complete product specified in the PRD (`build-pack/demo-scope.md`). Partner screens are for demonstration purposes; figures are illustrative.

```
npm install
npm run dev        # http://localhost:3000 — start at the launcher
npm run build && npm start
npm run lint && npm run typecheck && npm test && npm run api:check
npx playwright test           # 107 tests named by acceptance-criterion or requirement ID (demo-scaffolding tests: DEMO-…)
BASE_URL=https://… npx playwright test   # smoke against a deployment
```

Presenter bar (top): read-only persona (chosen by the entry point on the launcher), scenario, EN/VI switch (English by default; `?lang=vi` also works), page events (the marketplace seller rejects a return), test OTP `123456`, API inspector, reset. Everything below the bar is shown as the production product. `?scenario=error-<operationId>` forces an API error; `?scenario=empty` empties lists.

The AI engine decides every application (approve, counter-offer or decline) within 10 s. A customer can ask HLB to reassess a counter-offer or decline; reviewers answer in the console under **Reassessment queue** (overturns above 20,000,000 ₫ need a second approver).
Switch to a real backend with `NEXT_PUBLIC_API_MODE=live` (Stage 2; demo routes are removed from that build by `src/proxy.ts`). Console policy and weight changes go through maker-checker approval: submit, then approve as Checker.
