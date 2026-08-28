import { signatureGate, validateContract, type ContractData } from '../../../../lib/contract.ts';
import { createHash, timingSafeEqual } from 'node:crypto';
import { requireOperator } from '../../../../lib/operator.ts';
import { bindFolder, getRun } from '../../../../lib/run-registry.ts';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (process.env.SIGNFENCE_ESIGN_SEND_ENABLED !== 'true') return Response.json({ mode: 'LIVE_FOXIT_API', sent: false, error: 'OPERATOR_APPROVAL_REQUIRED' }, { status: 423 });
  try {
    requireOperator(request);
    const body = await request.json() as { runId:string; contract: ContractData; recipient: string; pdfBase64: string; approvedPdfHash: string; currentPdfHash: string; humanApprovalRecorded: boolean };
    if(!getRun(body.runId)) return Response.json({mode:'LIVE_FOXIT_API',sent:false,error:'RUN_NOT_FOUND'},{status:404});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.recipient)) return Response.json({mode:'LIVE_FOXIT_API',sent:false,error:'INVALID_RECIPIENT_EMAIL'},{status:400});
    const serverHash=createHash('sha256').update(Buffer.from(body.pdfBase64,'base64')).digest('hex');
    const equal=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
    if(!equal(serverHash,body.currentPdfHash)||!equal(serverHash,body.approvedPdfHash)) return Response.json({mode:'LIVE_FOXIT_API',sent:false,error:'SERVER_PDF_HASH_MISMATCH'},{status:409});
    const checks = validateContract(body.contract);
    if (!signatureGate({ checks, humanApprovalRecorded: body.humanApprovalRecorded, approvedPdfHash: body.approvedPdfHash, currentPdfHash: body.currentPdfHash })) return Response.json({ mode: 'LIVE_FOXIT_API', sent: false, error: 'SIGNATURE_GATE_BLOCKED', checks }, { status: 409 });
    const host = process.env.FOXIT_CLOUD_API_HOST?.replace(/\/$/, ''); const clientId = process.env.FOXIT_CLOUD_API_CLIENT_ID; const clientSecret = process.env.FOXIT_CLOUD_API_CLIENT_SECRET;
    if (!host || !clientId || !clientSecret) throw new Error('FOXIT_CREDENTIALS_UNAVAILABLE');
    const payload = { folderName:'SignFence AI - Synthetic Contract', inputType:'base64', base64FileString:[body.pdfBase64], fileNames:['signfence-synthetic-contract.pdf'], sendNow:true, processTextTags:false, parties:[{ firstName:'Test', lastName:'Signer', emailId:body.recipient, permission:'FILL_FIELDS_AND_SIGN', sequence:1 }], fields:[{ type:'signature',x:155,y:455,width:250,height:34,documentNumber:1,pageNumber:1,party:1,partyResponsible:1,tabOrder:1,required:true,name:'Test Signer Signature'},{ type:'date',x:155,y:495,width:250,height:30,documentNumber:1,pageNumber:1,party:1,partyResponsible:1,tabOrder:2,required:true,name:'Test Signing Date',dateFormat:'MM-DD-YYYY'}] };
    const response = await fetch(`${host}/esign/api/v1/folders/createfolder`, { method:'POST', headers:{ client_id:clientId, client_secret:clientSecret, 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
    if (!response.ok) throw new Error(`FOXIT_ESIGN_${response.status}`);
    const result = await response.json() as { folder?: { folderId?: number; folderStatus?: string }; folderId?: number; folderStatus?: string };
    const folderId=String(result.folder?.folderId??result.folderId??''); if(!folderId)throw new Error('FOXIT_ESIGN_NO_FOLDER_ID'); bindFolder(body.runId,folderId);
    return Response.json({ mode:'LIVE_FOXIT_API', sent:true, runId:body.runId, status:result.folder?.folderStatus??result.folderStatus, occurredAt:new Date().toISOString() });
  } catch (error) {
    return Response.json({ mode:'LIVE_FOXIT_API', sent:false, error:error instanceof Error?error.message:'UNKNOWN_ERROR' }, { status:502 });
  }
}
