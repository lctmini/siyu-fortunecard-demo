```javascript
import {
  supabase,
  readBody,
  getPlayer,
  todayBangkok
} from "./_shared.mjs";

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const { token } = readBody(event);
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

    return jsonResponse(200, {
      player,
      cards: cards || [],
      collection: (collection || []).map((x) => ({
        card_id: x.card_id,
        quantity: x.quantity,
        card: x.cards
      })),
      fortune: fortune || null,
      draws_left: Math.max(0, 3 - (drawCount || 0))
    });
  } catch (e) {
    console.error("me function error:", e);

    return jsonResponse(500, {
      error: e?.message || "Server error"
    });
  }
};
```
