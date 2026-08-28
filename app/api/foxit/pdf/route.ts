import { createHash } from 'node:crypto';
import { validateContract, type ContractData } from '../../../../lib/contract.ts';
import { requireOperator } from '../../../../lib/operator.ts';
import { createRun } from '../../../../lib/run-registry.ts';
import { buildContractDocumentText } from '../../../../lib/document.ts';

export const runtime = 'nodejs';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const getCredentials = () => {
  const host = process.env.FOXIT_CLOUD_API_HOST?.replace(/\/$/, '');
  const clientId = process.env.FOXIT_CLOUD_API_CLIENT_ID;
  const clientSecret = process.env.FOXIT_CLOUD_API_CLIENT_SECRET;
  if (!host || !clientId || !clientSecret) throw new Error('FOXIT_CREDENTIALS_UNAVAILABLE');
  return { host, headers: { client_id: clientId, client_secret: clientSecret } };
};

export async function POST(request: Request) {
  try {
    requireOperator(request);
    const { contract } = await request.json() as { contract: ContractData };
    const checks = validateContract(contract);
    const { host, headers } = getCredentials();
    const base = host.endsWith('/pdf-services') ? host : `${host}/pdf-services`;
    const form = new FormData();
    form.append('file', new Blob([buildContractDocumentText(contract)], { type: 'text/plain' }), 'signfence-synthetic-contract.txt');
    const uploaded = await fetch(`${base}/api/documents/upload`, { method: 'POST', headers, body: form });
    if (!uploaded.ok) throw new Error(`FOXIT_UPLOAD_${uploaded.status}`);
    const uploadJson = await uploaded.json() as { documentId?: string; data?: { documentId?: string } };
    const documentId = uploadJson.documentId ?? uploadJson.data?.documentId;
    if (!documentId) throw new Error('FOXIT_UPLOAD_NO_DOCUMENT_ID');
    const created = await fetch(`${base}/api/documents/create/pdf-from-text`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ documentId }) });
    if (!created.ok) throw new Error(`FOXIT_CREATE_${created.status}`);
    const createJson = await created.json() as { taskId?: string; data?: { taskId?: string } };
    const taskId = createJson.taskId ?? createJson.data?.taskId;
    if (!taskId) throw new Error('FOXIT_CREATE_NO_TASK_ID');
    let resultDocumentId: string | undefined;
    let status = 'PENDING';
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const polled = await fetch(`${base}/api/tasks/${encodeURIComponent(taskId)}`, { headers, cache: 'no-store' });
      if (!polled.ok) throw new Error(`FOXIT_POLL_${polled.status}`);
      const task = await polled.json() as { status?: string; resultDocumentId?: string; data?: { status?: string; resultDocumentId?: string } };
      status = task.status ?? task.data?.status ?? 'UNKNOWN';
      resultDocumentId = task.resultDocumentId ?? task.data?.resultDocumentId;
      if (/COMPLETED|SUCCESS/.test(status)) break;
      if (/FAILED|ERROR/.test(status)) throw new Error(`FOXIT_TASK_${status}`);
      await sleep(1000);
    }
    if (!resultDocumentId) throw new Error('FOXIT_RESULT_UNAVAILABLE');
    const downloaded = await fetch(`${base}/api/documents/${encodeURIComponent(resultDocumentId)}/download`, { headers, cache: 'no-store' });
    if (!downloaded.ok) throw new Error(`FOXIT_DOWNLOAD_${downloaded.status}`);
    const pdf = Buffer.from(await downloaded.arrayBuffer());
    if (pdf.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error('FOXIT_RESULT_NOT_PDF');
    return Response.json({ mode: 'LIVE_FOXIT_API', status, taskId, runId:createRun(), sha256: createHash('sha256').update(pdf).digest('hex'), pdfBase64: pdf.toString('base64'), bytes: pdf.length, checks, occurredAt:new Date().toISOString() });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    const status = code === 'OPERATOR_MODE_DISABLED' || code === 'OPERATOR_ORIGIN_REQUIRED' ? 403 : code === 'FOXIT_CREDENTIALS_UNAVAILABLE' ? 503 : 502;
    return Response.json({ mode: 'LIVE_FOXIT_API', success: false, error: code }, { status });
  }
}
