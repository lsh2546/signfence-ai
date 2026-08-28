# SignFence AI

SignFence AI is a human-gated document agent built for the Foxit track of the DevNetwork API + Cloud + AI Hackathon 2026. It structures synthetic contract instructions, applies seven deterministic checks, binds human approval to a document SHA-256, and blocks signing whenever the document changes.

> TEST MODE: every included scenario uses synthetic data and has no legal effect.

## Three clearly separated modes

- **INTERACTIVE PUBLIC DEMO** — visitors can structure natural language, run seven checks, correct the mismatch, approve a document hash, and revoke approval by changing the document.
- **VERIFIED LIVE FOXIT RUN** — sanitized evidence from real Foxit PDF Services processing and a completed Foxit eSign test run.
- **VERIFIED LIVE FOXIT MCP RUN** — read-only sanitized evidence from an actual `upload_document` → `pdf_from_text` → `download_document` toolchain on the official MCP server v0.2.3.
- **VERIFIED LIVE FOXIT eSIGN RUN** — read-only sanitized evidence from the previously completed human-signing TEST MODE run.
- **OPERATOR-ONLY LIVE APIs** — disabled in public builds. Protected to prevent unauthorized credits and email sends.

## Run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL. The public interaction does not require Foxit credentials.

```bash
npm test
npm run lint
npm run build
```

## Architecture

```text
Natural-language input
  -> deterministic structureContract()
  -> structured ContractData JSON
  -> seven deterministic validateContract() checks
  -> browser-generated safe demo document + SHA-256
  -> explicit human approval
  -> single signatureGate()

Operator-only path
  -> Foxit PDF Services: source text to processed PDF
  -> server SHA-256 verification
  -> Foxit eSign: human signature request and completion
  -> sanitized status, activity summary, and final PDF hash
```

## Seven checks

1. Parties
2. Contract and payment-schedule amounts
3. Effective and due dates
4. Obligations
5. Required clauses, including **Copyright transfers only after the full contract amount has been paid**
6. Unapproved additional clauses
7. Post-approval document change

The copyright condition remains part of check 5; it is not an eighth check.

The Korean synthetic demo prompt preserves the condition `계약 대금 전액 지급 후`, rendered in English as “only after the full contract amount has been paid.”

## Single signature gate

```ts
allSevenChecksPassed &&
humanApprovalRecorded &&
approvedPdfHash === currentPdfHash
```

The eSign server independently hashes the submitted PDF bytes. The computed hash must equal both the current and approved hashes.

## Deterministic agent and official Foxit MCP

The agent is an explainable state machine, not an LLM. It structures the Korean prompt, validates the contract schema, selects `pdf_from_text` from the tools advertised by Foxit's official open-source MCP server, and proposes only `BLOCK` or `REQUEST_HUMAN_APPROVAL`. The MCP workflow is `upload_document` → `pdf_from_text` → `download_document`. A result may be labeled `LIVE_MCP` only after the downloaded `%PDF` bytes match the recorded SHA-256. eSign remains a direct Foxit API outside MCP and can only be reached through the unchanged deterministic signature gate.

**Explainable deterministic agent. No LLM used.** Signing permission is never delegated to the agent. eSign is called directly only after deterministic checks and human approval.

## Foxit roles and verified results

- **Foxit PDF Services** creates or processes the synthetic contract PDF.
- **Foxit eSign** sends the document for a real human signature and exposes completion status.

Sanitized verification completed in Foxit developer TEST MODE:

- Initial mismatch PDF: `COMPLETED`, `%PDF` verified, 6/7 checks.
- Corrected PDF: `COMPLETED`, `%PDF` verified, 7/7 checks.
- The two SHA-256 values differed as expected.
- A separate eSign test run reached `EXECUTED`; its final PDF SHA-256 was recorded.

No email, Folder ID, security link, IP address, credential, completed PDF body, or raw activity history belongs in the public repository.

## Security design

- No `NEXT_PUBLIC_*` Foxit secrets.
- Paid APIs require server-side operator mode and local origin checks.
- eSign additionally requires a separately enabled server flag.
- Status lookup accepts only a server-issued run ID bound to that run's Folder ID.
- Completed PDF bytes are never returned by the public status response.
- Duplicate eSign binding is rejected.
- Public mode provides safe interaction without paid API calls.
- Session audit events are labeled accurately and are not represented as tamper-proof server logs.

Copy `.env.example` only for private operator testing. Keep all live values outside source control.

## License

MIT — see [LICENSE](./LICENSE).
