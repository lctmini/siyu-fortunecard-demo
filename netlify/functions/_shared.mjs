import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

export const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

export function reply(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export const validToken = (value) =>
  typeof value === "string" &&
  /^[a-f0-9-]{30,50}$/i.test(value);

export async function getPlayer(token) {
  if (!validToken(token)) {
    throw new Error("Invalid player token. Reload the page.");
  }

  const { data, error } = await supabase.rpc(
    "get_or_create_player",
    { p_token: token }
  );

  if (error) throw error;

  return data;
}

export function todayBangkok() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}
