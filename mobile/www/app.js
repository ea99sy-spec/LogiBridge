// LogiBridge Driver: sends the truck's GPS position in the background (screen off, other apps open)
// using the driver link the carrier created on the website. Points are kept on the phone when there
// is no signal and sent together when the connection returns.
const BASE = "https://logibridge-app.netlify.app";
const SEND_EVERY_MS = 60000; // try to send queued points every minute
const HEARTBEAT_MS = 10 * 60000; // repeat the last point while standing still, so the site knows the phone is alive
const MAX_QUEUE = 3000;

const texts = {
  driverApp: ["تطبيق السائق", "Driver app", "Sürücü uygulaması"],
  connectTitle: ["اربط التطبيق بمهمتك", "Connect to your job", "Uygulamayı işinize bağlayın"],
  connectHelp: [
    "الصق رابط السائق اللي بعتلك ياه الناقل (على واتساب مثلًا). بتعملها مرة وحدة لكل مهمة.",
    "Paste the driver link your carrier sent you (e.g. on WhatsApp). You do this once per job.",
    "Taşıyıcının gönderdiği sürücü bağlantısını yapıştırın (ör. WhatsApp). Her iş için bir kez.",
  ],
  linkLabel: ["رابط السائق", "Driver link", "Sürücü bağlantısı"],
  paste: ["لصق", "Paste", "Yapıştır"],
  connect: ["ربط", "Connect", "Bağlan"],
  badLink: ["الرابط غير صحيح.", "This link is not valid.", "Bağlantı geçersiz."],
  linkExpired: [
    "الرابط منتهي أو ألغاه الناقل. اطلب رابطًا جديدًا.",
    "The link expired or was revoked. Ask your carrier for a new one.",
    "Bağlantının süresi doldu veya iptal edildi. Yeni bağlantı isteyin.",
  ],
  offline: ["ما في إنترنت حاليًا.", "No internet right now.", "Şu anda internet yok."],
  start: ["▶ ابدأ التتبع", "▶ Start tracking", "▶ Takibi başlat"],
  stop: ["■ أوقف التتبع", "■ Stop tracking", "■ Takibi durdur"],
  tracking: ["التتبع شغّال", "Tracking is on", "Takip açık"],
  notTracking: ["التتبع متوقف", "Tracking is off", "Takip kapalı"],
  backgroundNote: [
    "بيضل يشتغل لو طفّيت الشاشة أو فتحت تطبيق تاني. بيطلع إشعار ثابت طول ما التتبع شغّال. إذا انقطعت التغطية، المواقع بتنحفظ وبتنبعت لما ترجع.",
    "Keeps working with the screen off or other apps open. A fixed notification shows while tracking. Without signal, points are saved and sent later.",
    "Ekran kapalıyken veya başka uygulama açıkken de çalışır. Takip sürerken sabit bildirim görünür. Sinyal yoksa konumlar saklanıp sonra gönderilir.",
  ],
  lastPoint: ["آخر موقع", "Last position", "Son konum"],
  lastSent: ["آخر إرسال", "Last sent", "Son gönderim"],
  waiting: ["بانتظار الإرسال", "Waiting to send", "Gönderilmeyi bekleyen"],
  sendNow: ["أرسل الآن", "Send now", "Şimdi gönder"],
  stageActions: ["مرحلة الشحنة", "Shipment stage", "Sevkiyat aşaması"],
  dispatch: ["بدأت الرحلة", "Trip started", "Yola çıktım"],
  arrive: ["وصلت", "I arrived", "Vardım"],
  fullPage: ["الصور وإثبات التسليم", "Photos and proof of delivery", "Fotoğraflar ve teslim kanıtı"],
  fullPageNote: [
    "بيفتح صفحة السائق بالمتصفح لإرسال الصور وتوقيع المستلم.",
    "Opens the driver page in the browser for photos and the receiver's signature.",
    "Fotoğraf ve alıcı imzası için sürücü sayfasını tarayıcıda açar.",
  ],
  changeLink: ["تغيير المهمة / الرابط", "Change job / link", "İşi / bağlantıyı değiştir"],
  confirmStop: ["أوقف التتبع؟", "Stop tracking?", "Takip durdurulsun mu?"],
  noPermission: [
    "التطبيق بحاجة لإذن الموقع «طوال الوقت». افتح الإعدادات وفعّله.",
    "The app needs location permission. Open settings and allow it.",
    "Uygulamanın konum iznine ihtiyacı var. Ayarları açıp izin verin.",
  ],
  notifTitle: ["LogiBridge: التتبع شغّال", "LogiBridge: tracking on", "LogiBridge: takip açık"],
  notifText: [
    "عم نبعت موقع الشاحنة لصاحب الشحنة.",
    "Sending the truck position to the shipment owner.",
    "Araç konumu sevkiyat sahibine gönderiliyor.",
  ],
  assigned: ["بانتظار الانطلاق", "Ready to start", "Çıkışa hazır"],
  transit: ["في الطريق", "On the way", "Yolda"],
  arrived: ["وصلت", "Arrived", "Vardı"],
  delivered: ["تم التسليم", "Delivered", "Teslim edildi"],
  cancelled: ["ملغاة", "Cancelled", "İptal"],
  failed: ["ما زبط الإرسال، رح نعيد المحاولة.", "Sending failed, will retry.", "Gönderilemedi, tekrar denenecek."],
};

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem("lbd_" + k);
      return v === null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("lbd_" + k, JSON.stringify(v));
    } catch {}
  },
};
let lang = store.get("lang", "ar");
const t = (k) => texts[k]?.[["ar", "en", "tr"].indexOf(lang)] ?? k;

