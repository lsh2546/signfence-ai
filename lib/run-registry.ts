type Run = { folderId?: string; sent: boolean; createdAt: string };
const runs = new Map<string, Run>();
export const createRun = () => { const id = crypto.randomUUID(); runs.set(id, { sent:false, createdAt:new Date().toISOString() }); return id; };
export const getRun = (id: string) => runs.get(id);
export const bindFolder = (id: string, folderId: string) => { const run=runs.get(id); if(!run) throw new Error('RUN_NOT_FOUND'); if(run.sent) throw new Error('DUPLICATE_ESIGN_BLOCKED'); run.sent=true; run.folderId=folderId; };
