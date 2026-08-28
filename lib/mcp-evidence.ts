import type { AgentNextAction } from './agent';

export type McpEvidence = {
  evidenceType: 'LIVE_MCP';
  server: { implementation: 'foxitsoftware/foxit-pdf-api-mcp-server'; version: string };
  tool: 'pdf_from_text';
  success: true;
  taskId: string;
  inputSha256: string;
  outputSha256: string;
  occurredAt: string;
  nextAction: AgentNextAction;
};

const sha256 = /^[a-f0-9]{64}$/;
export function validateLiveMcpEvidence(value: McpEvidence, downloadedPdfSha256: string) {
  if (value.evidenceType !== 'LIVE_MCP') throw new Error('MOCK_CANNOT_BE_LIVE_EVIDENCE');
  if (value.server.implementation !== 'foxitsoftware/foxit-pdf-api-mcp-server' || !value.server.version) throw new Error('UNVERIFIED_MCP_SERVER');
  if (value.tool !== 'pdf_from_text' || !value.success || !value.taskId) throw new Error('MCP_RESULT_INVALID');
  if (!sha256.test(value.inputSha256) || !sha256.test(value.outputSha256)) throw new Error('MCP_HASH_INVALID');
  if (value.outputSha256 !== downloadedPdfSha256) throw new Error('MCP_OUTPUT_HASH_MISMATCH');
  if (Number.isNaN(Date.parse(value.occurredAt))) throw new Error('MCP_TIMESTAMP_INVALID');
  return value;
}
