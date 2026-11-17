<?php
declare(strict_types=1);

/**
 * کتاب‌خانه — نصب نسخه PHP/MySQL
 * اجرا: مرورگر → /install.php
 * پس از نصب موفق، این فایل را حذف یا تغییر نام بده.
 */

require_once __DIR__ . '/lib/config.php';
require_once __DIR__ . '/lib/helpers.php';

kk_boot_session();

$messages = [];
$errors = [];
$finished = false;

try {
    $already = kk_installed();
} catch (Throwable $e) {
    $already = false;
    $errors[] = 'اتصال به MySQL برقرار نشد: ' . $e->getMessage() . ' — مقادیر DB_* را در فایل .env بررسی کن.';
}

function kk_run_sql_file(string $file): int
{
    if (!is_file($file)) {
        throw new RuntimeException('فایل SQL یافت نشد: ' . basename($file));
    }
    $sql = (string) file_get_contents($file);
    $statements = preg_split('/;\s*\n/', $sql) ?: [];
    $count = 0;
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if ($statement === '' || str_starts_with($statement, '--')) {
            continue;
        }
        db()->exec($statement);
        $count++;
    }
    return $count;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$already) {
    kk_csrf_check();
    $fullname = kk_str($_POST, 'fullname', 120);
    $phone = preg_replace('/\D/', '', (string) ($_POST['phone'] ?? '')) ?? '';
    $username = strtolower(kk_str($_POST, 'username', 40));
    $password = (string) ($_POST['password'] ?? '');

    if (mb_strlen($fullname) < 3) { $errors[] = 'نام مدیر را کامل وارد کن.'; }
    if (!preg_match('/^09\d{9}$/', $phone)) { $errors[] = 'شماره موبایل مدیر معتبر نیست.'; }
    if (!preg_match('/^[a-z0-9_.]{4,20}$/', $username)) { $errors[] = 'نام کاربری ۴ تا ۲۰ کاراکتر انگلیسی باشد.'; }
    if (strlen($password) < 10 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
        $errors[] = 'رمز عبور مدیر حداقل ۱۰ کاراکتر و شامل حرف و رقم باشد.';
    }

    if (!$errors) {
        try {
            $tables = kk_run_sql_file(__DIR__ . '/sql/schema.sql');
            $messages[] = 'ساختار دیتابیس ساخته شد (' . kk_fa_num($tables) . ' دستور).';

            db()->prepare('INSERT INTO users (fullname, phone, username, pass_hash, role) VALUES (?, ?, ?, ?, ?)')
                ->execute([$fullname, $phone, $username, password_hash($password, PASSWORD_DEFAULT), 'admin']);
            $messages[] = 'حساب مدیر ساخته شد.';

            if (!empty($_POST['seed'])) {
                $seeded = kk_run_sql_file(__DIR__ . '/sql/seed.sql');
                $messages[] = 'داده نمونه (دسته‌بندی‌ها و کتاب‌ها) درج شد: ' . kk_fa_num($seeded) . ' دستور.';
            }

            if (!empty($_POST['demo_coupon'])) {
                db()->prepare('INSERT IGNORE INTO coupons (code, percent, max_discount, min_subtotal, expires_at, usage_limit, used_count, active)
                               VALUES (?, ?, ?, ?, ?, ?, 0, 1)')
                    ->execute(['BOOK10', 10, 120000, 200000, date('Y-m-d', strtotime('+1 year')), 1000]);
                $messages[] = 'کد تخفیف نمونه BOOK10 ساخته شد.';
            }

            $finished = true;
        } catch (Throwable $e) {
            $errors[] = 'نصب ناموفق بود: ' . $e->getMessage();
        }
    }
}

$csrf = kk_csrf_token();
?>
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>نصب کتاب‌خانه</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:2rem;
    font-family:'Vazirmatn',Tahoma,system-ui,sans-serif;background:#070B16;color:#F4F6FC;line-height:1.9}
  .box{width:min(620px,100%);background:linear-gradient(170deg,#111D33,#0B1426);
    border:1px solid rgba(255,255,255,.09);border-radius:24px;padding:2rem;box-shadow:0 40px 80px -40px #000}
  h1{font-size:1.5rem;margin:0 0 .4rem;color:#E7B957}
  p{color:#9AAAC4;font-size:.9rem;margin:.3rem 0 1rem}
  label{display:block;font-size:.82rem;color:#9AAAC4;margin:.9rem 0 .3rem}
  input{width:100%;padding:.7rem .85rem;border-radius:12px;border:1px solid rgba(255,255,255,.12);
    background:#060B16;color:#F4F6FC;font-family:inherit;font-size:.9rem}
  input[type=checkbox]{width:auto;accent-color:#E7B957}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .check{display:flex;align-items:center;gap:.5rem;font-size:.85rem;color:#9AAAC4;margin-top:1rem}
  button{margin-top:1.5rem;width:100%;padding:.85rem;border:none;border-radius:14px;cursor:pointer;
    background:linear-gradient(135deg,#F2D07E,#E7B957 45%,#C99B45);color:#20180A;font-weight:800;
    font-family:inherit;font-size:.95rem}
  .msg,.err{border-radius:12px;padding:.7rem .9rem;font-size:.85rem;margin:.5rem 0}
  .msg{background:rgba(47,191,138,.12);border:1px solid rgba(47,191,138,.35);color:#8FE7C1}
  .err{background:rgba(232,105,122,.12);border:1px solid rgba(232,105,122,.35);color:#F5A3AE}
  code{background:rgba(255,255,255,.08);padding:.1em .4em;border-radius:6px;direction:ltr;display:inline-block}
  a{color:#E7B957}
  @media (max-width:560px){.row{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="box">
  <h1>نصب کتاب‌خانه</h1>
  <p>نسخه PHP 8.2 + MySQL — پیش از ادامه، فایل <code>.env</code> را از <code>.env.example</code> بساز و مقادیر دیتابیس را وارد کن.</p>

  <?php foreach ($messages as $m): ?><div class="msg"><?= kk_e($m) ?></div><?php endforeach; ?>
  <?php foreach ($errors as $e): ?><div class="err"><?= kk_e($e) ?></div><?php endforeach; ?>

  <?php if ($finished): ?>
    <div class="msg">نصب کامل شد. برای امنیت، فایل <code>install.php</code> را حذف کن و به داشبورد مدیریت برو.</div>
    <p><a href="admin/index.php">ورود به داشبورد مدیریت</a> · <a href="./">مشاهده فروشگاه</a></p>
  <?php elseif ($already): ?>
    <div class="err">این نصب از قبل انجام شده است. اگر نیاز به نصب مجدد داری، ابتدا جدول‌ها را پاک کن یا فایل <code>install.php</code> را حذف نما.</div>
    <p><a href="admin/index.php">ورود به داشبورد مدیریت</a></p>
  <?php else: ?>
    <form method="post" autocomplete="off">
      <input type="hidden" name="csrf" value="<?= kk_e($csrf) ?>">
      <label for="fullname">نام و نام خانوادگی مدیر</label>
      <input id="fullname" name="fullname" required>
      <div class="row">
        <div>
          <label for="phone">شماره موبایل</label>
          <input id="phone" name="phone" inputmode="numeric" placeholder="09121234567" required>
        </div>
        <div>
          <label for="username">نام کاربری</label>
          <input id="username" name="username" required>
        </div>
      </div>
      <label for="password">رمز عبور (حداقل ۱۰ کاراکتر، حرف و رقم)</label>
      <input id="password" name="password" type="password" required>
      <label class="check"><input type="checkbox" name="seed" value="1" checked> درج دسته‌بندی‌ها و کتاب‌های نمونه</label>
      <label class="check"><input type="checkbox" name="demo_coupon" value="1" checked> ساخت کد تخفیف نمونه BOOK10</label>
      <button type="submit">ساخت دیتابیس و حساب مدیر</button>
    </form>
  <?php endif; ?>
</div>
</body>
</html>
