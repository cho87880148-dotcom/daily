/* ============================================================
   오늘 — 날씨 + 로또 번호 뽑기
   외부 라이브러리를 하나도 쓰지 않습니다. 이 파일 하나가 전부입니다.
   ============================================================ */

/* ------------------------------------------------------------
   1. 날씨
   ------------------------------------------------------------ */

// 도시별 위경도. 다른 도시를 넣고 싶으면 여기에 한 줄 추가하고
// index.html 의 city-tabs 에도 버튼을 하나 넣으면 됩니다.
var CITIES = {
  seoul:   { name: '서울', lat: 37.5665, lon: 126.9780 },
  incheon: { name: '인천', lat: 37.4563, lon: 126.7052 },
  ansan:   { name: '안산', lat: 37.3219, lon: 126.8309 },
  busan:   { name: '부산', lat: 35.1796, lon: 129.0756 }
};

// 기상청이 쓰는 국제 날씨 코드(WMO)를 그림과 우리말로 바꿉니다
function weatherLook(code) {
  if (code === 0)                      return ['☀️', '맑음'];
  if (code === 1)                      return ['🌤️', '대체로 맑음'];
  if (code === 2)                      return ['⛅', '구름 조금'];
  if (code === 3)                      return ['☁️', '흐림'];
  if (code === 45 || code === 48)      return ['🌫️', '안개'];
  if (code >= 51 && code <= 57)        return ['🌦️', '이슬비'];
  if (code >= 61 && code <= 67)        return ['🌧️', '비'];
  if (code >= 71 && code <= 77)        return ['🌨️', '눈'];
  if (code >= 80 && code <= 82)        return ['🌦️', '소나기'];
  if (code === 85 || code === 86)      return ['🌨️', '소낙눈'];
  if (code >= 95)                      return ['⛈️', '천둥번개'];
  return ['🌡️', '—'];
}

var wxCache = {};   // 같은 도시를 다시 누르면 다시 안 부르게 저장해 둡니다

function loadWeather(key) {
  var city = CITIES[key];
  var nowBox = document.getElementById('wxNow');
  var weekBox = document.getElementById('wxWeek');

  if (wxCache[key]) { renderWeather(wxCache[key]); return; }

  nowBox.innerHTML = '<p class="wx-loading">날씨를 불러오는 중…</p>';
  weekBox.innerHTML = '';

  var url = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + city.lat + '&longitude=' + city.lon
    + '&current=temperature_2m,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&hourly=temperature_2m,weather_code,precipitation_probability'
    + '&timezone=Asia%2FSeoul&forecast_days=7';

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      wxCache[key] = data;
      renderWeather(data);
    })
    .catch(function () {
      nowBox.innerHTML = '<p class="wx-error">날씨를 못 불러왔습니다. 인터넷 연결을 확인하세요.</p>';
    });
}

function renderWeather(data) {
  var nowBox = document.getElementById('wxNow');
  var weekBox = document.getElementById('wxWeek');

  var look = weatherLook(data.current.weather_code);
  nowBox.innerHTML =
    '<div class="wx-icon">' + look[0] + '</div>' +
    '<div>' +
      '<div class="wx-temp">' + Math.round(data.current.temperature_2m) + '°</div>' +
      '<div class="wx-desc">' + look[1] + ' · 오늘 ' +
        Math.round(data.daily.temperature_2m_min[0]) + '° / ' +
        Math.round(data.daily.temperature_2m_max[0]) + '°</div>' +
    '</div>';

  var dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  var html = '';
  for (var i = 0; i < data.daily.time.length; i++) {
    var d = new Date(data.daily.time[i] + 'T00:00:00+09:00');
    var dow = d.getDay();
    var cls = dow === 0 ? ' is-sun' : (dow === 6 ? ' is-sat' : '');
    var lk = weatherLook(data.daily.weather_code[i]);
    var rain = data.daily.precipitation_probability_max[i];

    html += '<div class="wx-day" data-day="' + i + '">'
      + '<div class="wx-day-name' + cls + '">' + (i === 0 ? '오늘' : dayNames[dow]) + '</div>'
      + '<div class="wx-day-ico">' + lk[0] + '</div>'
      + '<div class="wx-day-hi">' + Math.round(data.daily.temperature_2m_max[i]) + '°</div>'
      + '<div class="wx-day-lo">' + Math.round(data.daily.temperature_2m_min[i]) + '°</div>'
      + '<div class="wx-day-rain">' + (rain >= 30 ? '💧' + rain + '%' : '') + '</div>'
      + '</div>';
  }
  weekBox.innerHTML = html;

  // 요일을 누르면 그날의 시간대별 날씨를 폅니다
  var dayEls = weekBox.querySelectorAll('.wx-day');
  for (var k = 0; k < dayEls.length; k++) {
    dayEls[k].addEventListener('click', function () {
      showHourly(data, parseInt(this.getAttribute('data-day'), 10));
    });
  }

  closeHourly();
}

