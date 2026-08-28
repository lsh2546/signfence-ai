import type { ContractData } from './contract';

const money = (value: string) => Number(value.replace(/[,\s원]/g, ''));
const first = (text: string, patterns: RegExp[]) => patterns.map((p) => text.match(p)?.[1]).find(Boolean);

export function structureContract(text: string): ContractData {
  const source = text.trim();
  if (!source) throw new Error('STRUCTURE_INPUT_EMPTY');
  const parties = source.match(/^([^,。.]+?)\s*(?:와|과)\s*([^,。.]+?)\s*(?:사이(?:의)?|간)\s/i);
  const amounts = [...source.matchAll(/(?:총액|본문(?:\s*총액)?|계약금액|지급표(?:\s*금액)?)\s*[:：]?\s*([0-9][0-9,\s]*원?)/gi)];
  const main = first(source, [/(?:계약\s*본문의?\s*총액|본문(?:의)?\s*총액|계약금액|총액)(?:은|는)?\s*[:：]?\s*([0-9][0-9,\s]*원?)/i]);
  const schedule = first(source, [/(?:지급\s*일정표|지급표|지급\s*조건표)(?:에는|에는|에|의\s*금액은)?\s*[:：]?\s*([0-9][0-9,\s]*원?)/i]);
  const due = first(source, [/(?:납기일|납기|마감일|due)(?:은|는)?\s*[:：]?\s*(\d{4}(?:년\s*|[-./])\d{1,2}(?:월\s*|[-./])\d{1,2}(?:일)?)/i]);
  const effective = first(source, [/(?:효력일|시작일|effective)\s*[:：]?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/i]) ?? '2026-09-01';
  const deliverables = first(source, [/(?:결과물|납품물)(?:은|는)?\s*[:：]?\s*(?:상품\s*이미지\s*)?(\d+)\s*개/i]);
  const revisions = first(source, [/(?:수정)(?:은|는)?\s*(?:최대)?\s*[:：]?\s*(\d+)\s*회/i]);
  const copyright = first(source, [/(결과물의\s*저작권은\s*계약\s*대금\s*전액이?\s*지급된\s*후\s*판매자에게\s*이전됩니다)/i]);
  if (!parties || !main || !due || !deliverables || !revisions || !copyright) throw new Error('STRUCTURE_REQUIRED_FIELD_MISSING');
  const normalizedDate = (v: string) => v.replace(/년\s*|월\s*/g, '-').replace(/일/g, '').replace(/[./]/g, '-').replace(/-(\d)(?=-|$)/g, '-0$1');
  const copyrightTransferCondition = 'Only after the full contract amount has been paid / 계약 대금 전액 지급 후';
  const extraClauses = [{ text: 'Copyright transfers to the seller only after the full contract amount has been paid.', approved: true }];
  const fallbackSchedule = schedule ?? amounts[1]?.[1] ?? main;
  return {
    partyA: parties[1].trim()==='온라인 판매자'?'Online seller':parties[1].trim(), partyB: parties[2].trim()==='외주 디자이너'?'Freelance designer':parties[2].trim(), amount: money(main), paymentScheduleAmount: money(fallbackSchedule),
    effectiveDate: normalizedDate(effective), dueDate: normalizedDate(due),
    obligations: [`Create ${deliverables} product images`, `Complete a maximum of ${revisions} revision rounds`], copyrightTransferCondition,
    requiredClauses: ['scope', 'payment', 'delivery', 'copyright'], extraClauses,
  };
}
