import {
  supabase,
  reply,
  readBody,
  getPlayer,
  todayBangkok,
  headers
} from "./_shared.mjs";

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return reply(405, { error: "Method not allowed" });
  }

  try {
    const { token } = await readBody(request);
    const player = await getPlayer(token);
    const today = todayBangkok();

    const [
      { data: cards, error: ce },
      { data: collection, error: oe },
      { data: fortune, error: fe },
      { count: drawCount, error: de }
    ] = await Promise.all([
      supabase
        .from("cards")
        .select("*")
        .eq("active", true)
        .order("sort_order"),

      supabase
        .from("player_cards")
        .select("card_id,quantity,cards(*)")
        .eq("player_id", player.id),

      supabase
        .from("daily_fortunes")
        .select("*")
        .eq("player_id", player.id)
        .eq("fortune_date", today)
        .maybeSingle(),

      supabase
        .from("draw_logs")
        .select("*", { count: "exact", head: true })
        .eq("player_id", player.id)
        .eq("draw_date", today)
    ]);

    if (ce || oe || fe || de) {
      throw ce || oe || fe || de;
    }

    return reply(200, {
      player,
      cards: cards || [],
      collection: (collection || []).map((item) => ({
        card_id: item.card_id,
        quantity: item.quantity,
        card: item.cards
      })),
      fortune: fortune || null,
      draws_left: Math.max(0, 3 - (drawCount || 0))
    });
  } catch (error) {
    console.error("me function error:", error);

    return reply(500, {
      error: error?.message || "Server error"
    });
  }
};
