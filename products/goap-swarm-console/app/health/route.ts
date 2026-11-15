// Public artifact readiness for independent Node/Bun deployment, WR #18334.
export const dynamic = 'force-static';
export function GET() {
  return Response.json({ status: 'ok', service: 'goap-swarm-console' });
}
