import { supabase, reply, readBody, getPlayer, todayBangkok } from "./_shared.mjs";
const fortunes=[
 {title_en:"Lucky Orbit",message_en:"Today is full of little sparks. May a sweet SiYu moment make you smile. 💜🩵"},
 {title_en:"Soft Heart Day",message_en:"A gentle day to revisit a favorite moment and recharge your heart."},
 {title_en:"Destiny Spark",message_en:"The stars say: keep your heart open to small, lovely surprises."},
 {title_en:"Cozy Energy",message_en:"Today’s mission is to be kind to yourself and enjoy your favorite songs."}
];
export default async (event)=>{
 if(event.httpMethod==="OPTIONS")return reply(204,{});
 if(event.httpMethod!=="POST")return reply(405,{error:"Method not allowed"});
 try{
  const {token}=readBody(event);const player=await getPlayer(token);const date=todayBangkok();
  const {data:existing}=await supabase.from("daily_fortunes").select("*").eq("player_id",player.id).eq("fortune_date",date).maybeSingle();
  if(existing)return reply(200,{fortune:existing});
  const f=fortunes[Math.floor(Math.random()*fortunes.length)];
  const {data,error}=await supabase.from("daily_fortunes").insert({player_id:player.id,fortune_date:date,...f}).select().single();
  if(error){const {data:retry}=await supabase.from("daily_fortunes").select("*").eq("player_id",player.id).eq("fortune_date",date).single();if(retry)return reply(200,{fortune:retry});throw error}
  return reply(200,{fortune:data});
 }catch(e){return reply(500,{error:e.message||"Server error"})}
};