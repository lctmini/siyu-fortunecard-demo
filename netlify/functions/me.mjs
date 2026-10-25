import { supabase, reply, readBody, getPlayer, todayBangkok } from "./_shared.mjs";
export default async (event) => {
 if(event.httpMethod==="OPTIONS") return reply(204,{});
 if(event.httpMethod!=="POST") return reply(405,{error:"Method not allowed"});
 try {
  const {token}=readBody(event); const player=await getPlayer(token); const today=todayBangkok();
  const [{data:cards,error:ce},{data:collection,error:oe},{data:fortune,error:fe},{count:drawCount,error:de}] = await Promise.all([
   supabase.from("cards").select("*").eq("active",true).order("sort_order"),
   supabase.from("player_cards").select("card_id,quantity,cards(*)").eq("player_id",player.id),
   supabase.from("daily_fortunes").select("*").eq("player_id",player.id).eq("fortune_date",today).maybeSingle(),
   supabase.from("draw_logs").select("*",{count:"exact",head:true}).eq("player_id",player.id).eq("draw_date",today)
  ]);
  if(ce||oe||fe||de) throw ce||oe||fe||de;
  return reply(200,{player,cards:cards||[],collection:(collection||[]).map(x=>({card_id:x.card_id,quantity:x.quantity,card:x.cards})),fortune:fortune||null,draws_left:Math.max(0,3-(drawCount||0))});
 } catch(e){return reply(500,{error:e.message||"Server error"});}
};