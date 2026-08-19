import sys
p = sys.argv[1]
s = open(p).read()
start = s.index("        clientId: rateLimitAddress({")
end = s.index("        }),", start) + len("        }),")
own = "\n".join([
    'function callerOf(realIp: string | null, forwarded: string | null): string {',
    '  if (realIp?.trim()) return realIp.trim();',
    '  const chain = (forwarded ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);',
    '  return chain[chain.length - 1] ?? "anonymous";',
    '}',
    '',
    '',
])
call = '        clientId: callerOf(request.headers.get("x-real-ip"), request.headers.get("x-forwarded-for")),'
s = s[:start] + call + s[end:]
s = s.replace("export default async function handler", own + "export default async function handler", 1)
open(p, "w").write(s)
