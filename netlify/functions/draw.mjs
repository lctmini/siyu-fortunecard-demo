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
    const date = todayBangkok();

    const { data: fortune, error: fortuneError } = await supabase
      .from("daily_fortunes")
      .select("id")
      .eq("player_id", player.id)
      .eq("fortune_date", date)
      .maybeSingle();

    if (fortuneError) throw fortuneError;

    if (!fortune) {
      return reply(403, {
        error: "Read today's fortune first to unlock the gacha."
      });
    }

    const { data: result, error } = await supabase.rpc(
      "draw_daily_card",
      {
        p_player_id: player.id,
        p_draw_date: date
      }
    );

    if (error) throw error;

    if (result?.error === "DAILY_LIMIT") {
      return reply(429, {
        error: "You have used all 3 draws today. Come back tomorrow!"
      });
    }

    if (result?.error) {
      return reply(400, { error: result.error });
    }

    return reply(200, {
      card: result.card,
      duplicate: result.duplicate,
      draws_left: result.draws_left
    });
  } catch (error) {
    console.error("draw function error:", error);

    return reply(500, {
      error: error?.message || "Server error"
    });
  }
};