/* ---- 시간대별 날씨 ---- */
function closeHourly() {
  document.getElementById('wxHourly').hidden = true;
  var opened = document.querySelectorAll('.wx-day.is-open');
  for (var i = 0; i < opened.length; i++) opened[i].classList.remove('is-open');
}

function showHourly(data, dayIndex) {
  var box = document.getElementById('wxHourly');
  var strip = document.getElementById('wxHourlyStrip');
  var title = document.getElementById('wxHourlyTitle');

  // 같은 날을 다시 누르면 닫습니다
  var already = document.querySelector('.wx-day[data-day="' + dayIndex + '"]');
  if (already && already.classList.contains('is-open')) { closeHourly(); return; }

  closeHourly();
  if (already) already.classList.add('is-open');

  var dateStr = data.daily.time[dayIndex];          // 'YYYY-MM-DD'
  var d = new Date(dateStr + 'T00:00:00+09:00');
  var dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  title.textContent = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ('
                    + dayNames[d.getDay()] + ') 시간대별';

  // 지금 몇 시인지 (오늘이면 현재 시각을 표시해 줍니다)
  var now = new Date();
  var nowKey = null;
  if (dayIndex === 0) {
    nowKey = dateStr + 'T' + ('0' + now.getHours()).slice(-2) + ':00';
  }

  var html = '';
  var firstNowAt = -1, shown = 0;
  for (var i = 0; i < data.hourly.time.length; i++) {
    var t = data.hourly.time[i];
    if (t.indexOf(dateStr) !== 0) continue;          // 그날 것만 고릅니다

    var hh = parseInt(t.slice(11, 13), 10);
    var lk = weatherLook(data.hourly.weather_code[i]);
    var rain = data.hourly.precipitation_probability[i];
    var isNow = (nowKey && t === nowKey);
    if (isNow) firstNowAt = shown;

    html += '<div class="wx-hour' + (isNow ? ' is-now' : '') + '">'
      + '<div class="wx-hour-t">' + (isNow ? '지금' : hh + '시') + '</div>'
      + '<div class="wx-hour-i">' + lk[0] + '</div>'
      + '<div class="wx-hour-d">' + Math.round(data.hourly.temperature_2m[i]) + '°</div>'
      + '<div class="wx-hour-r">' + (rain >= 30 ? '💧' + rain + '%' : '') + '</div>'
      + '</div>';
    shown++;
  }

  strip.innerHTML = html;
  box.hidden = false;

  // 오늘이면 현재 시각이 보이게 가로 위치를 맞춰줍니다
  strip.scrollLeft = firstNowAt > 1 ? (firstNowAt - 1) * 56 : 0;
}

document.getElementById('wxHourlyClose').addEventListener('click', closeHourly);

// 도시 탭
var tabs = document.querySelectorAll('.city-tab');
for (var t = 0; t < tabs.length; t++) {
  tabs[t].addEventListener('click', function () {
    for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('is-on');
    this.classList.add('is-on');
    var k = this.getAttribute('data-city');
    try { localStorage.setItem('city', k); } catch (e) {}
    loadWeather(k);
  });
}

// 지난번에 보던 도시를 기억합니다
var startCity = 'seoul';
try { if (localStorage.getItem('city') && CITIES[localStorage.getItem('city')]) startCity = localStorage.getItem('city'); } catch (e) {}
for (var t2 = 0; t2 < tabs.length; t2++) {
  tabs[t2].classList.toggle('is-on', tabs[t2].getAttribute('data-city') === startCity);
}
loadWeather(startCity);


/* ------------------------------------------------------------
   1-2. 지금 뜨는 검색어

   구글 트렌드(한국) 1~10위입니다. 네이버는 2021년에 실시간 검색어를
   완전히 없앴고 대체 API 도 열어두지 않아서, 지금 공짜로 받을 수 있는
   것 중에는 이게 가장 가깝습니다.

   브라우저가 다른 사이트 자료를 직접 못 읽게 막혀 있어서(CORS),
   fetch-trends.ps1 이 미리 받아 data/trends.json 으로 저장해 둡니다.
   ------------------------------------------------------------ */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/*
   "얼마나 묵은 자료인가" 를 사람 말로 바꿉니다.

   trends.json 의 updated 는 "2026-08-07 10:52" 처럼 한국시각으로 적혀 있습니다.
   폰 시계가 어느 나라로 맞춰져 있든 똑같이 계산되도록, 적힌 시각에서
   9시간을 빼서 세계표준시로 만든 뒤 비교합니다.
*/
function trendAge(updated) {
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(updated || '');
  if (!m) return '';

  var written = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]);
  var min = Math.floor((Date.now() - written) / 60000);

  if (min < 0) return '';           // 폰 시계가 어긋난 경우 — 엉뚱한 말 대신 아무것도 안 씁니다
  if (min < 2) return '방금';
  if (min < 60) return min + '분 전';
  if (min < 60 * 24) return Math.floor(min / 60) + '시간 전';
  return Math.floor(min / (60 * 24)) + '일 전';
}

