import sys
p = sys.argv[1]
s = open(p).read()
old = '  const cors = apiHeaders(request.headers.get("origin") ?? undefined);'
new = """  const cors: Record<string, string> = {
    "Access-Control-Allow-Origin": allowedOrigin(request.headers.get("origin") ?? undefined),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-BOW-Teacher-Key",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Cache-Control": "no-store",
  };"""
assert old in s, "the apiHeaders call is not where it was"
open(p, "w").write(s.replace(old, new, 1))
