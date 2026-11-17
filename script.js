/* =========================================================
   کتاب‌خانه — Premium Persian Bookstore
   Vanilla JavaScript · GitHub Pages ready
   ---------------------------------------------------------
   حالت‌ها:
   • نمایشی (پیش‌فرض): داده‌ها، حساب و سفارش‌ها در localStorage
   • سروری: با تنظیم window.KETABKHANEH_API روی API نسخه PHP
     (پوشه production) همان رابط کاربری به سرور وصل می‌شود.
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. تنظیمات و ابزارها
  --------------------------------------------------------- */
  const CONFIG = {
    apiBase: (window.KETABKHANEH_API || '').replace(/\/$/, ''),
    freeShippingFrom: 500000,
    shippingMethods: [
      { id: 'post', label: 'پست پیشتاز', cost: 45000, note: '۲ تا ۴ روز کاری' },
      { id: 'tipax', label: 'تیپاکس (پس‌کرایه)', cost: 75000, note: '۱ تا ۳ روز کاری' },
      { id: 'pickup', label: 'تحویل حضوری در فروشگاه', cost: 0, note: 'تهران، خیابان کتاب' }
    ],
    keys: { cart: 'kk_cart_v1', users: 'kk_users_v1', session: 'kk_session_v1', orders: 'kk_orders_v1', addresses: 'kk_addresses_v1', coupons: 'kk_coupons_v1', messages: 'kk_messages_v1' }
  };
  const API_MODE = !!CONFIG.apiBase;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const faDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  const faNum = (n) => Number(n || 0).toLocaleString('fa-IR');
  const money = (n) => faNum(Math.round(Number(n) || 0)) + ' تومان';
  const toEnDigits = (s) => String(s).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const uid = () => Math.random().toString(36).slice(2, 9);

  const store = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { toast('ذخیره‌سازی مرورگر در دسترس نیست.', 'error'); return false; }
    },
    del(key) { try { localStorage.removeItem(key); } catch (e) {} }
  };

  /* ---------------------------------------------------------
     2. داده‌های کتاب‌خانه (داده نمونه)
  --------------------------------------------------------- */
  const CATEGORIES = [
    { slug: 'novel', title: 'رمان و داستان', desc: 'داستان‌های ماندگار ایرانی و جهان', glow: 'rgba(75,145,255,.22)', soft: 'rgba(75,145,255,.10)', icon: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M8 8h8M8 12h5"/></svg>' },
    { slug: 'psych', title: 'روان‌شناسی', desc: 'شناخت ذهن، احساس و رفتار', glow: 'rgba(231,185,87,.22)', soft: 'rgba(231,185,87,.09)', icon: '<svg viewBox="0 0 24 24"><path d="M12 4a5 5 0 0 1 5 5c0 2-1 3-1 4.5V17H8v-3.5C8 12 7 11 7 9a5 5 0 0 1 5-5z"/><path d="M9 20h6M12 4V2.5"/></svg>' },
    { slug: 'science', title: 'علمی و آموزشی', desc: 'دانش، فناوری و جهان پیرامون', glow: 'rgba(47,191,138,.2)', soft: 'rgba(47,191,138,.08)', icon: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.4"/></svg>' },
    { slug: 'history', title: 'تاریخی', desc: 'سرگذشت ایران و جهان', glow: 'rgba(240,138,93,.22)', soft: 'rgba(240,138,93,.08)', icon: '<svg viewBox="0 0 24 24"><path d="M4 21V6l8-3 8 3v15"/><path d="M8 21v-6h8v6M4 9h16"/></svg>' },
    { slug: 'kids', title: 'کودک و نوجوان', desc: 'قصه‌هایی برای خیال‌پردازی', glow: 'rgba(75,145,255,.2)', soft: 'rgba(75,145,255,.08)', icon: '<svg viewBox="0 0 24 24"><path d="M12 5c-2-1.6-5-1.6-7 0v13c2-1.6 5-1.6 7 0 2-1.6 5-1.6 7 0V5c-2-1.6-5-1.6-7 0z"/><path d="M12 5v13"/></svg>' },
    { slug: 'philosophy', title: 'فلسفه و اندیشه', desc: 'پرسش‌های بنیادین انسان', glow: 'rgba(231,185,87,.24)', soft: 'rgba(231,185,87,.09)', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>' },
    { slug: 'success', title: 'موفقیت و توسعه فردی', desc: 'عادت‌ها، هدف‌ها و رشد', glow: 'rgba(47,191,138,.22)', soft: 'rgba(47,191,138,.08)', icon: '<svg viewBox="0 0 24 24"><path d="M4 19h16M7 19V9l5-5 5 5v10"/><path d="M12 4v15"/></svg>' },
    { slug: 'persian', title: 'ادبیات فارسی', desc: 'شعر و نثر کلاسیک ایران', glow: 'rgba(240,138,93,.2)', soft: 'rgba(240,138,93,.08)', icon: '<svg viewBox="0 0 24 24"><path d="M20 4c-7 0-13 4-13 11v5"/><path d="M7 20c-1-4 1-8 5-10"/><path d="M20 4c0 6-3 9-7 9"/></svg>' }
  ];

  const COVER_PALETTES = [
    { c1: '#1E3D6E', c2: '#0A1424' },
    { c1: '#2A4C86', c2: '#0D1730' },
    { c1: '#4A3A1C', c2: '#131024' },
    { c1: '#153A4E', c2: '#081520' },
    { c1: '#3B2440', c2: '#110E1E' },
    { c1: '#164038', c2: '#08181A' }
  ];
  const ORNAMENTS = [
    '<svg viewBox="0 0 40 40"><path d="M20 4l4.6 10.6L36 20l-11.4 5.4L20 36l-4.6-10.6L4 20l11.4-5.4z"/></svg>',
    '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13"/><path d="M20 7v26M7 20h26"/></svg>',
    '<svg viewBox="0 0 40 40"><path d="M20 5c6 6 9 10 9 15a9 9 0 0 1-18 0c0-5 3-9 9-15z"/></svg>',
    '<svg viewBox="0 0 40 40"><path d="M8 33V13l12-6 12 6v20"/><path d="M14 33V19l6-3 6 3v14"/></svg>',
    '<svg viewBox="0 0 40 40"><rect x="8" y="8" width="24" height="24" rx="5"/><path d="M8 16h24M16 8v24"/></svg>'
  ];

  const BOOKS = [
    { id: 'bof-kur', title: 'بوف کور', author: 'صادق هدایت', publisher: 'نشر امیرکبیر', category: 'novel', price: 185000, off: 10, pages: 148, year: 1402, isbn: '978-964-00-0001-1', stock: 12, date: '2026-09-14', rank: 3, pal: 4, orn: 0, desc: 'بوف کور، مشهورترین رمان صادق هدایت، روایتی سوررئال از تنهایی، اضطراب و جست‌وجوی معناست. این رمان کوتاه از تأثیرگذارترین آثار ادبیات مدرن فارسی به شمار می‌رود و همچنان خوانندگان تازه‌ای پیدا می‌کند.' },
    { id: 'savushun', title: 'سووشون', author: 'سیمین دانشور', publisher: 'انتشارات خوارزمی', category: 'novel', price: 320000, off: 0, pages: 312, year: 1401, isbn: '978-964-00-0002-8', stock: 8, date: '2026-05-02', rank: 2, pal: 0, orn: 1, desc: 'سووشون نخستین رمان فارسی نوشته‌شده به قلم یک زن است؛ روایتی از شیراز در سال‌های اشغال ایران و زندگی زری، زنی که در میانه سنت و مدرنیته ایستاده است.' },
    { id: 'kelidar-1', title: 'کلیدر (جلد اول)', author: 'محمود دولت‌آبادی', publisher: 'نشر چشمه', category: 'novel', price: 480000, off: 15, pages: 640, year: 1401, isbn: '978-964-00-0003-5', stock: 6, date: '2026-10-01', rank: 5, pal: 2, orn: 2, desc: 'جلد اول از رمان ده‌جلدی کلیدر، حماسه‌ای از زندگی ایل و روستا در خراسان. دولت‌آبادی در این اثر زبان و زندگی مردم کویر را به تصویر می‌کشد.' },
    { id: 'cheraghha', title: 'چراغ‌ها را من خاموش می‌کنم', author: 'زویا پیرزاد', publisher: 'نشر مرکز', category: 'novel', price: 265000, off: 0, pages: 268, year: 1402, isbn: '978-964-00-0004-2', stock: 11, date: '2026-07-19', rank: 6, pal: 1, orn: 3, desc: 'روایت زندگی روزمره یک زن خانه‌دار در آبادان دهه چهل؛ داستانی آرام و دقیق از خواستن، رضایت و رهایی.' },
    { id: 'modir-modrese', title: 'مدیر مدرسه', author: 'جلال آل‌احمد', publisher: 'انتشارات فردوس', category: 'novel', price: 165000, off: 0, pages: 190, year: 1400, isbn: '978-964-00-0005-9', stock: 0, date: '2025-11-11', rank: 12, pal: 3, orn: 4, desc: 'مدیر مدرسه با زبانی طنزآمیز و نقدی اجتماعی، روزگار یک معلم و مدیر مدرسه در نظام آموزشی دهه سی را روایت می‌کند.' },
    { id: 'melat-eshgh', title: 'ملت عشق', author: 'الیف شافاک', publisher: 'نشر ققنوس', category: 'novel', price: 395000, off: 20, pages: 512, year: 1402, isbn: '978-964-00-0006-6', stock: 9, date: '2026-08-08', rank: 4, pal: 5, orn: 0, desc: 'دو روایت موازی از شمس و مولانا و زندگی زنی امروزی؛ داستانی درباره عشق، تحول و پذیرش.' },
    { id: 'ensan-mana', title: 'انسان در جست‌وجوی معنا', author: 'ویکتور فرانکل', publisher: 'انتشارات درسا', category: 'psych', price: 215000, off: 10, pages: 232, year: 1401, isbn: '978-964-00-0007-3', stock: 14, date: '2026-04-21', rank: 7, pal: 3, orn: 1, desc: 'فرانکل، روان‌پزشک اتریشی، بر پایه تجربه خود در اردوگاه‌های نازی، معنادرمانی را معرفی می‌کند: توان انسان برای یافتن معنا حتی در سخت‌ترین شرایط.' },
    { id: 'ghodrat-aknun', title: 'قدرت اکنون', author: 'اکهارت تله', publisher: 'انتشارات کیمیا', category: 'psych', price: 248000, off: 0, pages: 288, year: 1400, isbn: '978-964-00-0008-0', stock: 7, date: '2026-02-12', rank: 11, pal: 1, orn: 2, desc: 'کتابی درباره حضور در لحظه و رهایی از ذهن پرگویی که گذشته و آینده را جای حال می‌نشاند.' },
    { id: 'vaghti-nietzsche', title: 'وقتی نیچه گریست', author: 'اروین یالوم', publisher: 'نشر کارنامه', category: 'psych', price: 375000, off: 12, pages: 420, year: 1401, isbn: '978-964-00-0009-7', stock: 5, date: '2026-06-30', rank: 8, pal: 4, orn: 3, desc: 'روایتی تخیلی از گفت‌وگوی درمانی میان یوزف برویر و فریدریش نیچه؛ اثری درباره فقدان، پذیرش و شفافیت احساسات.' },
    { id: 'shahnameh', title: 'شاهنامه (دوره کامل)', author: 'فردوسی', publisher: 'نشر هرمس', category: 'persian', price: 690000, off: 25, pages: 1080, year: 1402, isbn: '978-964-00-0010-3', stock: 4, date: '2026-09-02', rank: 1, pal: 2, orn: 0, desc: 'حماسه ملی ایران با تصحیح معتبر و کاغذ تحریر؛ روایت پهلوانان، پادشاهان و اسطوره‌های ایرانی از آغاز تا پایان.' },
    { id: 'masnavi', title: 'مثنوی معنوی', author: 'مولانا', publisher: 'نشر امیرکبیر', category: 'persian', price: 540000, off: 0, pages: 880, year: 1401, isbn: '978-964-00-0011-0', stock: 3, date: '2026-03-08', rank: 9, pal: 5, orn: 1, desc: 'مثنوی معنوی، اثر سترگ مولانا جلال‌الدین بلخی، مجموعه‌ای از حکایت‌ها و اندیشه‌های عرفانی که قرن‌ها خوانده و شرح شده است.' },
    { id: 'golestan', title: 'گلستان سعدی', author: 'سعدی', publisher: 'انتشارات خوارزمی', category: 'persian', price: 195000, off: 15, pages: 240, year: 1400, isbn: '978-964-00-0012-7', stock: 18, date: '2026-01-25', rank: 13, pal: 3, orn: 2, desc: 'گلستان، مجموعه حکایت‌ها و پندهای سعدی شیرازی، با نثری آهنگین و تصویری که هنوز تازه است.' },
    { id: 'divan-hafez', title: 'دیوان حافظ', author: 'حافظ', publisher: 'نشر ققنوس', category: 'persian', price: 385000, off: 0, pages: 512, year: 1401, isbn: '978-964-00-0013-4', stock: 10, date: '2026-07-01', rank: 10, pal: 1, orn: 3, desc: 'دیوان حافظ با غزل‌های جاودانه‌ای درباره عشق، رندی و امید؛ همراه با شرح واژه‌ها برای خوانندگان امروز.' },
    { id: 'tarikh-bastan', title: 'تاریخ ایران باستان', author: 'حسن پیرنیا', publisher: 'نشر اساطیر', category: 'history', price: 620000, off: 18, pages: 720, year: 1400, isbn: '978-964-00-0014-1', stock: 5, date: '2026-08-22', rank: 14, pal: 2, orn: 4, desc: 'پژوهشی کلاسیک درباره تاریخ ایران پیش از اسلام؛ از ماد و هخامنشی تا اشکانی و ساسانی.' },
    { id: 'tarikh-tamadon-1', title: 'تاریخ تمدن (جلد اول)', author: 'ویل دورانت', publisher: 'علمی و فرهنگی', category: 'history', price: 780000, off: 0, pages: 920, year: 1402, isbn: '978-964-00-0015-8', stock: 2, date: '2026-06-11', rank: 15, pal: 4, orn: 0, desc: 'جلد نخست از مجموعه تاریخ تمدن، درباره مشرق‌زمین و شکل‌گیری نخستین تمدن‌های انسانی.' },
    { id: 'tarikhche-zaman', title: 'تاریخچه زمان', author: 'استیون هاوکینگ', publisher: 'نشر نو', category: 'science', price: 310000, off: 0, pages: 256, year: 1401, isbn: '978-964-00-0016-5', stock: 13, date: '2026-05-27', rank: 16, pal: 3, orn: 1, desc: 'از انفجار بزرگ تا سیاه‌چاله‌ها؛ هاوکینگ کیهان را برای خواننده غیرمتخصص روایت می‌کند.' },
    { id: 'jahan-pust-gerdu', title: 'جهان در پوست گردو', author: 'استیون هاوکینگ', publisher: 'نشر نو', category: 'science', price: 285000, off: 10, pages: 224, year: 1400, isbn: '978-964-00-0017-2', stock: 9, date: '2026-04-05', rank: 17, pal: 5, orn: 2, desc: 'هاوکینگ در این کتاب از نظریه‌های نوین فیزیک، ابرتقارن و سفر در زمان می‌گوید.' },
    { id: 'riazi-zendegi', title: 'ریاضیات برای زندگی', author: 'کیت ییتس', publisher: 'نشر مازیار', category: 'science', price: 230000, off: 0, pages: 208, year: 1401, isbn: '978-964-00-0018-9', stock: 16, date: '2026-02-19', rank: 18, pal: 0, orn: 3, desc: 'کاربردهای روزمره ریاضی از تصمیم‌گیری تا مدیریت پول، با زبانی ساده و مثال‌های واقعی.' },
    { id: 'falsafe-daghighe', title: 'فلسفه در چند دقیقه', author: 'مارکوس ویکس', publisher: 'نشر شهرتاش', category: 'philosophy', price: 245000, off: 12, pages: 260, year: 1402, isbn: '978-964-00-0019-6', stock: 8, date: '2026-09-27', rank: 19, pal: 1, orn: 4, desc: 'مروری سریع و روشن بر مهم‌ترین اندیشه‌های فلسفی، از پیش‌سقراطی‌ها تا فلسفه معاصر.' },
    { id: 'chonin-goft-zarathustra', title: 'چنین گفت زرتشت', author: 'فریدریش نیچه', publisher: 'نشر آگه', category: 'philosophy', price: 355000, off: 0, pages: 384, year: 1401, isbn: '978-964-00-0020-2', stock: 6, date: '2026-03-30', rank: 20, pal: 4, orn: 0, desc: 'کتابی شاعرانه و پرچالش درباره ابرانسان، اراده معطوف به قدرت و بازارزیابی همه ارزش‌ها.' },
    { id: 'jomhur', title: 'جمهور', author: 'افلاطون', publisher: 'انتشارات خوارزمی', category: 'philosophy', price: 290000, off: 0, pages: 460, year: 1400, isbn: '978-964-00-0021-9', stock: 4, date: '2025-12-09', rank: 21, pal: 2, orn: 1, desc: 'گفت‌وگویی بنیادین درباره عدالت، شهر آرمانی و تربیت؛ یکی از اثرگذارترین متن‌های فلسفه سیاسی.' },
    { id: 'afsanehaye-kehan', title: 'افسانه‌های کهن ایرانی', author: 'گردآوری: مهدی رجایی', publisher: 'نشر افق', category: 'kids', price: 178000, off: 15, pages: 160, year: 1402, isbn: '978-964-00-0022-6', stock: 20, date: '2026-10-12', rank: 22, pal: 0, orn: 2, desc: 'مجموعه‌ای از افسانه‌های ایرانی برای کودکان؛ با روایتی ساده و تصویرگری گرم.' },
    { id: 'ghesehaye-khub', title: 'قصه‌های خوب برای بچه‌های خوب', author: 'مهدی آذریزدی', publisher: 'نشر امیرکبیر', category: 'kids', price: 210000, off: 0, pages: 196, year: 1401, isbn: '978-964-00-0023-3', stock: 15, date: '2026-07-08', rank: 23, pal: 3, orn: 3, desc: 'بازنویسی داستان‌های کلاسیک فارسی برای کودکان؛ کتابی که نسل‌ها با آن بزرگ شده‌اند.' },
    { id: 'matilda', title: 'ماتیلدا', author: 'رولد دال', publisher: 'نشر افق', category: 'kids', price: 165000, off: 20, pages: 232, year: 1400, isbn: '978-964-00-0024-0', stock: 12, date: '2026-01-14', rank: 24, pal: 5, orn: 4, desc: 'داستان دختری باهوش و کتاب‌خوان که با معلمی مهربان و مدیری سخت‌گیر روبه‌رو می‌شود؛ پر از طنز و خیال.' },
    { id: 'adat-atomi', title: 'عادت‌های اتمی', author: 'جیمز کلیر', publisher: 'نسل نواندیش', category: 'success', price: 320000, off: 18, pages: 320, year: 1402, isbn: '978-964-00-0025-7', stock: 10, date: '2026-09-19', rank: 25, pal: 1, orn: 0, desc: 'روشی عملی برای ساختن عادت‌های کوچک و پایدار؛ با تمرکز بر تغییر سیستم به‌جای تغییر هدف.' },
    { id: 'ghodrat-adat', title: 'قدرت عادت', author: 'چارلز دوهیگ', publisher: 'نسل نواندیش', category: 'success', price: 298000, off: 0, pages: 344, year: 1401, isbn: '978-964-00-0026-4', stock: 7, date: '2026-05-16', rank: 26, pal: 2, orn: 1, desc: 'دوهیگ نشان می‌دهد عادت‌ها چگونه شکل می‌گیرند و چطور می‌توان چرخه آن‌ها را برای تغییر رفتار بازنویسی کرد.' },
    { id: 'haft-adat', title: 'هفت عادت مردمان مؤثر', author: 'استیون کاوی', publisher: 'نسل نواندیش', category: 'success', price: 340000, off: 10, pages: 400, year: 1400, isbn: '978-964-00-0027-1', stock: 6, date: '2026-08-30', rank: 27, pal: 4, orn: 2, desc: 'چارچوبی کلاسیک برای رشد فردی و حرفه‌ای؛ از ابتکار عمل تا هم‌آفرینی و بازآفرینی.' }
  ].map((b) => Object.assign({}, b, { categoryTitle: (CATEGORIES.find((c) => c.slug === b.category) || {}).title || '' }));

  const DEMO_COUPONS = [
    { code: 'BOOK10', percent: 10, maxDiscount: 120000, minSubtotal: 200000, expires: '2027-03-20', usageLimit: 1000 },
    { code: 'STUDY15', percent: 15, maxDiscount: 200000, minSubtotal: 600000, expires: '2026-12-31', usageLimit: 300 },
    { code: 'OLD20', percent: 20, maxDiscount: 250000, minSubtotal: 400000, expires: '2026-01-01', usageLimit: 100 }
  ];

  /* ---------------------------------------------------------
     3. لایه سرور (نسخه نمایشی یا PHP)
  --------------------------------------------------------- */
  async function apiRequest(action, payload) {
    const res = await fetch(CONFIG.apiBase + '?action=' + encodeURIComponent(action), {
      method: payload ? 'POST' : 'GET',
      credentials: 'include',
      headers: Object.assign({ 'Accept': 'application/json' }, payload ? { 'Content-Type': 'application/json' } : {}),
      body: payload ? JSON.stringify(payload) : undefined
    });
    const data = await res.json().catch(() => ({ ok: false, error: 'پاسخ نامعتبر از سرور' }));
    if (!data || data.ok !== true) throw new Error((data && data.error) || 'خطا در ارتباط با سرور');
    return data;
  }

  const Backend = {
    async loadCatalog() {
      if (!API_MODE) return { books: BOOKS, categories: CATEGORIES };
      const data = await apiRequest('books.list');
      return { books: data.books || [], categories: data.categories || CATEGORIES };
    },
    async register(payload) {
      if (API_MODE) return apiRequest('auth.register', payload);
      const users = store.get(CONFIG.keys.users, []);
      if (users.some((u) => u.username === payload.username)) throw new Error('این نام کاربری قبلاً ثبت شده است.');
      if (users.some((u) => u.phone === payload.phone)) throw new Error('این شماره موبایل قبلاً ثبت شده است.');
      const user = { id: uid(), fullname: payload.fullname, phone: payload.phone, username: payload.username, passHash: demoHash(payload.password), createdAt: new Date().toISOString() };
      users.push(user);
      store.set(CONFIG.keys.users, users);
      store.set(CONFIG.keys.session, user.id);
      return { ok: true, user: publicUser(user) };
    },
    async login(payload) {
      if (API_MODE) return apiRequest('auth.login', payload);
      const users = store.get(CONFIG.keys.users, []);
      const idf = toEnDigits(String(payload.user || '').trim());
      const user = users.find((u) => u.username === idf || u.phone === idf);
      if (!user || user.passHash !== demoHash(payload.password)) throw new Error('نام کاربری یا رمز عبور نادرست است.');
      store.set(CONFIG.keys.session, user.id);
      return { ok: true, user: publicUser(user) };
    },
    async logout() {
      if (API_MODE) { try { await apiRequest('auth.logout', {}); } catch (e) {} return; }
      store.del(CONFIG.keys.session);
    },
    async me() {
      if (API_MODE) { try { const d = await apiRequest('auth.me'); return d.user || null; } catch (e) { return null; } }
      const id = store.get(CONFIG.keys.session, null);
      if (!id) return null;
      const user = store.get(CONFIG.keys.users, []).find((u) => u.id === id);
      return user ? publicUser(user) : null;
    },
    async createOrder(order) {
      if (API_MODE) return apiRequest('orders.create', order);
      const orders = store.get(CONFIG.keys.orders, []);
      const number = 'KK-' + Date.now().toString(36).toUpperCase().slice(-6);
      const record = Object.assign({}, order, { id: uid(), number, createdAt: new Date().toISOString(), status: 'pending', demo: true });
      orders.unshift(record);
      store.set(CONFIG.keys.orders, orders);
      // کاهش موجودی نمایشی
      order.items.forEach((it) => { const b = BOOKS.find((x) => x.id === it.id); if (b && b.stock > 0) b.stock = Math.max(0, b.stock - it.qty); });
      return { ok: true, order: record };
    },
    async myOrders() {
      if (API_MODE) { const d = await apiRequest('orders.mine'); return d.orders || []; }
      const user = await Backend.me();
      if (!user) return [];
      return store.get(CONFIG.keys.orders, []).filter((o) => o.userId === user.id);
    },
    async validateCoupon(code, subtotal) {
      if (API_MODE) return apiRequest('coupons.validate', { code, subtotal });
      const res = demoValidateCoupon(code, subtotal);
      if (!res.ok) throw new Error(res.error);
      return res;
    }
  };

  function publicUser(u) { return { id: u.id, fullname: u.fullname, username: u.username, phone: u.phone }; }

  /* هش نمایشی — فقط برای جلوگیری از دیدن رمز در localStorage؛ امنیت واقعی ندارد */
  function demoHash(str) {
    let h = 5381;
    const s = 'kk-salt-' + String(str);
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'd' + Math.abs(h).toString(36);
  }

  function demoUsage() { return store.get(CONFIG.keys.coupons, {}); }
  function demoValidateCoupon(code, subtotal) {
    const c = DEMO_COUPONS.find((x) => x.code.toLowerCase() === String(code || '').trim().toLowerCase());
    if (!c) return { ok: false, error: 'کد تخفیف معتبر نیست.' };
    if (new Date(c.expires + 'T23:59:59') < new Date()) return { ok: false, error: 'این کد تخفیف منقضی شده است.' };
    const usage = demoUsage();
    if ((usage[c.code] || 0) >= c.usageLimit) return { ok: false, error: 'سقف استفاده از این کد تکمیل شده است.' };
    if (subtotal < c.minSubtotal) return { ok: false, error: 'حداقل مبلغ سفارش برای این کد ' + money(c.minSubtotal) + ' است.' };
    const amount = Math.min(Math.round((subtotal * c.percent) / 100), c.maxDiscount);
    return { ok: true, code: c.code, percent: c.percent, amount, expires: c.expires };
  }
  function demoConsumeCoupon(code) {
    const usage = demoUsage();
    usage[code] = (usage[code] || 0) + 1;
    store.set(CONFIG.keys.coupons, usage);
  }

  /* ---------------------------------------------------------
     4. وضعیت برنامه
  --------------------------------------------------------- */
  const state = {
    catalog: BOOKS,
    cart: store.get(CONFIG.keys.cart, []),
    user: null,
    coupon: null,
    shippingMethod: 'post',
    address: null,
    filters: { q: '', cat: '', sort: 'newest', max: 900000, inStock: false },
    lastOrder: null
  };

  const findBook = (id) => state.catalog.find((b) => b.id === id);
  const effectivePrice = (b) => (b.off ? Math.round(b.price * (1 - b.off / 100)) : b.price);
  const isNew = (b) => new Date(b.date) >= new Date('2026-08-01');

  /* --- سبد خرید --- */
  function cartDetailed() {
    return state.cart.map((line) => {
      const book = findBook(line.id);
      if (!book) return null;
      return { book, qty: line.qty, lineTotal: effectivePrice(book) * line.qty };
    }).filter(Boolean);
  }
  function cartCount() { return state.cart.reduce((s, l) => s + l.qty, 0); }
  function cartSubtotal() { return cartDetailed().reduce((s, l) => s + l.lineTotal, 0); }
  function shippingCost() {
    const m = CONFIG.shippingMethods.find((x) => x.id === state.shippingMethod) || CONFIG.shippingMethods[0];
    if (m.cost === 0) return 0;
    return cartSubtotal() >= CONFIG.freeShippingFrom ? 0 : m.cost;
  }
  function discountAmount() { return state.coupon ? Math.min(state.coupon.amount, cartSubtotal()) : 0; }
  function cartTotal() { return Math.max(0, cartSubtotal() - discountAmount()) + shippingCost(); }

  function saveCart() { store.set(CONFIG.keys.cart, state.cart); syncCartUI(); }

  function addToCart(id, qty = 1) {
    const book = findBook(id);
    if (!book) return;
    if (book.stock <= 0) { toast('این کتاب فعلاً موجود نیست.', 'error'); return; }
    const line = state.cart.find((l) => l.id === id);
    const max = book.stock;
    if (line) line.qty = Math.min(max, line.qty + qty);
    else state.cart.push({ id, qty: Math.min(max, qty) });
    saveCart();
    toast('«' + book.title + '» به سبد خرید اضافه شد.', 'success');
    bumpCartBadge();
  }
  function changeQty(id, delta) {
    const line = state.cart.find((l) => l.id === id);
    if (!line) return;
    const book = findBook(id);
    const next = line.qty + delta;
    if (next <= 0) { removeFromCart(id); return; }
    if (book && next > book.stock) { toast('موجودی این کتاب محدود است.', 'error'); return; }
    line.qty = next;
    saveCart();
  }
  function removeFromCart(id) {
    state.cart = state.cart.filter((l) => l.id !== id);
    saveCart();
    toast('کتاب از سبد خرید حذف شد.');
  }

  /* ---------------------------------------------------------
     5. رندر قطعات
  --------------------------------------------------------- */
  function coverMarkup(book) {
    const p = COVER_PALETTES[book.pal % COVER_PALETTES.length];
    const orn = ORNAMENTS[book.orn % ORNAMENTS.length];
    return '<span class="cover-spine"></span>' +
      '<span class="cover-frame"></span>' +
      '<span class="cover-inner">' +
        '<span class="cover-orn">' + orn + '</span>' +
        '<span class="cover-title">' + esc(book.title) + '</span>' +
        '<span class="cover-rule"></span>' +
        '<span class="cover-author">' + esc(book.author) + '</span>' +
      '</span>' +
      '<span class="cover-pub">' + esc(book.publisher) + '</span>' +
      '<span class="cover-shade"></span>';
  }

  function coverStyle(book) {
    const p = COVER_PALETTES[book.pal % COVER_PALETTES.length];
    return '--c1:' + p.c1 + ';--c2:' + p.c2;
  }

  function bookCard(book) {
    const off = book.off || 0;
    const price = effectivePrice(book);
    const badges = [];
    if (off) badges.push('<span class="badge badge-off">' + faNum(off) + '٪ تخفیف</span>');
    if (isNew(book)) badges.push('<span class="badge badge-new">تازه رسیده</span>');
    if (book.stock <= 0) badges.push('<span class="badge badge-out">ناموجود</span>');

    return '<article class="book-card" data-card="' + book.id + '">' +
      '<button type="button" class="bc-cover" style="' + coverStyle(book) + '" data-open="' + book.id + '" aria-label="جزئیات کتاب ' + esc(book.title) + '">' +
        coverMarkup(book) +
        '<span class="cover-badges">' + badges.join('') + '</span>' +
      '</button>' +
      '<div class="bc-body">' +
        '<span class="bc-cat">' + esc(book.categoryTitle) + '</span>' +
        '<h3 class="bc-title"><a href="#/books" data-open="' + book.id + '">' + esc(book.title) + '</a></h3>' +
        '<p class="bc-author">' + esc(book.author) + '</p>' +
        '<p class="bc-pub">' + esc(book.publisher) + '</p>' +
        '<div class="bc-foot">' +
          '<div class="bc-price">' +
            (off ? '<del>' + money(book.price) + '</del>' : '') +
            '<strong>' + faNum(price) + '<small>تومان</small></strong>' +
          '</div>' +
          '<button class="bc-add" type="button" data-add="' + book.id + '" aria-label="افزودن ' + esc(book.title) + ' به سبد خرید"' + (book.stock <= 0 ? ' disabled' : '') + '>' +
            '<svg class="ic"><use href="#i-cart"/></svg></button>' +
        '</div>' +
        '<button type="button" class="bc-details" data-open="' + book.id + '">جزئیات کتاب <svg class="ic"><use href="#i-chevron"/></svg></button>' +
      '</div>' +
    '</article>';
  }

  function categoryCard(cat, wide) {
    const count = state.catalog.filter((b) => b.category === cat.slug).length;
    return '<a class="cat-card" href="#/books?cat=' + cat.slug + '" style="--glow:' + cat.glow + ';--glow-soft:' + cat.soft + '">' +
      '<span class="cat-go"><svg class="ic"><use href="#i-chevron"/></svg></span>' +
      '<span class="cat-icon">' + cat.icon + '</span>' +
      '<span><h3>' + esc(cat.title) + '</h3><p>' + esc(cat.desc) + ' · ' + faNum(count) + ' عنوان</p></span>' +
    '</a>';
  }

  function bestCard(book, index) {
    const price = effectivePrice(book);
    return '<article class="best-card">' +
      '<span class="best-rank">' + faNum(index + 1) + '</span>' +
      '<button type="button" class="bc-cover" style="' + coverStyle(book) + '" data-open="' + book.id + '" aria-label="' + esc(book.title) + '">' + coverMarkup(book) + '</button>' +
      '<div class="best-meta">' +
        '<h3><a href="#/books?cat=' + book.category + '" data-open="' + book.id + '">' + esc(book.title) + '</a></h3>' +
        '<p class="bc-author">' + esc(book.author) + '</p>' +
        '<div class="best-price">' + (book.off ? '<del>' + money(book.price) + '</del>' : '') + '<strong>' + money(price) + '</strong></div>' +
      '</div>' +
      '<button class="bc-add" type="button" data-add="' + book.id + '" aria-label="افزودن به سبد"' + (book.stock <= 0 ? ' disabled' : '') + '><svg class="ic"><use href="#i-cart"/></svg></button>' +
    '</article>';
  }

  function bestRow(book, index) {
    const off = book.off || 0;
    return '<article class="best-row">' +
      '<div class="rank">' + faNum(index + 1) + '</div>' +
      '<button type="button" class="bc-cover" style="' + coverStyle(book) + '" data-open="' + book.id + '" aria-label="' + esc(book.title) + '">' + coverMarkup(book) + '</button>' +
      '<div class="best-info">' +
        '<h3><a href="#/books" data-open="' + book.id + '">' + esc(book.title) + '</a></h3>' +
        '<p>' + esc(book.author) + ' · ' + esc(book.publisher) + ' · ' + esc(book.categoryTitle) + '</p>' +
      '</div>' +
      '<div class="best-actions">' +
        '<div class="price">' + (off ? '<del>' + money(book.price) + '</del>' : '') + '<strong>' + money(effectivePrice(book)) + '</strong></div>' +
        '<button class="btn btn-outline btn-sm" type="button" data-add="' + book.id + '"' + (book.stock <= 0 ? ' disabled' : '') + '>افزودن به سبد</button>' +
      '</div>' +
    '</article>';
  }

  /* ---------------------------------------------------------
     6. نمایش صفحات
  --------------------------------------------------------- */
  function renderHome() {
    $('#homeCategories').innerHTML = CATEGORIES.map((c) => categoryCard(c)).join('');
    $('#allCategories').innerHTML = CATEGORIES.map((c) => categoryCard(c, true)).join('');

    const newest = state.catalog.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    $('#homeBooks').innerHTML = newest.map(bookCard).join('');

    const best = state.catalog.slice().sort((a, b) => a.rank - b.rank).slice(0, 4);
    $('#homeBestsellers').innerHTML = best.map(bestCard).join('');
    $('#bestsellersList').innerHTML = state.catalog.slice().sort((a, b) => a.rank - b.rank).slice(0, 10).map(bestRow).join('');

    const offers = state.catalog.filter((b) => b.off > 0).sort((a, b) => b.off - a.off);
    $('#homeOffers').innerHTML = offers.slice(0, 4).map(bookCard).join('');
    $('#offersGrid').innerHTML = offers.map(bookCard).join('');

    observeReveal();
  }

  function currentFilteredBooks() {
    const f = state.filters;
    const q = toEnDigits(String(f.q || '').trim().toLowerCase());
    let list = state.catalog.filter((b) => {
      if (f.cat && b.category !== f.cat) return false;
      const price = effectivePrice(b);
      if (price > f.max) return false;
      if (f.inStock && b.stock <= 0) return false;
      if (q) {
        const hay = (b.title + ' ' + b.author + ' ' + b.publisher).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    switch (f.sort) {
      case 'cheap': list.sort((a, b) => effectivePrice(a) - effectivePrice(b)); break;
      case 'expensive': list.sort((a, b) => effectivePrice(b) - effectivePrice(a)); break;
      case 'popular': list.sort((a, b) => a.rank - b.rank); break;
      default: list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return list;
  }

  function renderShop() {
    const list = currentFilteredBooks();
    const grid = $('#shopGrid');
    grid.innerHTML = list.map(bookCard).join('');
    $('#shopEmpty').hidden = list.length > 0;
    $('#resultCount').innerHTML = list.length ? '<strong>' + faNum(list.length) + '</strong> کتاب یافت شد' : 'کتابی یافت نشد';

    const cat = CATEGORIES.find((c) => c.slug === state.filters.cat);
    const chips = [];
    if (state.filters.q) chips.push('<span class="chip">جست‌وجو: ' + esc(state.filters.q) + '<button type="button" data-chip="q" aria-label="حذف"><svg class="ic"><use href="#i-close"/></svg></button></span>');
    if (cat) chips.push('<span class="chip">' + esc(cat.title) + '<button type="button" data-chip="cat" aria-label="حذف"><svg class="ic"><use href="#i-close"/></svg></button></span>');
    if (state.filters.inStock) chips.push('<span class="chip">موجود در انبار<button type="button" data-chip="inStock" aria-label="حذف"><svg class="ic"><use href="#i-close"/></svg></button></span>');
    if (state.filters.max < 900000) chips.push('<span class="chip">تا ' + money(state.filters.max) + '<button type="button" data-chip="max" aria-label="حذف"><svg class="ic"><use href="#i-close"/></svg></button></span>');
    $('#activeChips').innerHTML = chips.join('');
  }

  function syncFilterControls() {
    $('#filterSearch').value = state.filters.q;
    $('#filterCategory').value = state.filters.cat;
    $('#filterSort').value = state.filters.sort;
    $('#filterPrice').value = state.filters.max;
    $('#filterStock').checked = state.filters.inStock;
    $('#priceLabel').textContent = state.filters.max >= 900000 ? 'نامحدود' : money(state.filters.max);
  }

  function fillCategorySelect() {
    const sel = $('#filterCategory');
    sel.innerHTML = '<option value="">همه دسته‌بندی‌ها</option>' +
      CATEGORIES.map((c) => '<option value="' + c.slug + '">' + esc(c.title) + '</option>').join('');
  }

  function updateHashFilters(push = true) {
    const p = new URLSearchParams();
    if (state.filters.q) p.set('q', state.filters.q);
    if (state.filters.cat) p.set('cat', state.filters.cat);
    if (state.filters.sort !== 'newest') p.set('sort', state.filters.sort);
    if (state.filters.max < 900000) p.set('max', state.filters.max);
    if (state.filters.inStock) p.set('stock', '1');
    const url = '#/books' + (p.toString() ? '?' + p.toString() : '');
    if (push) history.replaceState(null, '', url);
  }

  /* ---------------- کارت/مودال جزئیات کتاب ---------------- */
  function openBook(id) {
    const book = findBook(id);
    if (!book) return;
    const off = book.off || 0;
    const price = effectivePrice(book);
    const inStock = book.stock > 0;
    const specs = [
      ['ناشر', book.publisher], ['دسته‌بندی', book.categoryTitle], ['تعداد صفحه', faNum(book.pages) + ' صفحه'],
      ['سال چاپ', faNum(book.year)], ['شابک', book.isbn], ['زبان', 'فارسی'],
      ['نوع جلد', 'شومیز'], ['قطع', 'رقعی']
    ];
    $('#bookModalBody').innerHTML =
      '<div class="bd-visual">' +
        '<div class="bd-cover" style="' + coverStyle(book) + '">' + coverMarkup(book) + '</div>' +
        '<div class="bd-badges">' +
          (off ? '<span class="badge badge-off">' + faNum(off) + '٪ تخفیف</span>' : '') +
          (isNew(book) ? '<span class="badge badge-new">تازه رسیده</span>' : '') +
          '<span class="badge badge-out">' + (inStock ? 'موجود در انبار' : 'ناموجود') + '</span>' +
        '</div>' +
        '<div class="bd-meta-row">' +
          '<div class="bd-chip">نوع جلد<strong>شومیز</strong></div>' +
          '<div class="bd-chip">قطع کتاب<strong>رقعی</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="bd-content">' +
        '<span class="bd-cat">' + esc(book.categoryTitle) + '</span>' +
        '<h2 class="bd-title" id="bookModalTitle">' + esc(book.title) + '</h2>' +
        '<p class="bd-author">نویسنده: <span>' + esc(book.author) + '</span> · ناشر: <span>' + esc(book.publisher) + '</span></p>' +
        '<p class="bd-desc">' + esc(book.desc) + '</p>' +
        '<div class="bd-specs">' + specs.map((s) => '<div class="bd-spec"><span>' + s[0] + '</span><b>' + esc(s[1]) + '</b></div>').join('') + '</div>' +
        '<div class="bd-buy">' +
          '<div class="bd-price">' + (off ? '<del>' + money(book.price) + '</del>' : '') +
            '<strong>' + faNum(price) + ' <small>تومان</small></strong>' +
          '</div>' +
          '<div class="bd-actions">' +
            '<div class="qty" data-qty-for="' + book.id + '">' +
              '<button type="button" data-qty="-1" aria-label="کاهش"' + (inStock ? '' : ' disabled') + '><svg class="ic"><use href="#i-minus"/></svg></button>' +
              '<span data-qty-value>۱</span>' +
              '<button type="button" data-qty="1" aria-label="افزایش"' + (inStock ? '' : ' disabled') + '><svg class="ic"><use href="#i-plus"/></svg></button>' +
            '</div>' +
            '<button class="btn btn-gold" type="button" data-add-qty="' + book.id + '"' + (inStock ? '' : ' disabled') + '>' +
              '<svg class="ic"><use href="#i-cart"/></svg> افزودن به سبد خرید</button>' +
          '</div>' +
        '</div>' +
        '<p class="bd-stock ' + (inStock ? '' : 'out') + '"><span class="dot"></span>' + (inStock ? 'موجود در انبار · ارسال به سراسر ایران' : 'این کتاب فعلاً موجود نیست') + '</p>' +
      '</div>';
    openModal('#bookModal');
  }

  /* ---------------- سبد خرید ---------------- */
  function renderCart() {
    const items = cartDetailed();
    const body = $('#cartItems');
    const foot = $('#cartFoot');

    if (!items.length) {
      body.innerHTML = '<div class="drawer-empty"><svg class="ic"><use href="#i-cart"/></svg><p>سبد خرید خالی است.</p>' +
        '<button class="btn btn-gold" type="button" data-close-drawer>شروع خرید</button></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = items.map((it) =>
      '<div class="cart-item" data-line="' + it.book.id + '">' +
        '<button type="button" class="bc-cover" style="' + coverStyle(it.book) + '" data-open="' + it.book.id + '" aria-label="' + esc(it.book.title) + '">' + coverMarkup(it.book) + '</button>' +
        '<div class="ci-info">' +
          '<span class="ci-title">' + esc(it.book.title) + '</span>' +
          '<span class="ci-meta">' + esc(it.book.author) + '</span>' +
          '<span class="ci-price">' + money(it.lineTotal) + '</span>' +
          '<span class="ci-qty">' +
            '<button type="button" data-cart-minus="' + it.book.id + '" aria-label="کاهش تعداد"><svg class="ic"><use href="#i-minus"/></svg></button>' +
            '<span>' + faNum(it.qty) + '</span>' +
            '<button type="button" data-cart-plus="' + it.book.id + '" aria-label="افزایش تعداد"><svg class="ic"><use href="#i-plus"/></svg></button>' +
          '</span>' +
        '</div>' +
        '<button type="button" class="ci-remove" data-cart-remove="' + it.book.id + '" aria-label="حذف از سبد"><svg class="ic"><use href="#i-trash"/></svg></button>' +
      '</div>'
    ).join('');

    const sub = cartSubtotal();
    const ship = shippingCost();
    const disc = discountAmount();
    foot.innerHTML =
      '<div class="sum-row"><span>جمع کالاها</span><span>' + money(sub) + '</span></div>' +
      (disc ? '<div class="sum-row"><span>تخفیف</span><span style="color:#7BE0B6">−' + money(disc) + '</span></div>' : '') +
      '<div class="sum-row"><span>هزینه ارسال</span><span>' + (ship ? money(ship) : 'رایگان') + '</span></div>' +
      '<div class="sum-row total"><span>مبلغ قابل پرداخت</span><span>' + money(cartTotal()) + '</span></div>' +
      '<a class="btn btn-gold btn-block btn-lg" href="#/checkout" data-checkout style="margin-top:.8rem">ادامه و تکمیل سفارش</a>' +
      '<p class="ship-hint">' + (sub >= CONFIG.freeShippingFrom ? 'ارسال این سفارش رایگان است.' : 'با خرید ' + money(CONFIG.freeShippingFrom - sub) + ' بیشتر، ارسال رایگان می‌شود.') + '</p>';
  }

  function syncCartUI() {
    const count = cartCount();
    const badge = $('#cartCount');
    badge.textContent = faNum(count);
    badge.dataset.empty = count === 0 ? 'true' : 'false';
    $('#drawerCount').textContent = count ? faNum(count) + ' کتاب در سبد' : 'سبد خالی';
    renderCart();
  }
  function bumpCartBadge() {
    const badge = $('#cartCount');
    badge.classList.remove('is-bump');
    void badge.offsetWidth;
    badge.classList.add('is-bump');
  }

  /* ---------------------------------------------------------
     7. حساب کاربری
  --------------------------------------------------------- */
  function syncAuthUI() {
    const user = state.user;
    const loginBtn = $('#loginBtn'), registerBtn = $('#registerBtn'), accountBtn = $('#accountBtn');
    if (user) {
      loginBtn.hidden = true; registerBtn.hidden = true; accountBtn.hidden = false;
      $('#accountName').textContent = user.fullname.split(' ')[0] || user.username;
      $('#accountAvatar').textContent = (user.fullname || user.username).trim().charAt(0);
      const title = $('#accountTitle');
      if (title) title.textContent = 'سلام، ' + (user.fullname || user.username);
    } else {
      loginBtn.hidden = false; registerBtn.hidden = false; accountBtn.hidden = true;
    }
  }

  function addressesFor(user) {
    if (!user) return [];
    const all = store.get(CONFIG.keys.addresses, {});
    return all[user.id] || [];
  }
  function saveAddressesFor(user, list) {
    if (!user) return;
    const all = store.get(CONFIG.keys.addresses, {});
    all[user.id] = list;
    store.set(CONFIG.keys.addresses, all);
  }

  async function renderAccount() {
    const box = $('#accountBody');
    if (!state.user) {
      box.innerHTML = '<div class="card account-panel" style="text-align:center;max-width:520px;margin:0 auto 4rem">' +
        '<div class="empty-art"><svg class="ic"><use href="#i-user"/></svg></div>' +
        '<h2>برای دیدن حساب کاربری وارد شو</h2>' +
        '<p class="muted" style="margin-bottom:1.2rem;font-size:.87rem">سفارش‌ها، نشانی‌ها و مشخصات حساب در این بخش نمایش داده می‌شود.</p>' +
        '<div style="display:flex;gap:.6rem;justify-content:center;flex-wrap:wrap">' +
          '<button class="btn btn-gold" type="button" data-auth-open="login">ورود</button>' +
          '<button class="btn btn-outline" type="button" data-auth-open="register">ثبت‌نام</button>' +
        '</div>' +
        '<p class="demo-note" style="text-align:start"><svg class="ic"><use href="#i-shield"/></svg> نسخه نمایشی: احراز هویت امن نیست و اطلاعات فقط در این مرورگر ذخیره می‌شود.</p>' +
      '</div>';
      return;
    }

    const orders = await Backend.myOrders();
    const addresses = addressesFor(state.user);
    box.innerHTML =
      '<div class="account-grid">' +
        '<aside class="card account-nav" role="tablist">' +
          '<button class="is-active" data-acc-tab="profile" type="button"><svg class="ic"><use href="#i-user"/></svg> پروفایل</button>' +
          '<button data-acc-tab="orders" type="button"><svg class="ic"><use href="#i-book"/></svg> سفارش‌های من</button>' +
          '<button data-acc-tab="addresses" type="button"><svg class="ic"><use href="#i-pin"/></svg> نشانی‌ها</button>' +
          '<button data-acc-logout type="button"><svg class="ic"><use href="#i-close"/></svg> خروج از حساب</button>' +
        '</aside>' +
        '<section class="card account-panel" id="accPanel"></section>' +
      '</div>';

    renderAccountTab('profile', orders, addresses);
    const tabs = $$('[data-acc-tab]');
    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('is-active', x === t));
      renderAccountTab(t.dataset.accTab, orders, addresses);
    }));
    $('[data-acc-logout]').addEventListener('click', async () => {
      await Backend.logout();
      state.user = null; syncAuthUI(); navigate('/');
      toast('از حساب خارج شدی.');
    });
  }

  function renderAccountTab(tab, orders, addresses) {
    const panel = $('#accPanel');
    if (!panel) return;
    if (tab === 'profile') {
      panel.innerHTML = '<h2>اطلاعات حساب</h2>' +
        '<div class="profile-grid">' +
          '<div class="profile-item"><span>نام و نام خانوادگی</span><strong>' + esc(state.user.fullname) + '</strong></div>' +
          '<div class="profile-item"><span>نام کاربری</span><strong>' + esc(state.user.username) + '</strong></div>' +
          '<div class="profile-item"><span>شماره موبایل</span><strong>' + esc(faDigits(state.user.phone)) + '</strong></div>' +
          '<div class="profile-item"><span>تعداد سفارش‌ها</span><strong>' + faNum(orders.length) + '</strong></div>' +
        '</div>' +
        '<p class="demo-note" style="margin-top:1.2rem"><svg class="ic"><use href="#i-shield"/></svg> این حساب نمایشی است؛ برای حساب واقعی از نسخه PHP/MySQL استفاده کن.</p>';
    } else if (tab === 'orders') {
      if (!orders.length) {
        panel.innerHTML = '<h2>سفارش‌های من</h2><div class="empty-mini"><svg class="ic"><use href="#i-book"/></svg>هنوز سفارشی ثبت نکرده‌ای.' +
          '<div style="margin-top:1rem"><a class="btn btn-outline btn-sm" href="#/books">مشاهده کتاب‌ها</a></div></div>';
        return;
      }
      panel.innerHTML = '<h2>سفارش‌های من</h2>' + orders.map(orderRow).join('');
      $$('[data-print-order]', panel).forEach((btn) => btn.addEventListener('click', () => printInvoice(btn.dataset.printOrder, orders)));
    } else {
      panel.innerHTML = '<h2>نشانی‌های ارسال</h2>' +
        (addresses.length ? addresses.map((a, i) =>
          '<div class="addr-row"><div><strong>' + esc(a.recipient) + ' — ' + esc(faDigits(a.phone)) + '</strong>' +
            '<p>' + esc(a.province) + '، ' + esc(a.city) + '، ' + esc(a.address) + ' — کد پستی: ' + esc(faDigits(a.postal)) + '</p></div>' +
            '<div class="addr-actions"><button class="icon-btn" type="button" data-del-addr="' + i + '" aria-label="حذف نشانی"><svg class="ic"><use href="#i-trash"/></svg></button></div>' +
          '</div>').join('')
          : '<div class="empty-mini"><svg class="ic"><use href="#i-pin"/></svg>هنوز نشانی‌ای ثبت نشده است. هنگام ثبت سفارش می‌توانی نشانی را ذخیره کنی.</div>');
      $$('[data-del-addr]', panel).forEach((b) => b.addEventListener('click', () => {
        const list = addressesFor(state.user).slice();
        list.splice(Number(b.dataset.delAddr), 1);
        saveAddressesFor(state.user, list);
        renderAccount();
        toast('نشانی حذف شد.');
      }));
    }
  }

  const STATUS_LABEL = { pending: 'در انتظار پرداخت', paid: 'پرداخت‌شده', sent: 'ارسال‌شده', canceled: 'لغو‌شده' };
  const STATUS_CLASS = { pending: 'status--pending', paid: 'status--paid', sent: 'status--sent', canceled: 'status--canceled' };

  function orderRow(o) {
    const items = (o.items || []).map((i) => i.qty + ' × ' + i.title).join(' · ');
    return '<div class="order-row">' +
      '<div>' +
        '<div class="o-head"><span class="o-num">' + esc(o.number) + '</span>' +
          '<span class="status ' + (STATUS_CLASS[o.status] || STATUS_CLASS.pending) + '">' + (STATUS_LABEL[o.status] || STATUS_LABEL.pending) + '</span>' +
          '<span class="o-date">' + esc(faDigits(new Date(o.createdAt).toLocaleDateString('fa-IR'))) + '</span></div>' +
        '<div class="o-items">' + esc(items) + '</div>' +
      '</div>' +
      '<div style="text-align:end">' +
        '<div class="o-total">' + money(o.total) + '</div>' +
        '<button class="link-btn" type="button" data-print-order="' + esc(o.number) + '" style="margin-top:.35rem">چاپ فاکتور</button>' +
      '</div>' +
    '</div>';
  }

  function printInvoice(number, orders) {
    const o = orders.find((x) => x.number === number);
    if (!o) return;
    let area = $('#printArea');
    if (area) area.remove();
    area = document.createElement('div');
    area.id = 'printArea';
    area.className = 'print-sheet';
    area.innerHTML =
      '<div class="print-head" style="display:flex;justify-content:space-between;align-items:center;padding-bottom:1rem;margin-bottom:1rem;border-bottom:2px solid #111">' +
        '<div><h2 style="font-size:1.2rem">کتاب‌خانه</h2><p style="font-size:.8rem">فروشگاه اینترنتی کتاب</p></div>' +
        '<div style="text-align:end;font-size:.8rem"><strong>فاکتور فروش</strong><br>شماره: ' + esc(o.number) + '<br>تاریخ: ' + esc(faDigits(new Date(o.createdAt).toLocaleDateString('fa-IR'))) + '</div>' +
      '</div>' +
      '<p style="font-size:.85rem;margin-bottom:.6rem">گیرنده: ' + esc(o.customer && o.customer.recipient || '') + ' — ' + esc(faDigits(o.customer && o.customer.phone || '')) + '</p>' +
      '<p style="font-size:.85rem;margin-bottom:1rem">نشانی: ' + esc([o.customer && o.customer.province, o.customer && o.customer.city, o.customer && o.customer.address].filter(Boolean).join('، ')) + '</p>' +
      '<table style="width:100%;font-size:.8rem;border-collapse:collapse">' +
        '<thead><tr><th style="text-align:start;padding:.4rem;border-bottom:1px solid #999">کتاب</th><th style="padding:.4rem;border-bottom:1px solid #999">تعداد</th><th style="text-align:end;padding:.4rem;border-bottom:1px solid #999">مبلغ</th></tr></thead>' +
        '<tbody>' + (o.items || []).map((i) => '<tr><td style="padding:.4rem;border-bottom:1px solid #eee">' + esc(i.title) + '</td><td style="text-align:center;padding:.4rem;border-bottom:1px solid #eee">' + faNum(i.qty) + '</td><td style="text-align:end;padding:.4rem;border-bottom:1px solid #eee">' + money(i.lineTotal) + '</td></tr>').join('') + '</tbody>' +
      '</table>' +
      '<div style="margin-top:1rem;font-size:.85rem;text-align:end">' +
        '<p>جمع کالاها: ' + money(o.subtotal) + '</p>' +
        (o.discount ? '<p>تخفیف: −' + money(o.discount) + '</p>' : '') +
        '<p>هزینه ارسال: ' + (o.shipping ? money(o.shipping) : 'رایگان') + '</p>' +
        '<p style="font-weight:800;margin-top:.4rem">مبلغ کل: ' + money(o.total) + '</p>' +
      '</div>' +
      (o.demo ? '<p style="margin-top:1.2rem;font-size:.75rem;border:1px dashed #999;padding:.5rem">این فاکتور مربوط به سفارش نمایشی است و پرداختی انجام نشده است.</p>' : '');
    document.body.appendChild(area);
    window.print();
    setTimeout(() => area.remove(), 500);
  }

  /* ---------------------------------------------------------
     8. پرداخت
  --------------------------------------------------------- */
  function renderCheckout() {
    const box = $('#checkoutBody');
    const items = cartDetailed();
    if (!items.length && !state.lastOrder) {
      box.innerHTML = '<div class="card account-panel" style="text-align:center;max-width:520px;margin:0 auto 4rem">' +
        '<div class="empty-art"><svg class="ic"><use href="#i-cart"/></svg></div>' +
        '<h2>سبد خرید خالی است</h2><p class="muted" style="font-size:.87rem;margin-bottom:1.2rem">برای تکمیل سفارش، ابتدا کتابی به سبد اضافه کن.</p>' +
        '<a class="btn btn-gold" href="#/books">مشاهده کتاب‌ها</a></div>';
      return;
    }

    if (state.lastOrder && !items.length) { renderOrderDone(state.lastOrder); return; }

    const saved = addressesFor(state.user);
    const def = saved[0] || {};
    const methods = CONFIG.shippingMethods.map((m) =>
      '<label class="checkline" style="justify-content:space-between;padding:.6rem .8rem;border:1px solid var(--border);border-radius:12px;margin-bottom:.5rem">' +
        '<span style="display:flex;align-items:center;gap:.5rem"><input type="radio" name="ship" value="' + m.id + '"' + (state.shippingMethod === m.id ? ' checked' : '') + '> ' + esc(m.label) +
        '<small class="muted">(' + esc(m.note) + ')</small></span>' +
        '<strong style="font-size:.82rem">' + (m.cost ? money(m.cost) : 'رایگان') + '</strong>' +
      '</label>').join('');

    box.innerHTML =
      '<div class="checkout-grid">' +
        '<form class="card checkout-form" id="checkoutForm" novalidate>' +
          '<h2><span class="step-num">۱</span> اطلاعات گیرنده</h2>' +
          '<div class="form-grid">' +
            '<div class="field"><label for="coRecipient">نام و نام خانوادگی گیرنده</label><input id="coRecipient" value="' + esc(def.recipient || (state.user ? state.user.fullname : '')) + '" required><small class="err" data-err="coRecipient"></small></div>' +
            '<div class="field"><label for="coPhone">شماره موبایل</label><input id="coPhone" inputmode="numeric" value="' + esc(faDigits(def.phone || (state.user ? state.user.phone : ''))) + '" required><small class="err" data-err="coPhone"></small></div>' +
          '</div>' +
          '<h2><span class="step-num">۲</span> نشانی ارسال</h2>' +
          '<div class="form-grid">' +
            '<div class="field"><label for="coProvince">استان</label><input id="coProvince" value="' + esc(def.province || '') + '" required><small class="err" data-err="coProvince"></small></div>' +
            '<div class="field"><label for="coCity">شهر</label><input id="coCity" value="' + esc(def.city || '') + '" required><small class="err" data-err="coCity"></small></div>' +
          '</div>' +
          '<div class="field"><label for="coAddress">نشانی کامل پستی</label><textarea id="coAddress" rows="3" required>' + esc(def.address || '') + '</textarea><small class="err" data-err="coAddress"></small></div>' +
          '<div class="form-grid">' +
            '<div class="field"><label for="coPostal">کد پستی (۱۰ رقم)</label><input id="coPostal" inputmode="numeric" value="' + esc(faDigits(def.postal || '')) + '" required><small class="err" data-err="coPostal"></small></div>' +
            '<div class="field"><label for="coNote">یادداشت سفارش (اختیاری)</label><input id="coNote" placeholder="مثلاً: بسته‌بندی هدیه"></div>' +
          '</div>' +
          '<label class="checkline" style="margin-bottom:.4rem"><input type="checkbox" id="coSaveAddr"> این نشانی را در حسابم ذخیره کن</label>' +
          '<h2><span class="step-num">۳</span> روش ارسال</h2>' +
          methods +
          '<h2><span class="step-num">۴</span> پرداخت</h2>' +
          '<p class="demo-note" style="margin-top:0"><svg class="ic"><use href="#i-shield"/></svg> این نسخه <strong>نمایشی</strong> است: هیچ پرداختی انجام نمی‌شود و اطلاعات کارت بانکی دریافت نمی‌گردد. در نسخه PHP، پرداخت از درگاه بانکی با تأیید سمت سرور انجام می‌شود.</p>' +
          '<button class="btn btn-gold btn-lg btn-block" type="submit" style="margin-top:1rem">ثبت سفارش نمایشی</button>' +
          '<p class="ship-hint" style="text-align:center">با ثبت سفارش، <a href="#/terms" class="link-btn" style="font-size:.74rem">قوانین و مقررات</a> را می‌پذیری.</p>' +
        '</form>' +
        '<aside class="card order-summary" id="orderSummary">' + summaryMarkup() + '</aside>' +
      '</div>';

    // روش ارسال — فقط خلاصه سفارش به‌روز می‌شود تا اطلاعات فرم حفظ شود
    $$('input[name="ship"]', box).forEach((r) => r.addEventListener('change', () => {
      state.shippingMethod = r.value;
      refreshSummary();
    }));
    bindSummaryEvents();
    // ارسال فرم
    $('#checkoutForm').addEventListener('submit', (e) => { e.preventDefault(); submitOrder(); });
  }

  function summaryMarkup() {
    const items = cartDetailed();
    const sub = cartSubtotal();
    const ship = shippingCost();
    const disc = discountAmount();
    return '<h2>خلاصه سفارش</h2>' +
      items.map((it) => '<div class="sum-item"><div><div class="s-title">' + esc(it.book.title) + '</div><div class="s-qty">' + faNum(it.qty) + ' عدد</div></div><div class="s-price">' + money(it.lineTotal) + '</div></div>').join('') +
      '<div class="coupon-form"><input id="couponInput" placeholder="کد تخفیف" value="' + esc(state.coupon ? state.coupon.code : '') + '"><button class="btn btn-outline btn-sm" type="button" id="applyCoupon">اعمال</button></div>' +
      '<div id="couponMsg">' + (state.coupon ? '<p class="coupon-ok"><svg class="ic"><use href="#i-check"/></svg> کد ' + esc(state.coupon.code) + ' اعمال شد.</p>' : '') + '</div>' +
      '<div class="sum-row"><span>جمع کالاها</span><span>' + money(sub) + '</span></div>' +
      '<div class="sum-row" id="sumDiscount"' + (disc ? '' : ' hidden') + '><span>تخفیف</span><span style="color:#7BE0B6">−' + money(disc) + '</span></div>' +
      '<div class="sum-row"><span>هزینه ارسال</span><span id="sumShip">' + (ship ? money(ship) : 'رایگان') + '</span></div>' +
      '<div class="sum-row total"><span>مبلغ قابل پرداخت</span><span id="sumTotal">' + money(cartTotal()) + '</span></div>' +
      '<p class="ship-hint" id="freeShipNote">' + (sub >= CONFIG.freeShippingFrom ? 'ارسال این سفارش رایگان است.' : 'با خرید ' + money(CONFIG.freeShippingFrom - sub) + ' بیشتر، ارسال رایگان می‌شود.') + '</p>';
  }

  function bindSummaryEvents() {
    const btn = $('#applyCoupon');
    if (btn) btn.addEventListener('click', applyCoupon);
  }

  function refreshSummary() {
    const aside = $('#orderSummary');
    if (!aside) return;
    aside.innerHTML = summaryMarkup();
    bindSummaryEvents();
  }

  async function applyCoupon() {
    const input = $('#couponInput');
    const code = input ? input.value.trim() : '';
    if (!code) { state.coupon = null; refreshSummary(); return; }
    try {
      const res = await Backend.validateCoupon(code, cartSubtotal());
      state.coupon = { code: res.code, amount: res.amount, percent: res.percent };
      refreshSummary();
      toast('کد تخفیف اعمال شد.', 'success');
    } catch (err) {
      state.coupon = null;
      refreshSummary();
      const msg = $('#couponMsg');
      if (msg) msg.innerHTML = '<p class="err is-visible" style="margin-bottom:.4rem">' + esc(err.message || 'کد تخفیف معتبر نیست.') + '</p>';
    }
  }

  function validateCheckout() {
    const rules = {
      coRecipient: (v) => v.trim().length >= 3 || 'نام گیرنده را کامل وارد کن.',
      coPhone: (v) => /^09\d{9}$/.test(toEnDigits(v)) || 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.',
      coProvince: (v) => v.trim().length >= 2 || 'نام استان را وارد کن.',
      coCity: (v) => v.trim().length >= 2 || 'نام شهر را وارد کن.',
      coAddress: (v) => v.trim().length >= 10 || 'نشانی کامل‌تری وارد کن.',
      coPostal: (v) => /^\d{10}$/.test(toEnDigits(v)) || 'کد پستی باید ۱۰ رقم باشد.'
    };
    let ok = true;
    Object.keys(rules).forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      const result = rules[id](input.value);
      setFieldError(id, result === true ? '' : result);
      if (result !== true) ok = false;
    });
    return ok;
  }

  function setFieldError(id, message) {
    const input = document.getElementById(id);
    if (input) input.classList.toggle('has-error', !!message);
    const err = document.querySelector('[data-err="' + id + '"]');
    if (err) {
      err.textContent = message || '';
      err.classList.toggle('is-visible', !!message);
    }
  }

  async function submitOrder() {
    if (!validateCheckout()) return;
    const items = cartDetailed();
    if (!items.length) return;
    const customer = {
      recipient: $('#coRecipient').value.trim(),
      phone: toEnDigits($('#coPhone').value.trim()),
      province: $('#coProvince').value.trim(),
      city: $('#coCity').value.trim(),
      address: $('#coAddress').value.trim(),
      postal: toEnDigits($('#coPostal').value.trim()),
      note: $('#coNote') ? $('#coNote').value.trim() : ''
    };
    const payload = {
      userId: state.user ? state.user.id : 'guest',
      customer,
      shippingMethod: state.shippingMethod,
      coupon: state.coupon ? state.coupon.code : null,
      items: items.map((it) => ({ id: it.book.id, title: it.book.title, qty: it.qty, price: effectivePrice(it.book), lineTotal: it.lineTotal })),
      subtotal: cartSubtotal(),
      discount: discountAmount(),
      shipping: shippingCost(),
      total: cartTotal()
    };
    const btn = $('#checkoutForm button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'در حال ثبت سفارش…';
    try {
      const res = await Backend.createOrder(payload);
      if ($('#coSaveAddr') && $('#coSaveAddr').checked && state.user) {
        const list = addressesFor(state.user).slice();
        list.unshift({ recipient: customer.recipient, phone: customer.phone, province: customer.province, city: customer.city, address: customer.address, postal: customer.postal });
        saveAddressesFor(state.user, list);
      }
      if (state.coupon && !API_MODE) demoConsumeCoupon(state.coupon.code);

      // نسخه سروری: اگر درگاه پیکربندی شده باشد، کاربر به درگاه بانکی می‌رود
      if (API_MODE && res.paymentUrl) { window.location.href = res.paymentUrl; return; }

      state.lastOrder = res.order;
      state.cart = [];
      state.coupon = null;
      saveCart();
      renderOrderDone(res.order, API_MODE ? res.paymentError : null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast(err.message || 'ثبت سفارش انجام نشد.', 'error');
      btn.disabled = false;
      btn.textContent = 'ثبت سفارش نمایشی';
    }
  }

  function renderOrderDone(order, paymentError) {
    const apiMode = API_MODE;
    const message = apiMode
      ? (paymentError
          ? 'سفارش ثبت شد و در انتظار پرداخت است. درگاه پرداخت روی سرور پیکربندی نشده است، پس پرداخت آنلاین انجام نشد.'
          : 'سفارش ثبت شد و در انتظار پرداخت است. وضعیت آن پس از تأیید پرداخت در سرور به «پرداخت‌شده» تغییر می‌کند.')
      : 'این نسخه نمایشی است و <strong>پرداختی انجام نشده است</strong>. برای تجربه پرداخت واقعی، نسخه PHP/MySQL با درگاه بانکی را اجرا کن.';
    $('#checkoutBody').innerHTML =
      '<div class="card order-done">' +
        '<div class="done-icon"><svg class="ic"><use href="#i-check"/></svg></div>' +
        '<h2>' + (apiMode ? 'سفارش ثبت شد' : 'سفارش نمایشی ثبت شد') + '</h2>' +
        '<span class="o-code">' + esc(order.number) + '</span>' +
        '<p>' + message + '</p>' +
        '<p>مبلغ سفارش: <strong style="color:var(--gold)">' + money(order.total) + '</strong></p>' +
        '<div class="done-actions">' +
          '<a class="btn btn-gold" href="#/account">مشاهده سفارش‌ها</a>' +
          '<a class="btn btn-outline" href="#/books">ادامه خرید</a>' +
        '</div>' +
      '</div>';
  }

  /* ---------------------------------------------------------
     9. مودال‌ها، کشو و اعلان
  --------------------------------------------------------- */
  function openModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.hidden = false;
    document.body.classList.add('is-locked');
    const focusable = m.querySelector('input, button, select, textarea');
    if (focusable) setTimeout(() => focusable.focus(), 60);
  }
  function closeModals() {
    $$('.modal').forEach((m) => { m.hidden = true; });
    document.body.classList.remove('is-locked');
  }
  function openCart() {
    $('#cartDrawer').hidden = false;
    $('#scrim').hidden = false;
    document.body.classList.add('is-locked');
    renderCart();
  }
  function closeCart() {
    $('#cartDrawer').hidden = true;
    $('#scrim').hidden = true;
    document.body.classList.remove('is-locked');
  }

  let toastTimer = null;
  function toast(message, type) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    const icon = type === 'success' ? 'i-check' : type === 'error' ? 'i-close' : 'i-book';
    el.innerHTML = '<svg class="ic"><use href="#' + icon + '"/></svg><span>' + esc(message) + '</span>';
    box.appendChild(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 350); }, 2800);
    clearTimeout(toastTimer);
  }

  /* ---------------------------------------------------------
     10. اعتبارسنجی فرم‌های حساب
  --------------------------------------------------------- */
  function validateRegister() {
    const fullname = $('#regName').value.trim();
    const phone = toEnDigits($('#regPhone').value.trim());
    const username = $('#regUser').value.trim();
    const pass = $('#regPass').value;
    const pass2 = $('#regPass2').value;
    const terms = $('#regTerms').checked;
    let ok = true;
    const check = (id, condition, message) => { setFieldError(id, condition ? '' : message); if (!condition) ok = false; };

    check('regName', fullname.length >= 3, 'نام و نام خانوادگی را کامل وارد کن.');
    check('regPhone', /^09\d{9}$/.test(phone), 'شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.');
    check('regUser', /^[a-zA-Z0-9_.]{4,20}$/.test(username), 'نام کاربری ۴ تا ۲۰ کاراکتر انگلیسی، عدد یا _ باشد.');
    check('regPass', pass.length >= 8 && /[A-Za-z]/.test(pass) && /\d/.test(pass), 'رمز عبور حداقل ۸ کاراکتر و شامل حرف و رقم باشد.');
    check('regPass2', pass2 && pass2 === pass, 'تکرار رمز عبور یکسان نیست.');
    const termsErr = document.querySelector('[data-err="regTerms"]');
    if (termsErr) { termsErr.textContent = terms ? '' : 'برای ثبت‌نام باید قوانین را بپذیری.'; termsErr.classList.toggle('is-visible', !terms); }
    if (!terms) ok = false;
    return { ok, data: { fullname, phone, username, password: pass } };
  }

  async function handleRegister(e) {
    e.preventDefault();
    const { ok, data } = validateRegister();
    if (!ok) return;
    const btn = $('#registerForm button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await Backend.register(data);
      state.user = res.user;
      syncAuthUI();
      closeModals();
      $('#registerForm').reset();
      toast('حساب نمایشی ساخته شد. خوش آمدی ' + (res.user.fullname || res.user.username) + '!', 'success');
      if (currentRoute().path === '/account') renderAccount();
    } catch (err) {
      setFieldError('regUser', err.message);
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const user = $('#loginUser').value.trim();
    const pass = $('#loginPass').value;
    let ok = true;
    setFieldError('loginUser', user ? '' : 'نام کاربری یا شماره موبایل را وارد کن.');
    if (!user) ok = false;
    setFieldError('loginPass', pass ? '' : 'رمز عبور را وارد کن.');
    if (!pass) ok = false;
    if (!ok) return;
    const btn = $('#loginForm button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await Backend.login({ user, password: pass });
      state.user = res.user;
      syncAuthUI();
      closeModals();
      $('#loginForm').reset();
      toast('خوش آمدی ' + (res.user.fullname || res.user.username) + '!', 'success');
      if (currentRoute().path === '/account') renderAccount();
    } catch (err) {
      setFieldError('loginPass', err.message);
    } finally {
      btn.disabled = false;
    }
  }

  function setAuthTab(tab) {
    const isLogin = tab === 'login';
    $('#tabLogin').classList.toggle('is-active', isLogin);
    $('#tabLogin').setAttribute('aria-selected', String(isLogin));
    $('#tabRegister').classList.toggle('is-active', !isLogin);
    $('#tabRegister').setAttribute('aria-selected', String(!isLogin));
    $('#loginForm').hidden = !isLogin;
    $('#registerForm').hidden = isLogin;
    $('#authTitle').textContent = isLogin ? 'ورود به کتاب‌خانه' : 'ساخت حساب در کتاب‌خانه';
  }

  /* ---------------------------------------------------------
     11. مسیریابی
  --------------------------------------------------------- */
  function currentRoute() {
    const raw = (location.hash || '#/').slice(1);
    const [path, qs] = raw.split('?');
    return { path: path || '/', params: new URLSearchParams(qs || '') };
  }

  function navigate(path) {
    if (location.hash === '#' + path) { showView(path); return; }
    location.hash = path;
  }

  function showView(path) {
    let view = path === '/support' ? '/contact' : path;
    if (!document.querySelector('[data-view="' + view + '"]')) view = '/';
    $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== view; });
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === view || (view === '/' && a.dataset.nav === '/')));

    if (view === '/account') renderAccount();
    if (view === '/checkout') renderCheckout();
    if (view === '/books') { syncFilterControls(); renderShop(); }
    observeReveal();
    $('#navLinks').classList.remove('is-open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
    if (view !== '/') window.scrollTo(0, 0);
  }

  function handleRoute() {
    const { path, params } = currentRoute();
    if (path === '/books') {
      state.filters.q = params.get('q') || '';
      state.filters.cat = params.get('cat') || '';
      state.filters.sort = params.get('sort') || 'newest';
      state.filters.max = Number(params.get('max')) || 900000;
      state.filters.inStock = params.get('stock') === '1';
    }
    showView(path);
  }

  /* ---------------------------------------------------------
     12. تزئینات و انیمیشن
  --------------------------------------------------------- */
  function buildShelf() {
    const wrap = $('#shelfBooks');
    if (!wrap) return;
    const palettes = [
      ['#2C4C82', '#16243C'], ['#8B6A2A', '#3E2E12'], ['#2F6B62', '#123028'], ['#6C3A46', '#2A1419'],
      ['#345A9A', '#15243D'], ['#A07C36', '#453111'], ['#3B4A78', '#182036'], ['#7A4A2C', '#2C1A10']
    ];
    let html = '';
    for (let i = 0; i < 19; i++) {
      const p = palettes[i % palettes.length];
      const h = 150 + Math.round(Math.sin(i * 1.7) * 34) + (i % 5) * 22;
      const w = 15 + (i % 4) * 5;
      html += '<span class="spine" style="--c1:' + p[0] + ';--c2:' + p[1] + ';height:' + h + 'px;width:' + w + 'px;animation-delay:' + (i * 45) + 'ms"></span>';
    }
    wrap.innerHTML = html;
  }

  function buildDust() {
    const wrap = $('#heroDust');
    if (!wrap) return;
    let html = '';
    for (let i = 0; i < 16; i++) {
      html += '<span class="dust" style="left:' + (4 + Math.random() * 92) + '%;bottom:' + (Math.random() * 40) + '%;animation-duration:' + (7 + Math.random() * 8).toFixed(1) + 's;animation-delay:' + (Math.random() * 6).toFixed(1) + 's"></span>';
    }
    wrap.innerHTML = html;
  }

  let revealObserver = null;
  function observeReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); revealObserver.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    }
    $$('.section-head, .trust-band, .cta-band, .coupon-band, .page-head').forEach((el) => {
      if (!el.classList.contains('reveal')) el.classList.add('reveal');
      if (!el.classList.contains('is-in')) revealObserver.observe(el);
    });
    setTimeout(() => $$('.reveal').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('is-in');
    }), 120);
  }

  /* ---------------------------------------------------------
     13. اتصال رویدادها
  --------------------------------------------------------- */
  function bindEvents() {
    // ناوبری
    window.addEventListener('hashchange', handleRoute);
    $('#menuBtn').addEventListener('click', () => {
      const open = $('#navLinks').classList.toggle('is-open');
      $('#menuBtn').setAttribute('aria-expanded', String(open));
    });
    $('#searchToggle').addEventListener('click', () => {
      const form = $('#navSearchForm');
      const open = form.classList.toggle('is-open');
      $('#searchToggle').setAttribute('aria-expanded', String(open));
      if (open) $('#navSearch').focus();
    });
    $('#navSearchForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#navSearch').value.trim();
      navigate('/books' + (q ? '?q=' + encodeURIComponent(q) : ''));
    });
    $('#cartBtn').addEventListener('click', openCart);
    $('#scrim').addEventListener('click', closeCart);
    $$('[data-close-drawer]').forEach((b) => b.addEventListener('click', closeCart));
    $$('[data-close-modal]').forEach((b) => b.addEventListener('click', closeModals));
    $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) closeModals(); }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModals(); closeCart(); }
    });

    // ورود / ثبت‌نام
    $('#loginBtn').addEventListener('click', () => { setAuthTab('login'); openModal('#authModal'); });
    $('#registerBtn').addEventListener('click', () => { setAuthTab('register'); openModal('#authModal'); });
    $('#accountBtn').addEventListener('click', () => navigate('/account'));
    $('#tabLogin').addEventListener('click', () => setAuthTab('login'));
    $('#tabRegister').addEventListener('click', () => setAuthTab('register'));
    $$('[data-auth-tab]').forEach((b) => b.addEventListener('click', () => setAuthTab(b.dataset.authTab)));
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#registerForm').addEventListener('submit', handleRegister);
    $$('[data-toggle-pass]').forEach((btn) => btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePass);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = '<svg class="ic"><use href="#' + (show ? 'i-eye-off' : 'i-eye') + '"/></svg>';
      btn.setAttribute('aria-label', show ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور');
    }));

    // فیلترها
    $('#filterToggle').addEventListener('click', () => {
      const open = $('.filters').classList.toggle('is-open');
      $('#filterToggle').setAttribute('aria-expanded', String(open));
    });
    $('#filterSearch').addEventListener('input', debounce((e) => {
      state.filters.q = e.target.value.trim();
      updateHashFilters(); renderShop();
    }, 200));
    $('#filterCategory').addEventListener('change', (e) => { state.filters.cat = e.target.value; updateHashFilters(); renderShop(); });
    $('#filterSort').addEventListener('change', (e) => { state.filters.sort = e.target.value; updateHashFilters(); renderShop(); });
    $('#filterPrice').addEventListener('input', (e) => {
      state.filters.max = Number(e.target.value);
      $('#priceLabel').textContent = state.filters.max >= 900000 ? 'نامحدود' : money(state.filters.max);
      updateHashFilters(); renderShop();
    });
    $('#filterStock').addEventListener('change', (e) => { state.filters.inStock = e.target.checked; updateHashFilters(); renderShop(); });
    $('#resetFilters').addEventListener('click', resetFilters);
    $('#emptyReset').addEventListener('click', resetFilters);
    $('#activeChips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-chip]');
      if (!btn) return;
      const key = btn.dataset.chip;
      if (key === 'q') state.filters.q = '';
      if (key === 'cat') state.filters.cat = '';
      if (key === 'max') state.filters.max = 900000;
      if (key === 'inStock') state.filters.inStock = false;
      syncFilterControls(); updateHashFilters(); renderShop();
    });

    // کلیک‌های عمومی
    document.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-open]');
      if (openBtn) { e.preventDefault(); openBook(openBtn.dataset.open); closeCart(); return; }
      const addBtn = e.target.closest('[data-add]');
      if (addBtn) { e.preventDefault(); addToCart(addBtn.dataset.add, 1); return; }
      const addQty = e.target.closest('[data-add-qty]');
      if (addQty) {
        const id = addQty.dataset.addQty;
        const holder = document.querySelector('[data-qty-for="' + id + '"] [data-qty-value]');
        const qty = holder ? Number(toEnDigits(holder.textContent)) || 1 : 1;
        addToCart(id, qty);
        closeModals();
        return;
      }
      const qtyBtn = e.target.closest('[data-qty]');
      if (qtyBtn) {
        const holder = qtyBtn.closest('[data-qty-for]');
        const valueEl = holder.querySelector('[data-qty-value]');
        const book = findBook(holder.dataset.qtyFor);
        let q = Number(toEnDigits(valueEl.textContent)) || 1;
        q = Math.max(1, Math.min(book ? book.stock : 99, q + Number(qtyBtn.dataset.qty)));
        valueEl.textContent = faNum(q);
        const minus = holder.querySelector('[data-qty="-1"]');
        if (minus) minus.disabled = q <= 1;
        return;
      }
      const minus = e.target.closest('[data-cart-minus]');
      if (minus) { changeQty(minus.dataset.cartMinus, -1); return; }
      const plus = e.target.closest('[data-cart-plus]');
      if (plus) { changeQty(plus.dataset.cartPlus, 1); return; }
      const rm = e.target.closest('[data-cart-remove]');
      if (rm) { removeFromCart(rm.dataset.cartRemove); return; }
      const authOpen = e.target.closest('[data-auth-open]');
      if (authOpen) { setAuthTab(authOpen.dataset.authOpen); openModal('#authModal'); return; }
      const checkoutLink = e.target.closest('[data-checkout]');
      if (checkoutLink) { closeCart(); return; }
    });

    // کپی کد تخفیف
    $('#copyCoupon').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('BOOK10');
        toast('کد BOOK10 کپی شد.', 'success');
      } catch (err) {
        toast('کد تخفیف: BOOK10');
      }
    });

    // فرم تماس
    $('#contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#cName').value.trim();
      const phone = toEnDigits($('#cPhone').value.trim());
      const subject = $('#cSubject').value.trim();
      const message = $('#cMessage').value.trim();
      let ok = true;
      const check = (id, cond, msg) => { setFieldError(id, cond ? '' : msg); if (!cond) ok = false; };
      check('cName', name.length >= 3, 'نام را کامل وارد کن.');
      check('cPhone', /^09\d{9}$/.test(phone), 'شماره موبایل معتبر نیست.');
      check('cMessage', message.length >= 10, 'متن پیام حداقل ۱۰ کاراکتر باشد.');
      if (!ok) return;
      const msgs = store.get(CONFIG.keys.messages, []);
      msgs.unshift({ id: uid(), name, phone, subject, message, createdAt: new Date().toISOString() });
      store.set(CONFIG.keys.messages, msgs);
      e.target.reset();
      toast('پیام ثبت شد. (نمایشی — در مرورگر ذخیره شد)', 'success');
    });

    // نوار بالا
    const onScroll = () => {
      $('#nav').classList.toggle('is-stuck', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function resetFilters() {
    state.filters = { q: '', cat: '', sort: 'newest', max: 900000, inStock: false };
    syncFilterControls();
    updateHashFilters();
    renderShop();
  }

  /* ---------------------------------------------------------
     14. راه‌اندازی
  --------------------------------------------------------- */
  async function boot() {
    $('#year').textContent = faDigits(new Date().getFullYear());
    buildShelf();
    buildDust();
    fillCategorySelect();

    try {
      const data = await Backend.loadCatalog();
      if (data.books && data.books.length) state.catalog = data.books;
    } catch (err) {
      console.warn('بارگذاری کاتالوگ از سرور ناموفق بود؛ داده نمونه نمایش داده می‌شود.', err);
      if (API_MODE) toast('اتصال به سرور برقرار نشد؛ داده نمونه نمایش داده می‌شود.', 'error');
    }

    state.user = await Backend.me();

    renderHome();
    syncFilterControls();
    renderShop();
    syncAuthUI();
    syncCartUI();
    bindEvents();
    handleRoute();

    // بازگشت از درگاه پرداخت (نسخه سروری)
    const paymentState = new URLSearchParams(location.search).get('payment');
    if (paymentState === 'success') toast('پرداخت با موفقیت تأیید شد.', 'success');
    else if (paymentState === 'failed') toast('پرداخت انجام نشد یا لغو شد.', 'error');

    document.body.dataset.ready = 'true';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
