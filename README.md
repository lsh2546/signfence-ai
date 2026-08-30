# SignFence AI

**SignFence automatically revokes human signing approval whenever the approved PDF changes.**

Contract approvals usually confirm a moment, not the exact file that is ultimately signed. SignFence closes that gap by binding a person's approval to the SHA-256 of the reviewed PDF and enforcing one deterministic signature gate.

> TEST MODE: the public scenario uses synthetic data and has no legal effect.

## Try the complete user flow

Open the [public demo](https://signfence-ai.ljs2546.chatgpt.site) and:

1. Enter Korean or English contract terms.
2. Structure the terms and generate a real, downloadable PDF.
3. See a payment mismatch block signing at 6/7 checks.
4. Correct the amount, regenerate the PDF, and pass 7/7.
5. Explicitly approve the current PDF SHA-256.
6. Change the approved document and watch approval become `APPROVAL REVOKED`.
7. Revalidate, reapprove, preview, and download the final PDF.

The public demo never spends Foxit credits or sends email.

## Foxit MCP and eSign

The verified Foxit MCP path used the official server's advertised tools:

```text
upload_document -> pdf_from_text -> download_document
```

Downloaded `%PDF` bytes were checked against their recorded SHA-256 before the run was labeled `LIVE_MCP`. Signing is intentionally outside MCP: the private operator path calls Foxit eSign directly only after seven deterministic checks, explicit human approval, and a hash match.

A real person completed the separate Foxit eSign developer TEST MODE run and its sanitized status reached `EXECUTED`. The app clearly labels this as preserved evidence from that completed run, not a new public execution.

```ts
allSevenChecksPassed &&
humanApprovalRecorded &&
approvedPdfHash === currentPdfHash
```

The server also hashes submitted PDF bytes independently; that value must equal both the current and approved hashes.

## Seven deterministic checks

Parties, payment amounts, dates, obligations, required clauses, unauthorized clauses, and post-approval document changes. The required copyright condition is: transfer only after the full contract amount has been paid.

## Run locally

```bash
npm install
npm run dev
```

Then verify the implementation:

```bash
npm test
npm run lint
npm run build
```

Copy `.env.example` only for private operator testing. The public build locks paid PDF, status, and eSign endpoints. Credentials, email addresses, Folder IDs, security links, IP addresses, completed PDFs, and raw activity histories are excluded from the repository.

## Implementation scope

- Deterministic bilingual structuring and validation; no LLM decides signing permission.
- Real client-generated PDF preview and download in the public demo.
- Sanitized, read-only evidence from completed Foxit MCP and human eSign TEST MODE runs.
- Operator-only live APIs remain disabled on the public deployment.

MIT — see [LICENSE](./LICENSE).
