// Static export verifies the deployed artifact; no credential/provider status leaks.
export const dynamic = 'force-static';
export function GET() {
  return Response.json({ status: 'ok', service: 'screen-recorder-finder' });
}
