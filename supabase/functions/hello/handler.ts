const corsHeaders = {
  "Access-Control-Allow-Origin": "https://usmaanalii.github.io",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export function helloHandler(request: Request): Response {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return Response.json(
      { error: "Method not allowed. Use GET." },
      { status: 405, headers: { ...corsHeaders, Allow: "GET, OPTIONS" } },
    );
  }

  return Response.json(
    { message: "Hello from Supabase!", ok: true },
    { headers: corsHeaders },
  );
}
