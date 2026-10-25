import {
  supabase,
  reply,
  readBody,
  getPlayer,
  todayBangkok,
  headers
} from "./_shared.mjs";

const fortunes = [
  {
    title_en: "Lucky Orbit",
    message_en:
      "Today is full of little sparks. May a sweet SiYu moment make you smile. 💜🩵"
  },
  {
    title_en: "Soft Heart Day",
    message_en:
      "A gentle day to revisit a favorite moment and recharge your heart."
  },
  {
    title_en: "Destiny Spark",
    message_en:
      "The stars say: keep your heart open to small, lovely surprises."
  },
  {
    title_en: "Cozy Energy",
    message_en:
      "Today’s mission is to be kind to yourself and enjoy your favorite songs."
  }
];

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

    const { data: existing, error: existingError } = await supabase
      .from("daily_fortunes")
      .select("*")
      .eq("player_id", player.id)
      .eq("fortune_date", date)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return reply(200, { fortune: existing });
    }

    const fortune =
      fortunes[Math.floor(Math.random() * fortunes.length)];

    const { data, error } = await supabase
      .from("daily_fortunes")
      .insert({
        player_id: player.id,
        fortune_date: date,
        ...fortune
      })
      .select()
      .single();

    if (error) {
      // If another request saved today's fortune first,
      // return that saved fortune instead.
      const { data: retry, error: retryError } = await supabase
        .from("daily_fortunes")
        .select("*")
        .eq("player_id", player.id)
        .eq("fortune_date", date)
        .maybeSingle();

      if (retryError) throw retryError;
      if (retry) return reply(200, { fortune: retry });

      throw error;
    }

    return reply(200, { fortune: data });
  } catch (error) {
    console.error("fortune function error:", error);

    return reply(500, {
      error: error?.message || "Server error"
    });
  }
};