const Cap = window.Capacitor;
const native = !!Cap?.isNativePlatform?.();
const BackgroundGeolocation = native ? Cap.registerPlugin("BackgroundGeolocation") : null;
const LocalNotifications = native ? Cap.registerPlugin("LocalNotifications") : null;

let token = store.get("token", "");
let task = null,
  watcherId = null,
  lastPointAt = 0,
  lastPoint = store.get("lastPoint", null);

function applyLanguage() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $("lang").value = lang;
  document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
  render();
}

// Accepts the full link (…/driver#<token>) or just the token.
function readToken(value) {
  const m = /([a-f0-9]{64})\s*$/i.exec(String(value || "").trim());
  return m ? m[1].toLowerCase() : "";
}

async function api(path, body) {
  const r = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) throw Object.assign(new Error(data.error || "HTTP " + r.status), { status: r.status });
  return data;
}

async function loadTask() {
  task = await api("/driver-api/task");
  render();
}

// ---- Queue: points survive app restarts and missing signal ----
const queue = () => store.get("queue", []);
function enqueue(point) {
  const list = queue();
  list.push(point);
  store.set("queue", list.slice(-MAX_QUEUE));
  render();
}
let sending = false;
async function flush() {
  if (sending || !token) return;
  const list = queue();
  if (!list.length) return;
  sending = true;
  try {
    for (let i = 0; i < list.length; i += 200) {
      await api("/driver-api/positions", { positions: list.slice(i, i + 200) });
      store.set("queue", queue().slice(Math.min(200, list.length - i)));
    }
    store.set("lastSent", new Date().toISOString());
    $("jobError").textContent = "";
    loadTask().catch(() => {});
  } catch (e) {
    if (e.status === 401) {
      stopTracking(true);
      $("jobError").textContent = t("linkExpired");
    } else $("jobError").textContent = navigator.onLine ? t("failed") : t("offline");
  } finally {
    sending = false;
    render();
  }
}

function onLocation(location) {
  if (!location) return;
  const point = {
    lat: location.latitude,
    lng: location.longitude,
    accuracy: location.accuracy ? Math.round(location.accuracy) : undefined,
    at: new Date(location.time || Date.now()).toISOString(),
  };
  lastPoint = point;
  lastPointAt = Date.now();
  store.set("lastPoint", point);
  enqueue(point);
}

// ---- Tracking on/off ----
async function startTracking() {
  $("jobError").textContent = "";
  if (native) {
    // Android 13+: the fixed notification needs permission to be shown.
    try {
      const p = await LocalNotifications.checkPermissions();
      if (p.display !== "granted") await LocalNotifications.requestPermissions();
    } catch {}
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        backgroundTitle: t("notifTitle"),
        backgroundMessage: t("notifText"),
        requestPermissions: true,
        stale: false,
        distanceFilter: 50,
      },
      (location, error) => {
        if (error) {
          if (error.code === "NOT_AUTHORIZED") {
            stopTracking();
            if (window.confirm(t("noPermission"))) BackgroundGeolocation.openSettings();
          }
          return;
        }
        onLocation(location);
      },
    );
  } else if (navigator.geolocation) {
    // Browser preview (for testing only; phones stop this when the screen is off).
    watcherId = navigator.geolocation.watchPosition(
      (p) => onLocation({ ...p.coords, time: p.timestamp }),
      () => ($("jobError").textContent = t("noPermission")),
      { enableHighAccuracy: true, maximumAge: 30000 },
    );
  }
  store.set("tracking", true);
  render();
}
async function stopTracking(silent) {
  if (watcherId !== null) {
    if (native) await BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
    else navigator.geolocation.clearWatch(watcherId);
  }
  watcherId = null;
  store.set("tracking", false);
  if (!silent) await flush();
  render();
}