var trendLoadedAt = 0;

function loadTrends() {
  trendLoadedAt = Date.now();

  return fetch('data/trends.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      var sub = document.getElementById('trendSub');
      var list = document.getElementById('trendList');
      if (!data || !data.items || !data.items.length) {
        sub.textContent = '아직 자료가 없습니다 — fetch-trends.ps1 을 한 번 실행하세요.';
        return;
      }

      // 앞의 연도는 빼고 "08-07 10:52" 처럼만 보여줍니다 (폰 화면이 좁아서)
      var when = String(data.updated).replace(/^\d{4}-/, '');
      var age = trendAge(data.updated);

      sub.textContent = when + (age ? ' (' + age + ')' : '') + ' · 구글 트렌드 한국';

      list.innerHTML = data.items.slice(0, 10).map(function (it, i) {
        var word = escapeHtml(it.word);
        var href = 'https://search.naver.com/search.naver?query=' + encodeURIComponent(it.word);
        return '<li class="trend-item">'
             + '<span class="trend-rank">' + (i + 1) + '</span>'
             + '<a class="trend-word" href="' + href + '" target="_blank" rel="noopener">' + word + '</a>'
             + (it.hits ? '<span class="trend-hit">' + escapeHtml(it.hits) + '</span>' : '')
             + '</li>';
      }).join('');
    })
    .catch(function () {
      document.getElementById('trendSub').textContent = '검색어를 못 불러왔습니다.';
    });
}

loadTrends();

/*
   ★ 앱을 다시 켤 때 검색어를 새로 읽습니다.

   아이폰은 홈 화면 앱을 껐다 켜도 새로 여는 게 아니라 재워둔 화면을 그대로
   깨웁니다. 그래서 위 loadTrends() 가 다시 안 돌고, 서버에 새 검색어가 있어도
   몇 시간 전 화면이 그대로 보였습니다 (2026-08-07 확인).

   visibilitychange 는 앱으로 돌아올 때, pageshow(persisted) 는 뒤로가기로
   되살아날 때 각각 불립니다. 폰마다 둘 중 하나만 오는 경우가 있어 둘 다 답니다.
   1분 안에 이미 읽었으면 건너뜁니다 — 화면을 몇 번 오갈 때마다 부르지 않으려는 것입니다.
*/
function refreshTrendsIfStale() {
  if (Date.now() - trendLoadedAt < 60000) return;
  loadTrends();
}

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible') refreshTrendsIfStale();
});

