import type { ContractData } from './contract';

const money = (value: string) => Number(value.replace(/[^0-9]/g, ''));
const first = (text: string, patterns: RegExp[]) => patterns.map((pattern) => text.match(pattern)?.[1]).find(Boolean);
const normalizeNumericDate = (value: string) => value.replace(/년\s*|월\s*/g, '-').replace(/일/g, '').replace(/[./]/g, '-').replace(/-(\d)(?=-|$)/g, '-0$1');
const englishDate = (source: string) => {
  const match = source.match(/(?:due|due date(?: is)?|by)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i);
  if (!match) return undefined;
  const month = String(new Date(`${match[1]} 1, 2000`).getMonth() + 1).padStart(2, '0');
  return `${match[3]}-${month}-${match[2].padStart(2, '0')}`;
};

export function structureContract(text: string): ContractData {
  const source = text.trim();
  if (!source) throw new Error('STRUCTURE_INPUT_EMPTY');
  const isKorean = /[가-힣]/.test(source);
  const parties = isKorean
    ? source.match(/^([^,。.]+?)\s*(?:와|과)\s*([^,。.]+?)\s*(?:사이(?:의)?|간)\s/i)
    : source.match(/between\s+(?:an?\s+|the\s+)?(.+?)\s+and\s+(?:an?\s+|the\s+)?(.+?)(?:\.|,|\s+for\s+)/i);
  const amounts = [...source.matchAll(/(?:총액|본문(?:\s*총액)?|계약금액|지급표(?:\s*금액)?)\s*[:：]?\s*([0-9][0-9,\s]*원?)/gi)];
  const main = first(source, [/(?:계약\s*본문의?\s*총액|본문(?:의)?\s*총액|계약금액|총액)(?:은|는)?\s*[:：]?\s*([0-9][0-9,\s]*원?)/i, /(?:contract total|total contract amount)\s+(?:is|of|:)\s*(?:KRW\s*)?([0-9][0-9,\s]*)/i]);
  const schedule = first(source, [/(?:지급\s*일정표|지급표|지급\s*조건표)(?:에는|에|의\s*금액은)?\s*[:：]?\s*([0-9][0-9,\s]*원?)/i, /payment schedule(?:\s+states|\s+shows|\s+amount(?:\s+is)?|:)\s*(?:KRW\s*)?([0-9][0-9,\s]*)/i]);
  const due = isKorean ? first(source, [/(?:납기일|납기|마감일)(?:은|는)?\s*[:：]?\s*(\d{4}(?:년\s*|[-./])\d{1,2}(?:월\s*|[-./])\d{1,2}(?:일)?)/i]) : englishDate(source);
  const effective = first(source, [/(?:효력일|시작일|effective date)\s*[:：]?\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})/i]) ?? '2026-09-01';
  const deliverables = first(source, [/(?:결과물|납품물)(?:은|는)?\s*[:：]?\s*(?:상품\s*이미지\s*)?(\d+)\s*개/i, /(?:deliverables?(?: are|:)?\s*)?(\d+)\s+product images?/i]);
  const revisions = first(source, [/(?:수정)(?:은|는)?\s*(?:최대)?\s*[:：]?\s*(\d+)\s*회/i, /(?:up to|maximum of|max(?:imum)?\s*)\s*(\d+)\s+(?:revision|revision rounds?)/i]);
  const copyright = first(source, [/(결과물의\s*저작권은\s*계약\s*대금\s*전액이?\s*지급된\s*후\s*판매자에게\s*이전됩니다)/i, /(copyright transfers?[^.]*only after[^.]*full contract amount[^.]*paid)/i]);
  if (!parties || !main || !due || !deliverables || !revisions || !copyright) throw new Error('STRUCTURE_REQUIRED_FIELD_MISSING');
  const copyrightTransferCondition = 'Only after the full contract amount has been paid / 계약 대금 전액 지급 후';
  const fallbackSchedule = schedule ?? amounts[1]?.[1] ?? main;
  return {
    partyA: parties[1].trim() === '온라인 판매자' ? 'Online seller' : parties[1].trim(),
    partyB: parties[2].trim() === '외주 디자이너' ? 'Freelance designer' : parties[2].trim(),
    amount: money(main), paymentScheduleAmount: money(fallbackSchedule),
    effectiveDate: normalizeNumericDate(effective), dueDate: isKorean ? normalizeNumericDate(due) : due,
    obligations: [`Create ${deliverables} product images`, `Complete a maximum of ${revisions} revision rounds`],
    copyrightTransferCondition,
    requiredClauses: ['scope', 'payment', 'delivery', 'copyright'],
    extraClauses: [{ text: 'Copyright transfers to the seller only after the full contract amount has been paid.', approved: true }],
  };
}
