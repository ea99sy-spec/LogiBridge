// WhatsApp click-to-chat helpers shared by the browser and the server.
// International number as digits only: "+90 532 000 00 00" -> "905320000000".
export function waNumber(phone) {
  let d = String(phone || "").replace(/[^0-9+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else return "";
  d = d.replace(/\D/g, "");
  return /^[1-9][0-9]{7,14}$/.test(d) ? d : "";
}
// https://wa.me/<number>?text=... opens a chat with the message ready to send.
// Without a number, WhatsApp lets the user pick the contact.
export function waLink(phone, text = "") {
  const n = phone ? waNumber(phone) : "";
  if (phone && !n) return "";
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