window.addEventListener('pageshow', function (e) {
  if (e.persisted) refreshTrendsIfStale();
});


/* ------------------------------------------------------------
   2. 로또
   ------------------------------------------------------------ */

// 공 색은 실제 추첨 공과 같은 규칙입니다
function ballColor(n) {
  if (n <= 10) return 'var(--ball-1)';
  if (n <= 20) return 'var(--ball-11)';
  if (n <= 30) return 'var(--ball-21)';
  if (n <= 40) return 'var(--ball-31)';
  return 'var(--ball-41)';
}

function ballHtml(n, extraClass) {
  return '<div class="ball ' + (extraClass || '') + '" style="background:' + ballColor(n) + '">' + n + '</div>';
}

// 역대 당첨 자료. fetch-draws.ps1 이 만들어 줍니다.
// 파일이 아직 없어도 앱은 그대로 돌아갑니다 (아래 기본값을 씁니다).
var HISTORY = null;
var SUM_MIN = 100, SUM_MAX = 175;   // 역대 1등 합계가 대부분 들어가는 구간

// 1~45 중 서로 다른 6개를 고릅니다
function pick6() {
  var pool = [];
  for (var i = 1; i <= 45; i++) pool.push(i);
  // 뒤에서부터 무작위로 골라 앞과 바꿉니다 (피셔-예이츠 섞기)
  for (var k = pool.length - 1; k > 0; k--) {
    var r = Math.floor(Math.random() * (k + 1));
    var tmp = pool[k]; pool[k] = pool[r]; pool[r] = tmp;
  }
  return pool.slice(0, 6).sort(function (a, b) { return a - b; });
}

function sumOf(ns)  { var s = 0; for (var i = 0; i < ns.length; i++) s += ns[i]; return s; }
function highOf(ns) { var c = 0; for (var i = 0; i < ns.length; i++) if (ns[i] >= 32) c++; return c; }
function oddOf(ns)  { var c = 0; for (var i = 0; i < ns.length; i++) if (ns[i] % 2 === 1) c++; return c; }
function bigOf(ns)  { var c = 0; for (var i = 0; i < ns.length; i++) if (ns[i] >= 23) c++; return c; }

// 1~10 / 11~20 / 21~30 / 31~40 / 41~45 다섯 구간 중 몇 곳에 걸쳐 있는지
function zonesOf(ns) {
  var z = {};
  for (var i = 0; i < ns.length; i++) z[Math.min(Math.floor((ns[i] - 1) / 10), 4)] = 1;
  return Object.keys(z).length;
}

