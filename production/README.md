# کتاب‌خانه — نسخه تجاری (PHP 8.2 + MySQL)

فروشگاه اینترنتی کتاب، با رابط کاربری فارسی/RTL و معماری سروری. این پوشه نسخه‌ای است که روی هاست لینوکس با PHP و MySQL اجرا می‌شود؛ نسخه نمایشی GitHub Pages از همان سه فایل ریشه پروژه (`index.html`، `style.css`، `script.js`) استفاده می‌کند.

> **مهم:** GitHub Pages فقط فایل‌های استاتیک را سرو می‌کند. PHP، MySQL، حساب کاربری واقعی، مدیریت سفارش و تأیید پرداخت فقط روی هاست PHP کار می‌کنند و روی GitHub Pages فعال نیستند.

---

## ۱. دو حالت اجرا

| | نسخه نمایشی (GitHub Pages) | نسخه تجاری (این پوشه) |
|---|---|---|
| فایل‌ها | `index.html` + `style.css` + `script.js` | همان سه فایل + `api.php` و PHP/MySQL |
| کاتالوگ | آرایه JavaScript (`BOOKS` در `script.js`) | جدول `books` در MySQL |
| حساب کاربری | نمایشی، در `localStorage` | واقعی، `password_hash` + نشست سرور |
| سفارش و سبد | در مرورگر | جدول `orders` و `order_items` |
| پرداخت | شبیه‌سازی، بدون پرداخت واقعی | درگاه زرین‌پال با **تأیید سمت سرور** |
| موجودی انبار | نمایشی | پس از پرداخت موفق کم می‌شود |
| پنل مدیریت | ندارد | `admin/index.php` |
| پیامک | ندارد | کاوه‌نگار (با کلید واقعی) |

نسخه نمایشی هیچ پرداخت واقعی انجام نمی‌دهد و این را در رابط کاربری صریح اعلام می‌کند.

---

## ۲. پیش‌نیازها

- PHP **8.2** یا بالاتر با افزونه‌های `pdo_mysql`، `mbstring`، `curl`، `json`
- MySQL **8** یا MariaDB **10.4+**
- وب‌سرور Apache (با `mod_rewrite` و `mod_headers`) یا Nginx
- گواهی SSL (HTTPS) — برای پرداخت و کوکی امن لازم است

---

## ۳. نصب

1. **ساخت فایل تنظیمات**
   ```sh
   cp .env.example .env
   ```
   در `.env` مقدارهای `APP_URL`، `ALLOWED_ORIGIN` و `DB_*` را وارد کنید (کلیدهای زرین‌پال/پیامک را در گام ۵).
   فایل `.env` را بیرون از وب‌روت یا با دسترسی `600` نگه دارید؛ در `.htaccess` مسدود شده است.

2. **آماده‌سازی فرانت‌اند**
   ```sh
   sh build.sh
   ```
   این اسکریپت `index.html`، `style.css` و `script.js` را از ریشه پروژه کپی می‌کند و `<script src="config.js">` را پیش از `script.js` اضافه می‌کند. `config.js` به فروشگاه می‌گوید داده‌ها را از API سرور بگیرد.

3. **آپلود** کل پوشه `production/` روی هاست (وب‌روت همین پوشه باشد).

4. **ساخت دیتابیس و حساب مدیر**
   مرورگر → `https://دامنه/install.php`
   فرم را پر کنید؛ ساختار جدول‌ها ساخته می‌شود، حساب مدیر ثبت می‌شود و در صورت انتخاب، دسته‌بندی‌ها و ۲۷ کتاب نمونه درج می‌شوند.
   پس از موفقیت، **فایل `install.php` را حذف کنید**.

5. **پرداخت و پیامک** (اختیاری اما برای فروش واقعی لازم)
   - `ZARINPAL_MERCHANT_ID` را از پنل زرین‌پال بگیرید و در `.env` بگذارید. مبالغ در دیتابیس تومان است و برای درگاه به ریال تبدیل می‌شود.
   - برای پیامک: `SMS_PROVIDER=kavenegar` و `SMS_API_KEY` و `SMS_SENDER`.
   - بدون این مقادیر، سفارش ثبت می‌شود اما وضعیت آن «در انتظار پرداخت» می‌ماند و در پنل مدیریت می‌توانید وضعیت را دستی تغییر دهید. هیچ پرداخت موفقی جعل نمی‌شود.

6. **پوشه پشتیبان**
   ```sh
   mkdir -p storage/backups && chmod 750 storage storage/backups
   ```
   فایل `.htaccess` داخل `storage/` دسترسی وب را می‌بندد.

7. **Cron پیشنهادی** (روزانه)
   ```cron
   0 3 * * * cd /path/to/production && php -r 'require "lib/config.php"; db()->exec("DELETE FROM login_attempts WHERE created_at < (NOW() - INTERVAL 30 DAY)");'
   ```

---

