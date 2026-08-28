import type { ContractData, CheckResult } from './contract';

export const FOXIT_MCP_TOOLCHAIN = ['upload_document', 'pdf_from_text', 'download_document'] as const;
export type AgentNextAction = 'BLOCK' | 'REQUEST_HUMAN_APPROVAL';

export type AgentPlan = {
  implementation: 'deterministic-state-machine';
  selectedTool: 'pdf_from_text';
  prerequisiteTools: readonly ['upload_document'];
  completionTools: readonly ['download_document'];
  selectionReason: string;
  nextAction: AgentNextAction;
};

export function validateStructuredContract(value: ContractData) {
  if (!value.partyA.trim() || !value.partyB.trim() || value.amount <= 0 || value.paymentScheduleAmount <= 0 ||
      !value.effectiveDate || !value.dueDate || value.obligations.length === 0 || !value.copyrightTransferCondition.trim()) {
    throw new Error('AGENT_CONTRACT_SCHEMA_INVALID');
  }
  return value;
}

export function createAgentPlan(contract: ContractData, availableTools: readonly string[], checks?: CheckResult[]): AgentPlan {
  validateStructuredContract(contract);
  for (const tool of FOXIT_MCP_TOOLCHAIN) {
    if (!availableTools.includes(tool)) throw new Error(`MCP_TOOL_UNAVAILABLE:${tool}`);
  }
  return {
    implementation: 'deterministic-state-machine',
    selectedTool: 'pdf_from_text',
    prerequisiteTools: ['upload_document'],
    completionTools: ['download_document'],
    selectionReason: 'The structured contract is canonical plain text, so the reversible Foxit text-to-PDF tool is the narrowest matching operation.',
    nextAction: checks?.length === 7 && checks.every((check) => check.passed) ? 'REQUEST_HUMAN_APPROVAL' : 'BLOCK',
  };
}

export function determineNextAction(checks: CheckResult[], mcpSucceeded: boolean, hashesMatch: boolean): AgentNextAction {
  return mcpSucceeded && hashesMatch && checks.length === 7 && checks.every((check) => check.passed)
    ? 'REQUEST_HUMAN_APPROVAL'
    : 'BLOCK';
}
