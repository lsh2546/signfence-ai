import type { ContractData } from './contract';
export function buildContractDocumentText(c: ContractData) {
  return `SIGNFENCE AI SYNTHETIC TEST AGREEMENT\n\nSYNTHETIC TEST DATA ONLY. NO LEGAL EFFECT.\n\nParty A: ${c.partyA}\nParty B: ${c.partyB}\nContract amount: KRW ${c.amount}\nPayment schedule amount: KRW ${c.paymentScheduleAmount}\nEffective date: ${c.effectiveDate}\nDue date: ${c.dueDate}\nObligations:\n${c.obligations.map((item) => `- ${item}`).join('\n')}\nCopyright transfer condition: ${c.copyrightTransferCondition}\nRequired clauses: ${c.requiredClauses.join(', ')}\nAdditional clauses: ${c.extraClauses.map((item) => item.text).join(', ') || 'None'}\n\nTest signer signature: ____________________\nTest signing date: ____________________\n`;
}
