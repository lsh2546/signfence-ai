export function requireOperator(request: Request) {
  if (process.env.SIGNFENCE_OPERATOR_MODE !== 'true') throw new Error('OPERATOR_MODE_DISABLED');
  const origin = request.headers.get('origin');
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) throw new Error('OPERATOR_ORIGIN_REQUIRED');
}
