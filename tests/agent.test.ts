import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentPlan, determineNextAction, FOXIT_MCP_TOOLCHAIN, validateStructuredContract } from '../lib/agent.ts';
import { validateLiveMcpEvidence, type McpEvidence } from '../lib/mcp-evidence.ts';
import { validateContract, type ContractData } from '../lib/contract.ts';

const contract: ContractData = { partyA:'A', partyB:'B', amount:1200, paymentScheduleAmount:1200, effectiveDate:'2026-09-01', dueDate:'2026-09-30', obligations:['10 images'], copyrightTransferCondition:'Only after the full contract amount has been paid', requiredClauses:['scope','payment','delivery','copyright'], extraClauses:[] };
const hash = 'a'.repeat(64);
const evidence: McpEvidence = { evidenceType:'LIVE_MCP', server:{implementation:'foxitsoftware/foxit-pdf-api-mcp-server',version:'0.2.3'},tool:'pdf_from_text',success:true,taskId:'task',inputSha256:hash,outputSha256:hash,occurredAt:new Date().toISOString(),nextAction:'REQUEST_HUMAN_APPROVAL' };
test('deterministic agent selects official text-to-PDF tool',()=>assert.equal(createAgentPlan(contract,FOXIT_MCP_TOOLCHAIN,validateContract(contract)).selectedTool,'pdf_from_text'));
test('missing required contract data blocks agent',()=>assert.throws(()=>validateStructuredContract({...contract,partyA:''}),/AGENT_CONTRACT_SCHEMA_INVALID/));
test('nonexistent MCP tool selection is blocked',()=>assert.throws(()=>createAgentPlan(contract,['upload_document','download_document']),/MCP_TOOL_UNAVAILABLE:pdf_from_text/));
test('MCP failure blocks next action',()=>assert.equal(determineNextAction(validateContract(contract),false,true),'BLOCK'));
test('mock response cannot be marked as live MCP evidence',()=>assert.throws(()=>validateLiveMcpEvidence({...evidence,evidenceType:'MOCK' as 'LIVE_MCP'},hash),/MOCK_CANNOT_BE_LIVE_EVIDENCE/));
test('MCP output PDF hash mismatch blocks evidence',()=>assert.throws(()=>validateLiveMcpEvidence(evidence,'b'.repeat(64)),/MCP_OUTPUT_HASH_MISMATCH/));
test('agent cannot override failed deterministic checks',()=>assert.equal(determineNextAction(validateContract({...contract,paymentScheduleAmount:1000}),true,true),'BLOCK'));
