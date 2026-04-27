import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({ ok: true, service: "health-check", timestamp: new Date().toISOString() }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});
