export const verifiedFoxitMcpEvidence = Object.freeze({
  label: 'VERIFIED LIVE FOXIT MCP RUN',
  server: 'foxitsoftware/foxit-pdf-api-mcp-server',
  version: '0.2.3',
  toolchain: ['upload_document', 'pdf_from_text', 'download_document'] as const,
  pdfBytes: 4153,
  sha256Short: '6a033f988f44…4b274',
  checksPassed: 6,
  checksTotal: 7,
  failedCheck: 'Amount consistency',
  nextAction: 'BLOCK' as const,
  dataClassification: 'Synthetic test data only',
});

export const verifiedFoxitEsignEvidence = Object.freeze({
  label: 'VERIFIED LIVE FOXIT eSIGN RUN',
  status: 'EXECUTED',
  environment: 'TEST MODE',
  sha256Short: '3dd81db525c…cf9e9',
});
