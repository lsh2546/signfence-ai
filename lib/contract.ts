export type ContractData = {
  partyA: string; partyB: string; amount: number; paymentScheduleAmount: number;
  effectiveDate: string; dueDate: string; obligations: string[];
  copyrightTransferCondition: string;
  requiredClauses: string[]; extraClauses: { text: string; approved: boolean }[];
};
export type CheckResult = { id: string; label: string; passed: boolean; detail: string };
export type SignatureGateInput = { checks: CheckResult[]; humanApprovalRecorded: boolean; approvedPdfHash: string | null; currentPdfHash: string | null };

export function validateContract(contract: ContractData, documentChanged = false): CheckResult[] {
  const dateOrderValid = Boolean(contract.effectiveDate && contract.dueDate) && new Date(contract.dueDate).getTime() >= new Date(contract.effectiveDate).getTime();
  const copyrightConditionPreserved = /only\s+after\s+full\s+payment/i.test(contract.copyrightTransferCondition) || /(?:계약금|대금)\s*전액.*지급\s*(?:한|된)?\s*후/.test(contract.copyrightTransferCondition);
  return [
    { id: 'parties', label: 'Parties', passed: Boolean(contract.partyA.trim() && contract.partyB.trim()), detail: 'Both contracting parties must be identified.' },
    { id: 'amount', label: 'Amount consistency', passed: contract.amount > 0 && contract.amount === contract.paymentScheduleAmount, detail: `Contract total ${contract.amount.toLocaleString()} / Payment schedule ${contract.paymentScheduleAmount.toLocaleString()} KRW` },
    { id: 'dates', label: 'Date order', passed: dateOrderValid, detail: 'The due date must not precede the effective date.' },
    { id: 'obligations', label: 'Obligations', passed: contract.obligations.length > 0 && contract.obligations.every((item) => item.trim().length > 0), detail: 'At least one explicit delivery obligation is required.' },
    { id: 'required-clauses', label: 'Required clauses', passed: ['scope', 'payment', 'delivery', 'copyright'].every((clause) => contract.requiredClauses.includes(clause)) && copyrightConditionPreserved, detail: 'Scope, payment, delivery, and copyright transfer only after full payment are required.' },
    { id: 'unapproved-clauses', label: 'Unapproved additions', passed: contract.extraClauses.every((clause) => clause.approved), detail: 'Any clause added beyond the instruction requires explicit approval.' },
    { id: 'document-change', label: 'Post-approval document change', passed: !documentChanged, detail: 'The approved document hash must match the current document hash.' },
  ];
}
export function signatureGate({ checks, humanApprovalRecorded, approvedPdfHash, currentPdfHash }: SignatureGateInput) {
  const allSevenChecksPassed = checks.length === 7 && checks.every((check) => check.passed);
  return allSevenChecksPassed && humanApprovalRecorded && approvedPdfHash !== null && approvedPdfHash === currentPdfHash;
}
