import {
  supabase,
  reply,
  readBody,
  getPlayer,
  todayBangkok,
  headers
} from "./_shared.mjs";

// Values are stored in Supabase once per player per Bangkok calendar day.
// Every language field is saved so the frontend can display only the selected language.
const fortunes = [
  {
    title_en: "Lucky Orbit",
    title_th: "วงโคจรแห่งโชคดี",
    title_ko: "행운의 궤도",
    title_ja: "幸運のオービット",
    message_en: "Today is full of little sparks. May a sweet SiYu moment make you smile. 💜🩵",
    message_th: "วันนี้เต็มไปด้วยประกายเล็ก ๆ ขอให้โมเมนต์ SiYu ที่น่ารักทำให้คุณยิ้มได้นะ 💜🩵",
    message_ko: "오늘은 작은 반짝임으로 가득해요. 사랑스러운 SiYu의 순간이 미소를 선물하길 바라요. 💜🩵",
    message_ja: "今日は小さなきらめきがいっぱい。SiYuの素敵な瞬間が笑顔を届けてくれますように。💜🩵",
    lucky_color: "purple",
    lucky_item: "photocard",
    daily_mission_en: "Revisit one favorite SiYu moment.",
    daily_mission_th: "ย้อนดูโมเมนต์ SiYu ที่ชอบหนึ่งโมเมนต์",
    daily_mission_ko: "좋아하는 SiYu의 순간을 다시 감상해 보세요.",
    daily_mission_ja: "お気に入りのSiYuの瞬間を見返そう。"
  },
  {
    title_en: "Soft Heart Day",
    title_th: "วันที่หัวใจอ่อนโยน",
    title_ko: "다정한 마음의 날",
    title_ja: "やさしい心の日",
    message_en: "A gentle day to revisit a favorite moment and recharge your heart.",
    message_th: "วันนี้เหมาะกับการกลับไปดูโมเมนต์โปรด แล้วเติมพลังให้หัวใจอีกครั้ง",
    message_ko: "좋아하는 순간을 다시 보며 마음을 충전하기 좋은 날이에요.",
    message_ja: "お気に入りの瞬間を見返して、心を満たすのにぴったりな日です。",
    lucky_color: "pink",
    lucky_item: "drink",
    daily_mission_en: "Be kind to yourself and get enough rest.",
    daily_mission_th: "ใจดีกับตัวเองและพักผ่อนให้เพียงพอ",
    daily_mission_ko: "자신에게 다정하게 대하고 충분히 쉬어 주세요.",
    daily_mission_ja: "自分に優しくして、しっかり休もう。"
  },
  {
    title_en: "Destiny Spark",
    title_th: "ประกายแห่งพรหมลิขิต",
    title_ko: "운명의 반짝임",
    title_ja: "運命のきらめき",
    message_en: "The stars say: keep your heart open to small, lovely surprises.",
    message_th: "ดวงดาวบอกให้เปิดใจรับเซอร์ไพรส์เล็ก ๆ ที่แสนน่ารัก",
    message_ko: "별들이 말해요. 작고 사랑스러운 깜짝 선물에 마음을 열어 보세요.",
    message_ja: "星たちは、小さくて素敵なサプライズに心を開いてと伝えています。",
    lucky_color: "blue",
    lucky_item: "earphones",
    daily_mission_en: "Listen to a favorite SiYu song.",
    daily_mission_th: "ฟังเพลงโปรดของ SiYu สักเพลง",
    daily_mission_ko: "좋아하는 SiYu의 노래를 한 곡 들어 보세요.",
    daily_mission_ja: "お気に入りのSiYuの曲を一曲聴いてみよう。"
  },
  {
    title_en: "Cozy Energy",
    title_th: "พลังงานแสนอบอุ่น",
    title_ko: "포근한 에너지",
    title_ja: "ほっこりエネルギー",
    message_en: "Today’s mission is to be kind to yourself and enjoy your favorite songs.",
    message_th: "ภารกิจวันนี้คือใจดีกับตัวเอง แล้วเพลิดเพลินกับเพลงที่ชอบ",
    message_ko: "오늘의 미션은 자신에게 친절하게 대하고 좋아하는 노래를 즐기는 거예요.",
    message_ja: "今日のミッションは、自分に優しくして好きな音楽を楽しむこと。",
    lucky_color: "green",
    lucky_item: "notebook",
    daily_mission_en: "Share a kind word or a little happiness with someone.",
    daily_mission_th: "ส่งต่อคำพูดดี ๆ หรือความสุขเล็ก ๆ ให้ใครสักคน",
    daily_mission_ko: "누군가에게 따뜻한 말이나 작은 행복을 전해 보세요.",
    daily_mission_ja: "誰かに優しい言葉や小さな幸せを届けよう。"
  }
];

export default async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { error: "Method not allowed" });

  try {
    const { token } = await readBody(request);
    if (!token) return reply(400, { error: "Missing player token" });
    const player = await getPlayer(token);
    const date = todayBangkok();

    const { data: existing, error: existingError } = await supabase
      .from("daily_fortunes").select("*")
      .eq("player_id", player.id).eq("fortune_date", date).maybeSingle();
    if (existingError) throw existingError;
    if (existing) return reply(200, { fortune: existing });

    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    const { data, error } = await supabase.from("daily_fortunes")
      .insert({ player_id: player.id, fortune_date: date, ...fortune })
      .select().single();
    if (error) {
      // Handle two tabs opening today's fortune at the same time.
      const { data: retry, error: retryError } = await supabase.from("daily_fortunes")
        .select("*").eq("player_id", player.id).eq("fortune_date", date).maybeSingle();
      if (retryError) throw retryError;
      if (retry) return reply(200, { fortune: retry });
      throw error;
    }
    return reply(200, { fortune: data });
  } catch (error) {
    console.error("fortune function error:", error);
    return reply(500, { error: error?.message || "Server error" });
  }
};
