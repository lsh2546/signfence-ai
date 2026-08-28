import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createAgentPlan, determineNextAction } from '../lib/agent.ts';
import { validateLiveMcpEvidence } from '../lib/mcp-evidence.ts';
import { structureContract } from '../lib/structure.ts';
import { buildContractDocumentText } from '../lib/document.ts';
import { validateContract } from '../lib/contract.ts';

const prompt = '온라인 판매자와 외주 디자이너 간 상품 이미지 제작 계약을 작성해 주세요. 계약 본문의 총액은 1,200,000원이고 지급 일정표에는 1,020,000원으로 기재되어 있습니다. 결과물은 상품 이미지 10개, 수정은 최대 2회, 납기일은 2026년 9월 30일입니다. 결과물의 저작권은 계약금 전액을 지급한 후 판매자에게 이전됩니다.';
const root = process.cwd();
const serverPath = path.resolve(root, '..', 'foxit-pdf-api-mcp-server', 'typescript', 'foxit-pdf-api-mcp-server', 'dist', 'stdio-server.js');
const privateDir = path.resolve(root, 'private-evidence', 'mcp');
const pdfPath = path.join(privateDir, 'signfence-mcp-output.pdf');
const privateCheckpointPath = path.join(privateDir, 'live-mcp-checkpoint.json');
const publicEvidencePath = path.resolve(root, 'outputs', 'signfence-ai', 'foxit-mcp-live-sanitized.json');
const credentialsPresent = Boolean(process.env.FOXIT_CLOUD_API_CLIENT_ID && process.env.FOXIT_CLOUD_API_CLIENT_SECRET && process.env.FOXIT_CLOUD_API_HOST);
if (!credentialsPresent) throw new Error('FOXIT_CREDENTIALS_UNAVAILABLE');

const client = new Client({ name: 'signfence-deterministic-agent', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [serverPath], env: { ...process.env, FOXIT_CLOUD_API_HOST: 'https://na1.fusion.foxit.com/pdf-services' } });
const textFrom = (result: Awaited<ReturnType<Client['callTool']>>) => {
  const block = result.content.find((item) => item.type === 'text');
  if (!block || block.type !== 'text') throw new Error('MCP_TEXT_RESULT_MISSING');
  return JSON.parse(block.text) as Record<string, unknown>;
};

await mkdir(privateDir, { recursive: true });
await client.connect(transport);
try {
  const tools = await client.listTools();
  const contract = structureContract(prompt);
  const available = tools.tools.map((tool) => tool.name);
  const initialChecks = validateContract(contract);
  const plan = createAgentPlan(contract, available, initialChecks);
  const documentText = buildContractDocumentText(contract);
  const inputSha256 = createHash('sha256').update(documentText).digest('hex');
  const upload = textFrom(await client.callTool({ name: 'upload_document', arguments: { fileContent: Buffer.from(documentText).toString('base64'), fileName: 'signfence-synthetic-contract.txt' } }));
  if (!upload.success || typeof upload.documentId !== 'string') throw new Error(`MCP_UPLOAD_FAILED:${String(upload.error ?? 'UNKNOWN')}`);
  const converted = textFrom(await client.callTool({ name: plan.selectedTool, arguments: { documentId: upload.documentId } }));
  if (!converted.success || typeof converted.resultDocumentId !== 'string' || typeof converted.taskId !== 'string') throw new Error(`MCP_CONVERSION_FAILED:${String(converted.error ?? 'UNKNOWN')}`);
  await writeFile(privateCheckpointPath, JSON.stringify({ taskId: converted.taskId, resultDocumentId: converted.resultDocumentId, inputSha256, convertedAt: new Date().toISOString() }));
  const downloaded = textFrom(await client.callTool({ name: 'download_document', arguments: { documentId: converted.resultDocumentId, outputPath: pdfPath, filename: path.basename(pdfPath) } }));
  if (!downloaded.success) throw new Error(`MCP_DOWNLOAD_FAILED:${String(downloaded.error ?? 'UNKNOWN')}`);
  const pdf = await readFile(pdfPath);
  if (pdf.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error('MCP_RESULT_NOT_PDF');
  const outputSha256 = createHash('sha256').update(pdf).digest('hex');
  const nextAction = determineNextAction(initialChecks, true, true);
  const evidence = validateLiveMcpEvidence({ evidenceType: 'LIVE_MCP', server: { implementation: 'foxitsoftware/foxit-pdf-api-mcp-server', version: '0.2.3' }, tool: 'pdf_from_text', success: true, taskId: converted.taskId, inputSha256, outputSha256, occurredAt: new Date().toISOString(), nextAction }, outputSha256);
  await mkdir(path.dirname(publicEvidencePath), { recursive: true });
  await writeFile(publicEvidencePath, JSON.stringify({ ...evidence, taskId: createHash('sha256').update(evidence.taskId).digest('hex').slice(0, 16), pdfBytes: pdf.length, checks: initialChecks.map(({ id, passed }) => ({ id, passed })) }, null, 2));
  process.stdout.write(JSON.stringify({ success: true, tool: plan.selectedTool, taskId: 'REDACTED_IN_CONSOLE', inputSha256, outputSha256, pdfBytes: pdf.length, nextAction }, null, 2));
} finally {
  await client.close();
}
