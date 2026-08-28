import { createHash } from 'node:crypto';
import { requireOperator } from '../../../../lib/operator.ts';
import { getRun } from '../../../../lib/run-registry.ts';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    requireOperator(request);
    const runId = new URL(request.url).searchParams.get('runId')??''; const run=getRun(runId); const folderId=run?.folderId;
    if (!run || !folderId) return Response.json({ mode:'LIVE_FOXIT_API', error:'RUN_NOT_FOUND_OR_NOT_SENT' }, { status:404 });
    const host=process.env.FOXIT_CLOUD_API_HOST?.replace(/\/$/,''); const clientId=process.env.FOXIT_CLOUD_API_CLIENT_ID; const clientSecret=process.env.FOXIT_CLOUD_API_CLIENT_SECRET;
    if(!host||!clientId||!clientSecret) throw new Error('FOXIT_CREDENTIALS_UNAVAILABLE');
    const headers={client_id:clientId,client_secret:clientSecret};
    const [detailsResponse,historyResponse]=await Promise.all([
      fetch(`${host}/esign/api/v1/folders/myfolder?folderId=${folderId}`,{headers,cache:'no-store'}),
      fetch(`${host}/esign/api/v1/folders/viewActivityHistory?folderId=${folderId}`,{headers,cache:'no-store'}),
    ]);
    if(!detailsResponse.ok)throw new Error(`FOXIT_STATUS_${detailsResponse.status}`); if(!historyResponse.ok)throw new Error(`FOXIT_HISTORY_${historyResponse.status}`);
    const details=await detailsResponse.json() as {folder?:{folderStatus?:string};folderStatus?:string};
    const history=await historyResponse.json() as {details?:{latestActivityDate?:string;activities?:Array<{action?:string;folderStatus?:string;time?:string}>}};
    const status=details.folder?.folderStatus??details.folderStatus??'UNKNOWN';
    const activities=(history.details?.activities??[]).map(item=>({action:item.action??'',status:item.folderStatus??'',time:item.time??''}));
    let completedPdfSha256:string|null=null; let completedPdfBytes:number|null=null;
    if(status==='EXECUTED'){
      const downloaded=await fetch(`${host}/esign/api/v1/folders/document/download?folderId=${folderId}&docNumber=1`,{headers,cache:'no-store'});
      if(!downloaded.ok)throw new Error(`FOXIT_COMPLETED_PDF_${downloaded.status}`);
      const pdf=Buffer.from(await downloaded.arrayBuffer()); if(pdf.subarray(0,4).toString('ascii')!=='%PDF')throw new Error('FOXIT_COMPLETED_RESULT_NOT_PDF');
      completedPdfSha256=createHash('sha256').update(pdf).digest('hex'); completedPdfBytes=pdf.length;
    }
    return Response.json({mode:'LIVE_FOXIT_API',runId,status,latestActivityDate:history.details?.latestActivityDate??null,activities,completedPdfSha256,completedPdfBytes,occurredAt:new Date().toISOString()});
  }catch(error){const code=error instanceof Error?error.message:'UNKNOWN_ERROR';return Response.json({mode:'LIVE_FOXIT_API',error:code},{status:code==='OPERATOR_MODE_DISABLED'||code==='OPERATOR_ORIGIN_REQUIRED'?403:502})}
}
