# HLB CreditPulse — demo (mock mode)

Embedded-credit demo for the HLB Business Challenge 2026. Three partner apps (Viettel Money + Shopee, Grab, Sổ Bán Hàng) call the CreditPulse engine; HLB is the lender. All data and decisions come from an in-browser mock (MSW) that implements the OpenAPI contract in `openapi/openapi.yaml`. Partner screens are for demonstration purposes; figures are illustrative.

```
npm install
npm run dev        # http://localhost:3000 — start at the launcher
npm run build && npm start
npm run lint && npm run typecheck && npm test && npm run api:check
npx playwright test           # 93 tests named by acceptance-criterion ID
BASE_URL=https://… npx playwright test   # smoke against a deployment
```

Demo controls (top bar): persona, scenario, API inspector, reset. OTP is `123456`. `?scenario=error-<operationId>` forces an API error; `?scenario=empty` empties lists.
Switch to a real backend with `NEXT_PUBLIC_API_MODE=live` (not part of the demo).
