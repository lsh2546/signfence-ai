import { mkdir, writeFile } from 'node:fs/promises';
import { POST } from '../app/api/foxit/pdf/route.ts';
import type { ContractData } from '../lib/contract.ts';
import { signatureGate, validateContract } from '../lib/contract.ts';

process.env.SIGNFENCE_OPERATOR_MODE='true';
const base:ContractData={partyA:'Synthetic Online Store',partyB:'Synthetic Design Studio',amount:1200000,paymentScheduleAmount:1020000,effectiveDate:'2026-09-01',dueDate:'2026-09-30',obligations:['Create ten synthetic product images','Provide up to two revision rounds'],copyrightTransferCondition:'계약금 전액 지급 후',requiredClauses:['scope','payment','delivery','copyright'],extraClauses:[{text:'결과물의 저작권은 계약금 전액을 지급한 후 판매자에게 이전됩니다',approved:true}]};
async function processPdf(contract:ContractData){
 const request=new Request('http://localhost/api/foxit/pdf',{method:'POST',headers:{'content-type':'application/json','origin':'http://localhost:3001'},body:JSON.stringify({contract})});
 const response=await POST(request);const data=await response.json();if(!response.ok)throw new Error(data.error??`HTTP_${response.status}`);
 return {mode:data.mode,status:data.status,taskId:data.taskId,sha256:data.sha256,bytes:data.bytes,pdfHeaderVerified:true,occurredAt:data.occurredAt,checksPassed:data.checks.filter((c:{passed:boolean})=>c.passed).length};
}
const initial=await processPdf(base);const correctedContract={...base,amount:base.paymentScheduleAmount};const corrected=await processPdf(correctedContract);
if(initial.sha256===corrected.sha256)throw new Error('EXPECTED_DISTINCT_HASHES');
const signatureGateBlocked=signatureGate({checks:validateContract(correctedContract),humanApprovalRecorded:true,approvedPdfHash:initial.sha256,currentPdfHash:corrected.sha256})===false;
if(!signatureGateBlocked)throw new Error('SIGNATURE_GATE_EXPECTED_BLOCK');
const evidence={evidenceType:'LIVE_FOXIT_PDF_SERVICES',testMode:true,containsPii:false,initial,corrected,hashesDiffer:true,signatureGateBlocked,estimatedCreditsUsed:2,esignCalled:false};
await mkdir('../../outputs/signfence-ai',{recursive:true});await writeFile('../../outputs/signfence-ai/live-pdf-initial-corrected.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
