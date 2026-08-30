import type { ContractData } from './contract';
export function buildContractDocumentText(c: ContractData) {
  return `SIGNFENCE AI SYNTHETIC TEST AGREEMENT\n\nSYNTHETIC TEST DATA ONLY. NO LEGAL EFFECT.\n\nParty A: ${c.partyA}\nParty B: ${c.partyB}\nContract amount: KRW ${c.amount}\nPayment schedule amount: KRW ${c.paymentScheduleAmount}\nEffective date: ${c.effectiveDate}\nDue date: ${c.dueDate}\nObligations:\n${c.obligations.map((item) => `- ${item}`).join('\n')}\nCopyright transfer condition: ${c.copyrightTransferCondition}\nRequired clauses: ${c.requiredClauses.join(', ')}\nAdditional clauses: ${c.extraClauses.map((item) => item.text).join(', ') || 'None'}\n\nTest signer signature: ____________________\nTest signing date: ____________________\n`;
}

const ascii = (value: string) => value.normalize('NFKD').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
const pdfEscape = (value: string) => ascii(value).replace(/([\\()])/g, '\\$1');

export function buildContractPdfBytes(c: ContractData): Uint8Array {
  const copyright = c.copyrightTransferCondition.split('/')[0].trim();
  const lines = [
    'SIGNFENCE AI - SYNTHETIC TEST AGREEMENT',
    'SYNTHETIC TEST DATA ONLY. NO LEGAL EFFECT.', '',
    `Party A: ${c.partyA}`, `Party B: ${c.partyB}`,
    `Contract total: KRW ${c.amount.toLocaleString('en-US')}`,
    `Payment schedule: KRW ${c.paymentScheduleAmount.toLocaleString('en-US')}`,
    `Effective date: ${c.effectiveDate}`, `Due date: ${c.dueDate}`, '',
    'Obligations:', ...c.obligations.map((item) => `- ${item}`), '',
    `Copyright transfer: ${copyright}`,
    'Required clauses: scope, payment, delivery, copyright',
    `Additional clauses: ${c.extraClauses.map((item) => item.text).join('; ') || 'None'}`, '',
    'Human review required before signing.',
    'Test signer signature: ______________________________',
    'Test signing date: _________________________________',
  ];
  const commands = ['BT', '/F1 11 Tf', '54 738 Td', '16 TL', ...lines.map((line, index) => `${index === 0 ? '' : 'T* '}(${pdfEscape(line)}) Tj`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n%SignFence\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}
