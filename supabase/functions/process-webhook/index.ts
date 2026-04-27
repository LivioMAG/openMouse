import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { "Content-Type": "application/json" },
      status: 405,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      handler: "process-webhook",
      receivedAt: new Date().toISOString(),
      payload: body,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});