// ---- Screen ----
const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString(lang, { dateStyle: "short", timeStyle: "short" }) : "—";
function render() {
  const on = watcherId !== null;
  $("setup").hidden = !!task;
  $("job").hidden = !task;
  if (!task) return;
  const s = task.shipment;
  $("driverName").textContent = task.driverName || "";
  $("title").textContent = s.title;
  $("route").textContent = `${s.origin} → ${s.destination}`;
  $("status").textContent = t(s.status);
  $("status").className = "badge " + s.status;
  $("trackState").textContent = on ? "● " + t("tracking") : "○ " + t("notTracking");
  $("trackState").className = "big-status " + (on ? "on" : "off");
  $("toggle").textContent = on ? t("stop") : t("start");
  $("toggle").className = "button huge " + (on ? "danger" : "");
  $("toggle").disabled = !["assigned", "transit", "arrived"].includes(s.status);
  $("lastPoint").textContent = lastPoint ? fmt(lastPoint.at) : "—";
  $("lastSent").textContent = fmt(store.get("lastSent", ""));
  $("queued").textContent = String(queue().length);
  $("dispatch").hidden = s.status !== "assigned";
  $("arrive").hidden = s.status !== "transit";
  $("fullPage").href = `${BASE}/driver#${token}`;
}

async function stageAction(action) {
  try {
    const body = lastPoint ? { action, lat: lastPoint.lat, lng: lastPoint.lng } : { action, location: "—" };
    await api("/driver-api/update", body);
    if (action === "dispatch" && watcherId === null) await startTracking();
    await loadTask();
  } catch (e) {
    $("jobError").textContent = e.status === 401 ? t("linkExpired") : navigator.onLine ? e.message : t("offline");
  }
}

// ---- Events ----
$("lang").addEventListener("change", (e) => {
  lang = e.target.value;
  store.set("lang", lang);
  applyLanguage();
});
$("paste").addEventListener("click", async () => {
  try {
    $("link").value = await navigator.clipboard.readText();
  } catch {
    $("link").focus();
  }
});
$("connect").addEventListener("click", async () => {
  const value = readToken($("link").value);
  $("setupError").textContent = "";
  if (!value) return ($("setupError").textContent = t("badLink"));
  token = value;
  try {
    await loadTask();
    store.set("token", token);
    store.set("queue", []);
  } catch (e) {
    token = "";
    task = null;
    $("setupError").textContent = e.status === 401 ? t("linkExpired") : navigator.onLine ? e.message : t("offline");
  }
});
$("toggle").addEventListener("click", () =>
  watcherId === null ? startTracking() : window.confirm(t("confirmStop")) && stopTracking(),
);
$("sendNow").addEventListener("click", flush);
$("dispatch").addEventListener("click", () => stageAction("dispatch"));
$("arrive").addEventListener("click", () => stageAction("arrive"));
$("logout").addEventListener("click", async () => {
  await stopTracking();
  token = "";
  task = null;
  store.set("token", "");
  render();
});
window.addEventListener("online", flush);
document.addEventListener("visibilitychange", () => !document.hidden && token && loadTask().catch(() => {}));

setInterval(flush, SEND_EVERY_MS);
// Standing still (e.g. queue at the crossing): resend the last point so the site does not think the phone died.
setInterval(() => {
  if (watcherId !== null && lastPoint && Date.now() - lastPointAt > HEARTBEAT_MS) {
    lastPointAt = Date.now();
    enqueue({ ...lastPoint, at: new Date().toISOString() });
  }
}, 60000);

// ---- Start ----
applyLanguage();
if (token)
  loadTask()
    .then(() => store.get("tracking", false) && startTracking())
    .catch((e) => {
      if (e.status === 401) {
        token = "";
        store.set("token", "");
        $("setupError").textContent = t("linkExpired");
      } else {
        // Offline at start: still show the job screen from what we know and keep tracking.
        task = { driverName: "", shipment: { title: "LogiBridge", origin: "", destination: "", status: "transit" } };
        if (store.get("tracking", false)) startTracking();
        render();
      }
    });