// 가장 긴 연속 구간의 길이 (예: 12,13,14 가 있으면 3)
function maxRunOf(ns) {
  var best = 1, run = 1;
  for (var i = 1; i < ns.length; i++) {
    run = (ns[i] === ns[i - 1] + 1) ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

// 끝자리가 같은 번호의 최대 개수 (예: 3,13,23 이면 3)
function maxTailOf(ns) {
  var t = {}, best = 0;
  for (var i = 0; i < ns.length; i++) {
    var k = ns[i] % 10;
    t[k] = (t[k] || 0) + 1;
    if (t[k] > best) best = t[k];
  }
  return best;
}

/*
   ── 뽑기 기준 ──────────────────────────────────────────────
   "한쪽으로 쏠리지 않는 조합" 을 만드는 것이 목표입니다.
   아래 조건을 전부 만족할 때까지 다시 뽑습니다.

   1) 다섯 구간 중 최소 3구간에 걸칠 것      — 한 구간 몰림 방지
   2) 홀짝이 2:4 ~ 4:2 일 것                 — 홀 또는 짝 쏠림 방지
   3) 낮은수(1~22)·높은수(23~45) 각 2개 이상 — 앞뒤 쏠림 방지
   4) 여섯 수의 합이 역대 중앙 구간일 것      — 극단적으로 작거나 큰 합 방지
   5) 3개 이상 연속되지 않을 것              — 5,6,7 같은 줄번호 방지
   6) 같은 끝자리가 3개 이상이 아닐 것        — 3,13,23 같은 쏠림 방지
   7) 32 이상이 최소 1개 있을 것             — 아래 설명 참고

   ★ 정직하게: 1~6번은 조합의 "모양"을 고르게 만들 뿐 당첨 확률은
     전혀 올리지 않습니다. 어떤 여섯 숫자든 당첨 확률은 완전히 같습니다.
     7번만 성격이 다릅니다 — 확률이 아니라 당첨됐을 때 나눠 갖는
     인원을 줄여서 실수령액을 올립니다. 다만 여기서는 다른 조건들과
     균형을 맞추려고 "최소 1개" 로만 걸어두었습니다.
   ────────────────────────────────────────────────────────── */
function drawSmart() {
  for (var tries = 0; tries < 1500; tries++) {
    var n = pick6();

    if (zonesOf(n) < 3) continue;

    var o = oddOf(n);
    if (o < 2 || o > 4) continue;

    var b = bigOf(n);
    if (b < 2 || b > 4) continue;

    var s = sumOf(n);
    if (s < SUM_MIN || s > SUM_MAX) continue;

    if (maxRunOf(n) >= 3) continue;
    if (maxTailOf(n) >= 3) continue;
    if (highOf(n) < 1) continue;

    return n;
  }
  return pick6();   // 여기까지 올 일은 사실상 없지만 안전장치입니다
}

// 보너스 번호는 본 번호 6개를 뺀 나머지에서 하나
function drawBonus(main) {
  while (true) {
    var b = Math.floor(Math.random() * 45) + 1;
    if (main.indexOf(b) === -1) return b;
  }
}

/* ============================================================
   통 안의 숫자공 45개 — 진짜 물리 계산으로 움직입니다.

   CSS 애니메이션은 "A 에서 B 까지" 정해진 길을 반복할 수밖에 없어서
   아무리 값을 흩어놔도 결국 같은 왕복으로 보입니다.
   그래서 매 프레임 위치를 직접 계산합니다:

     · 공마다 속도와 방향을 따로 갖습니다
     · 매 프레임 무작위 바람을 넣습니다  ← 이것 때문에 길이 반복되지 않습니다
     · 유리벽에 닿으면 튕겨 나옵니다 (원형이라 법선 방향으로 반사)
     · 공끼리 부딪히면 서로 밀어내고 속도를 주고받습니다

   추첨 중에는 목표 속도만 올립니다. 움직이는 방식은 그대로라
   "돌아가던 상태 그대로" 공이 빠져나갑니다.
   ============================================================ */
var MINI_R    = 10;      // 공 반지름 (CSS 20px 의 절반)
var SPEED_IDLE = 0.55;   // 평소 속도 (픽셀/프레임)
var SPEED_SPIN = 3.4;    // 추첨 중 속도

var physBalls  = [];
var physRaf    = null;
var physSpeed  = SPEED_IDLE;
var physTarget = SPEED_IDLE;

// 움직임을 불편해하는 설정을 켠 분에게는 물리 계산을 돌리지 않습니다
var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function drumRadius() {
  var el = document.getElementById('drum');
  return (el && el.clientWidth ? el.clientWidth : 248) / 2;
}

function fillMachine() {
  var box = document.getElementById('machineBalls');
  box.innerHTML = '';
  physBalls = [];

  var R = drumRadius();
  var inner = R - MINI_R - 3;          // 유리 두께만큼 안쪽까지만
  var frag = document.createDocumentFragment();

  for (var n = 1; n <= 45; n++) {
    var el = document.createElement('div');
    el.className = 'mini';
    el.setAttribute('data-n', n);
    el.style.background = ballColor(n);
    el.textContent = n;
    frag.appendChild(el);

    // 서로 겹치지 않는 자리를 찾습니다
    var x = R, y = R, ok = false;
    for (var t = 0; t < 150 && !ok; t++) {
      var a = Math.random() * Math.PI * 2;
      var r = Math.sqrt(Math.random()) * inner;
      x = R + Math.cos(a) * r;
      y = R + Math.sin(a) * r;
      ok = true;
      for (var j = 0; j < physBalls.length; j++) {
        var ddx = physBalls[j].x - x, ddy = physBalls[j].y - y;
        if (ddx * ddx + ddy * ddy < 4 * MINI_R * MINI_R) { ok = false; break; }
      }
    }

    var dir = Math.random() * Math.PI * 2;
    var sp0 = SPEED_IDLE * (0.5 + Math.random());
    physBalls.push({
      el: el, x: x, y: y,
      vx: Math.cos(dir) * sp0,
      vy: Math.sin(dir) * sp0,
      rot: Math.random() * 360,
      vr: Math.random() * 1.2 - 0.6
    });
  }

  box.appendChild(frag);
  paintBalls();
  if (!reduceMotion) startPhysics();
}

function paintBalls() {
  for (var i = 0; i < physBalls.length; i++) {
    var b = physBalls[i];
    b.el.style.transform = 'translate3d(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px,0)'
                         + ' rotate(' + b.rot.toFixed(0) + 'deg)';
  }
}

function physStep() {
  var R = drumRadius();
  var inner = R - MINI_R - 3;
  var i, j, b;

  // 목표 속도로 서서히 따라갑니다 (갑자기 확 빨라지면 어색합니다)
  physSpeed += (physTarget - physSpeed) * 0.05;
  var turb = physSpeed * 0.55;          // 바람의 세기
  var vMax = physSpeed * 1.6;
  var vMin = physSpeed * 0.35;

  for (i = 0; i < physBalls.length; i++) {
    b = physBalls[i];

    // ① 무작위 바람 — 매 프레임 방향이 조금씩 틀어져 같은 길을 안 돕니다
    b.vx += (Math.random() - 0.5) * turb;
    b.vy += (Math.random() - 0.5) * turb;

    // ② 마찰
    b.vx *= 0.985;
    b.vy *= 0.985;

    // ③ 너무 빠르거나 느려지지 않게 잡아줍니다
    var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
    if (sp > vMax)          { b.vx = b.vx / sp * vMax; b.vy = b.vy / sp * vMax; }
    else if (sp < vMin && sp > 0.0001) { b.vx = b.vx / sp * vMin; b.vy = b.vy / sp * vMin; }

    b.x += b.vx;
    b.y += b.vy;
    b.rot += b.vr * (physSpeed / SPEED_IDLE);

    // ④ 둥근 유리벽에 튕기기
    var dx = b.x - R, dy = b.y - R;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > inner && d > 0) {
      var nx = dx / d, ny = dy / d;
      b.x = R + nx * inner;
      b.y = R + ny * inner;
      var dot = b.vx * nx + b.vy * ny;
      b.vx = (b.vx - 2 * dot * nx) * 0.88;
      b.vy = (b.vy - 2 * dot * ny) * 0.88;
      b.vr = Math.random() * 2.4 - 1.2;      // 부딪히면 회전이 바뀝니다
    }
  }

  // ⑤ 공끼리 부딪히기
  var minD = MINI_R * 2;
  for (i = 0; i < physBalls.length; i++) {
    for (j = i + 1; j < physBalls.length; j++) {
      var a = physBalls[i], c = physBalls[j];
      var ex = c.x - a.x, ey = c.y - a.y;
      var d2 = ex * ex + ey * ey;
      if (d2 >= minD * minD || d2 < 0.0001) continue;

      var dd = Math.sqrt(d2);
      var ux = ex / dd, uy = ey / dd;
      var push = (minD - dd) / 2;

      a.x -= ux * push; a.y -= uy * push;
      c.x += ux * push; c.y += uy * push;

      // 서로 다가오고 있을 때만 속도를 주고받습니다
      var p = (a.vx - c.vx) * ux + (a.vy - c.vy) * uy;
      if (p > 0) {
        a.vx -= p * ux; a.vy -= p * uy;
        c.vx += p * ux; c.vy += p * uy;
      }
    }
  }

  paintBalls();
  physRaf = requestAnimationFrame(physStep);
}

function startPhysics() {
  if (physRaf || reduceMotion) return;
  physRaf = requestAnimationFrame(physStep);
}
function stopPhysics() {
  if (physRaf) { cancelAnimationFrame(physRaf); physRaf = null; }
}

// 다른 탭에 가 있을 때는 계산을 멈춥니다 (배터리 아끼기)
document.addEventListener('visibilitychange', function () {
  if (document.hidden) stopPhysics(); else startPhysics();
});

// 뽑힌 공을 통에서 빼냅니다 — 나머지 공들은 계속 돌아갑니다
function popFromMachine(n) {
  for (var i = 0; i < physBalls.length; i++) {
    if (physBalls[i].el.getAttribute('data-n') === String(n)) {
      var b = physBalls[i];
      physBalls.splice(i, 1);                      // 물리 계산에서 빼고
      b.el.classList.add('is-out');
      b.el.style.transform = 'translate3d(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px,0) scale(.2)';
      setTimeout(function () { if (b.el.parentNode) b.el.parentNode.removeChild(b.el); }, 340);
      return;
    }
  }
}

/* ---- 뽑기 진행 ---- */
var drawing = false;

function runDraw() {
  if (drawing) return;
  drawing = true;

  var btn = document.getElementById('drawBtn');
  var tray = document.getElementById('tray');
  var meta = document.getElementById('drawMeta');
  var why = document.getElementById('why');
  var idle = document.getElementById('machineIdle');

  btn.disabled = true;
  btn.textContent = '추첨 중…';
  tray.innerHTML = '';
  meta.textContent = '';
  why.hidden = true;
  idle.style.display = 'none';

  fillMachine();                                        // 45개를 다시 채우고
  document.getElementById('machine').classList.add('is-spinning');   // 배출구에 불이 들어옵니다
  physTarget = SPEED_SPIN;                              // 공들이 세차게 돌아갑니다

  var main = drawSmart();
  var bonus = drawBonus(main);

  // 통이 한 번 돌아간 뒤에 첫 공이 나오게 잠깐 기다립니다
  setTimeout(function () {
    var i = 0;
    var timer = setInterval(function () {
      if (i < 6) {
        popFromMachine(main[i]);
        tray.insertAdjacentHTML('beforeend', ballHtml(main[i]));
        i++;
        return;
      }
      // 6개가 다 나오면 보너스
      clearInterval(timer);
      setTimeout(function () {
        popFromMachine(bonus);
        tray.insertAdjacentHTML('beforeend', '<span class="plus">+</span>');
        tray.insertAdjacentHTML('beforeend', ballHtml(bonus, 'is-bonus'));
        tray.insertAdjacentHTML('beforeend', '<p class="bonus-tag">마지막 하나가 보너스 번호입니다</p>');
        finishDraw(main, bonus);
      }, 620);
    }, 760);
  }, 700);
}

function finishDraw(main, bonus) {
  var btn = document.getElementById('drawBtn');
  var meta = document.getElementById('drawMeta');
  var why = document.getElementById('why');
  var whyList = document.getElementById('whyList');
  var idle = document.getElementById('machineIdle');

  var s = sumOf(main), h = highOf(main), o = oddOf(main);
  var b = bigOf(main), z = zonesOf(main);

  meta.textContent = '합계 ' + s + ' · 홀 ' + o + ':' + (6 - o) + ' 짝 · 구간 ' + z + '곳 · 32↑ ' + h + '개';

  whyList.innerHTML =
    '<li>다섯 구간 중 <strong>' + z + '곳</strong>에 걸쳐 있습니다 — 한 구간에 몰리지 않았습니다.</li>' +
    '<li>홀수 ' + o + ' : 짝수 ' + (6 - o) + ' , 낮은수 ' + (6 - b) + ' : 높은수 ' + b + ' 로 양쪽이 균형입니다.</li>' +
    '<li>여섯 수의 합이 <strong>' + s + '</strong> 입니다 — 역대 1등이 주로 나온 ' + SUM_MIN + '~' + SUM_MAX + ' 구간 안입니다.</li>' +
    '<li>3개 이상 연속된 번호도, 끝자리가 3개 이상 겹치는 번호도 없습니다.</li>' +
    '<li>32 이상을 ' + h + '개 넣었습니다 — 당첨될 경우 <strong>나눠 갖는 인원이 줄어듭니다.</strong></li>' +
    '<li style="color:var(--warn)">위 조건은 조합의 <strong>모양을 고르게 맞춘 것</strong>입니다. 마지막 항목을 빼면 <strong>당첨 확률은 아무 번호나 찍은 것과 완전히 같습니다.</strong></li>';
  why.hidden = false;

  // 통은 그대로 두고 속도만 원래대로 낮춥니다 (뽑힌 7개는 빠진 상태로 계속 돕니다)
  document.getElementById('machine').classList.remove('is-spinning');
  physTarget = SPEED_IDLE;
  idle.style.display = '';
  idle.textContent = '다시 누르면 새로 뽑습니다';

  btn.disabled = false;
  btn.textContent = '다시 뽑기';
  drawing = false;
}

document.getElementById('drawBtn').addEventListener('click', runDraw);

// 처음 열었을 때부터 통에 45개가 들어 있게 합니다
fillMachine();


/* ------------------------------------------------------------
   3. 역대 통계 (data/draws.json 이 있을 때만 보입니다)
   ------------------------------------------------------------ */
fetch('data/draws.json')
  .then(function (r) { return r.ok ? r.json() : null; })
  .then(function (data) {
    if (!data || !data.draws || data.draws.length < 50) return;
    HISTORY = data;

    // 역대 1등 합계의 가운데 90% 구간을 실제 자료에서 구해 씁니다
    var sums = data.draws.map(function (d) { return sumOf(d.nums); }).sort(function (a, b) { return a - b; });
    SUM_MIN = sums[Math.floor(sums.length * 0.05)];
    SUM_MAX = sums[Math.floor(sums.length * 0.95)];

    renderStats(data);
  })
  .catch(function () { /* 자료가 없으면 통계만 안 보이고 나머지는 그대로 돌아갑니다 */ });

function renderStats(data) {
  var count = {}, last = {};
  for (var n = 1; n <= 45; n++) { count[n] = 0; last[n] = 0; }

  for (var i = 0; i < data.draws.length; i++) {
    var d = data.draws[i];
    for (var j = 0; j < d.nums.length; j++) {
      count[d.nums[j]]++;
      if (d.no > last[d.nums[j]]) last[d.nums[j]] = d.no;
    }
  }

  var all = [];
  for (var k = 1; k <= 45; k++) all.push({ n: k, c: count[k], last: last[k] });

  var hot = all.slice().sort(function (a, b) { return b.c - a.c; }).slice(0, 8);
  var cold = all.slice().sort(function (a, b) { return a.last - b.last; }).slice(0, 8);

  document.getElementById('statSub').textContent =
    '1회 ~ ' + data.latest + '회, 총 ' + data.draws.length + '회분';

  document.getElementById('statHot').innerHTML = hot.map(function (x) {
    return '<div class="stat-item">' + ballHtml(x.n) + '<div class="stat-cnt">' + x.c + '회</div></div>';
  }).join('');

  document.getElementById('statCold').innerHTML = cold.map(function (x) {
    return '<div class="stat-item">' + ballHtml(x.n) + '<div class="stat-cnt">' + (data.latest - x.last) + '회 전</div></div>';
  }).join('');

  document.getElementById('statCard').hidden = false;
}


/* ------------------------------------------------------------
   4. 오늘 날짜 + 오프라인 준비
   ------------------------------------------------------------ */
(function () {
  var d = new Date();
  var days = ['일', '월', '화', '수', '목', '금', '토'];
  document.getElementById('today').textContent =
    d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + days[d.getDay()] + '요일';
})();

// 인터넷이 끊겨도 앱이 열리게 해주는 부분입니다.
// https 또는 localhost 에서만 동작하고, 안 되더라도 앱은 정상입니다.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