## ۴. تنظیم Nginx (جایگزین Apache)

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/ketabkhaneh;
    index index.html;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location ~ ^/(lib|sql|storage)/ { deny all; }
    location ~ /\.(env|git) { deny all; }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

---

## ۵. ساختار فایل‌ها

```
production/
├── index.html            # فروشگاه (کپی از ریشه پروژه با build.sh)
├── style.css
├── script.js
├── config.js             # اتصال فرانت‌اند به API
├── api.php               # نقطه ورود API فروشگاه (JSON)
├── install.php           # نصب اولیه — بعد از نصب حذف شود
├── build.sh              # آماده‌سازی فایل‌های فرانت‌اند
├── .env.example
├── .htaccess
├── lib/
│   ├── config.php        # خواندن .env، PDO، نشست، هزینه ارسال
│   ├── helpers.php       # پاسخ JSON، CSRF، احراز هویت، تخفیف، سفارش، پیامک
│   └── payment.php       # درگاه زرین‌پال (request/verify)
├── admin/
│   ├── index.php         # داشبورد مدیریت
│   └── invoice.php       # فاکتور چاپی
├── sql/
│   ├── schema.sql        # جدول‌ها
│   └── seed.sql          # داده نمونه
└── storage/backups/      # فایل‌های پشتیبان (دسترسی وب مسدود)
```

---

## ۶. API فروشگاه

همه پاسخ‌ها JSON با کلید `ok` هستند. درخواست‌های تغییردهنده `POST` با `Content-Type: application/json` و کوکی نشست `SameSite=Strict` لازم دارند.

| Action | Method | توضیح |
|---|---|---|
| `books.list` | GET | کاتالوگ و دسته‌بندی‌های فعال |
| `coupons.validate` | POST | اعتبارسنجی کد تخفیف روی قیمت واقعی سرور (`items`) |
| `auth.register` | POST | ثبت‌نام (اعتبارسنجی + `password_hash`) |
| `auth.login` | POST | ورود با نام کاربری یا موبایل، محدودیت ۸ تلاش در ۱۵ دقیقه |
| `auth.me` | GET | کاربر جاری |
| `auth.logout` | POST | خروج |
| `orders.create` | POST | ثبت سفارش؛ قیمت‌ها و موجودی از دیتابیس خوانده می‌شود |
| `orders.mine` | GET | سفارش‌های کاربر |
| `orders.get` | GET | جزئیات یک سفارش (فقط مالک یا مدیر) |
| `payment.start` | POST | ساخت تراکنش و دریافت نشانی درگاه |
| `payment.callback` | GET | بازگشت از درگاه؛ **تأیید سمت سرور** و کاهش موجودی |

---

## ۷. امنیت

- رمزها: `password_hash()` / `password_verify()` (bcrypt پیش‌فرض PHP)
- کوئری‌ها: PDO با Prepared Statements، بدون الحاق رشته
- CSRF: فرم‌های مدیریت با توکن نشست؛ API فقط JSON + بررسی `Origin` + کوکی `SameSite=Strict`
- XSS: همه خروجی‌ها با `htmlspecialchars` (تابع `kk_e`)
- نشست: `HttpOnly`، `Secure` روی HTTPS، `session_regenerate_id` پس از ورود
- محدودیت تلاش ورود در جدول `login_attempts`
- مسیرهای `lib/`, `sql/`, `storage/` و `.env` با `.htaccess` بسته شده‌اند
- پشتیبان‌ها فقط با احراز هویت مدیر و نام فایل اعتبارسنجی‌شده قابل دانلود هستند

پیش از انتشار: `install.php` را حذف کنید، HTTPS را اجباری کنید، `display_errors` را خاموش و `error_log` را بیرون از وب‌روت تنظیم کنید.

---

## ۸. چه چیزی در این نسخه آماده است و چه چیزی نیست

**آماده و قابل استفاده:** کاتالوگ از دیتابیس، جست‌وجو و فیلتر سمت مرورگر روی داده سرور، حساب کاربری واقعی با هش رمز، سبد خرید پایدار، کد تخفیف با تاریخ انقضا و سقف استفاده (کنترل سرور)، ثبت سفارش با قیمت معتبر سرور، محاسبه هزینه ارسال، پنل مدیریت (کتاب، دسته، سفارش، مشتری، کد تخفیف، گزارش، پشتیبان)، فاکتور چاپی، پیامک در صف/ارسال، اتصال به درگاه با تأیید سمت سرور، کاهش موجودی پس از پرداخت.

**نیازمند تنظیم/توسعه:** کلید واقعی درگاه و پیامک، درگاه‌های دیگر (زرین‌پال پیاده‌سازی شده)، آپلود تصویر جلد (جلدها با طرح CSS از روی `pal`/`orn` ساخته می‌شوند و `cover_url` در جدول برای توسعه آینده آماده است)، ارسال ایمیل، و تست بارگذاری روی هاست واقعی.

> این پروژه در محیط توسعه بررسی شده است؛ اجرای کامل PHP/MySQL و پرداخت واقعی نیازمند هاست شما و کلیدهای درگاه است.
