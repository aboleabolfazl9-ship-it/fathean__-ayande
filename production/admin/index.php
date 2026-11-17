<?php
declare(strict_types=1);

/**
 * کتاب‌خانه — داشبورد مدیریت
 * فقط کاربران با نقش admin. همه فرم‌ها با توکن CSRF محافظت می‌شوند.
 */

require_once dirname(__DIR__) . '/lib/config.php';
require_once dirname(__DIR__) . '/lib/helpers.php';

kk_boot_session();

$self = 'index.php';
$section = preg_replace('/[^a-z]/', '', (string) ($_GET['s'] ?? 'overview')) ?: 'overview';
$loginError = null;
$notice = null;
$error = null;

/* ---------------- خروج ---------------- */
if (isset($_GET['logout'])) {
    kk_logout();
    header('Location: index.php');
    exit;
}

/* ---------------- ورود مدیر ---------------- */
if (!kk_is_admin() && ($_POST['do'] ?? '') === 'login') {
    kk_csrf_check();
    $identifier = mb_strtolower(trim((string) ($_POST['identifier'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');
    try {
        if (kk_login_too_many($identifier)) {
            $loginError = 'تلاش‌های ناموفق زیاد بوده است؛ چند دقیقه بعد دوباره امتحان کن.';
        } else {
            $stmt = db()->prepare("SELECT * FROM users WHERE (username = ? OR phone = ?) AND role = 'admin'");
            $stmt->execute([$identifier, $identifier]);
            $admin = $stmt->fetch();
            if (!$admin || !password_verify($password, (string) $admin['pass_hash'])) {
                kk_login_record_failure($identifier);
                $loginError = 'نام کاربری یا رمز عبور نادرست است.';
            } elseif ($admin['status'] !== 'active') {
                $loginError = 'این حساب غیرفعال است.';
            } else {
                kk_login_clear_failures($identifier);
                kk_login_user($admin);
                header('Location: index.php');
                exit;
            }
        }
    } catch (Throwable $e) {
        $loginError = 'اتصال به دیتابیس برقرار نشد.';
    }
}

if (!kk_is_admin()) {
    ?>
    <!doctype html>
    <html lang="fa" dir="rtl">
    <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>ورود مدیر — کتاب‌خانه</title>
    <style>
      :root{color-scheme:dark}*{box-sizing:border-box}
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070B16;color:#F4F6FC;
        font-family:'Vazirmatn',Tahoma,system-ui,sans-serif;padding:2rem}
      .box{width:min(420px,100%);background:linear-gradient(170deg,#111D33,#0B1426);border:1px solid rgba(255,255,255,.09);
        border-radius:22px;padding:2rem;box-shadow:0 40px 80px -40px #000}
      h1{font-size:1.25rem;margin:0 0 .3rem;color:#E7B957}p{color:#9AAAC4;font-size:.85rem;margin:0 0 1.2rem}
      label{display:block;font-size:.8rem;color:#9AAAC4;margin:.9rem 0 .3rem}
      input{width:100%;padding:.7rem .85rem;border-radius:12px;border:1px solid rgba(255,255,255,.12);
        background:#060B16;color:#F4F6FC;font-family:inherit}
      button{margin-top:1.4rem;width:100%;padding:.8rem;border:none;border-radius:13px;cursor:pointer;
        background:linear-gradient(135deg,#F2D07E,#E7B957 45%,#C99B45);color:#20180A;font-weight:800;font-family:inherit}
      .err{background:rgba(232,105,122,.12);border:1px solid rgba(232,105,122,.35);color:#F5A3AE;
        padding:.65rem .8rem;border-radius:12px;font-size:.82rem;margin-bottom:.6rem}
    </style>
    </head>
    <body>
      <form class="box" method="post">
        <h1>داشبورد مدیریت</h1>
        <p>فروشگاه کتاب‌خانه</p>
        <?php if ($loginError): ?><div class="err"><?= kk_e($loginError) ?></div><?php endif; ?>
        <input type="hidden" name="csrf" value="<?= kk_e(kk_csrf_token()) ?>">
        <input type="hidden" name="do" value="login">
        <label for="identifier">نام کاربری یا موبایل مدیر</label>
        <input id="identifier" name="identifier" required autofocus>
        <label for="password">رمز عبور</label>
        <input id="password" name="password" type="password" required>
        <button type="submit">ورود</button>
        <p style="margin-top:1rem"><a href="../" style="color:#E7B957">بازگشت به فروشگاه</a></p>
      </form>
    </body>
    </html>
    <?php
    exit;
}

/* ---------------- عملیات فرم‌ها ---------------- */
$do = (string) ($_POST['do'] ?? '');
if ($do !== '' && $do !== 'login') {
    kk_csrf_check();
    try {
        switch ($do) {
            case 'book.save': {
                $id = kk_int($_POST, 'id');
                $slug = strtolower(preg_replace('/[^a-z0-9\-]/', '-', strtolower(kk_str($_POST, 'slug', 120))) ?? '');
                $slug = trim(preg_replace('/-+/', '-', $slug) ?? '', '-');
                if ($slug === '') { throw new RuntimeException('نامک (slug) انگلیسی کتاب الزامی است.'); }
                $data = [
                    'slug'         => $slug,
                    'title'        => kk_str($_POST, 'title', 200),
                    'author'       => kk_str($_POST, 'author', 160),
                    'publisher'    => kk_str($_POST, 'publisher', 160),
                    'category_id'  => kk_int($_POST, 'category_id'),
                    'price'        => kk_int($_POST, 'price'),
                    'off'          => max(0, min(90, kk_int($_POST, 'off'))),
                    'pages'        => kk_int($_POST, 'pages'),
                    'pub_year'     => kk_int($_POST, 'pub_year'),
                    'isbn'         => kk_str($_POST, 'isbn', 24),
                    'stock'        => max(0, kk_int($_POST, 'stock')),
                    'published_on' => kk_str($_POST, 'published_on', 10),
                    'book_rank'    => kk_int($_POST, 'book_rank', 100),
                    'pal'          => kk_int($_POST, 'pal'),
                    'orn'          => kk_int($_POST, 'orn'),
                    'description'  => kk_str($_POST, 'description', 4000),
                    'active'       => isset($_POST['active']) ? 1 : 0,
                ];
                if ($data['title'] === '' || $data['author'] === '' || $data['price'] <= 0 || $data['category_id'] <= 0) {
                    throw new RuntimeException('عنوان، نویسنده، دسته‌بندی و قیمت الزامی است.');
                }
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['published_on'])) {
                    $data['published_on'] = date('Y-m-d');
                }
                if ($id > 0) {
                    $sql = 'UPDATE books SET slug=:slug, title=:title, author=:author, publisher=:publisher, category_id=:category_id,
                            price=:price, off=:off, pages=:pages, pub_year=:pub_year, isbn=:isbn, stock=:stock,
                            published_on=:published_on, book_rank=:book_rank, pal=:pal, orn=:orn, description=:description, active=:active
                            WHERE id=:id';
                    $data['id'] = $id;
                    db()->prepare($sql)->execute($data);
                    $notice = 'کتاب به‌روزرسانی شد.';
                } else {
                    $sql = 'INSERT INTO books (slug,title,author,publisher,category_id,price,off,pages,pub_year,isbn,stock,published_on,book_rank,pal,orn,description,active)
                            VALUES (:slug,:title,:author,:publisher,:category_id,:price,:off,:pages,:pub_year,:isbn,:stock,:published_on,:book_rank,:pal,:orn,:description,:active)';
                    db()->prepare($sql)->execute($data);
                    $notice = 'کتاب جدید ثبت شد.';
                }
                break;
            }
            case 'book.delete': {
                db()->prepare('DELETE FROM books WHERE id = ?')->execute([kk_int($_POST, 'id')]);
                $notice = 'کتاب حذف شد.';
                break;
            }
            case 'category.save': {
                $id = kk_int($_POST, 'id');
                $slug = trim(preg_replace('/-+/', '-', strtolower(preg_replace('/[^a-z0-9\-]/', '-', strtolower(kk_str($_POST, 'slug', 64))) ?? '')) ?? '', '-');
                if ($slug === '') { throw new RuntimeException('نامک دسته‌بندی الزامی است.'); }
                $data = [
                    'slug' => $slug,
                    'title' => kk_str($_POST, 'title', 120),
                    'descr' => kk_str($_POST, 'descr', 255),
                    'glow' => kk_str($_POST, 'glow', 40) ?: 'rgba(75,145,255,.22)',
                    'soft' => kk_str($_POST, 'soft', 40) ?: 'rgba(75,145,255,.10)',
                    'icon' => kk_str($_POST, 'icon', 1000),
                    'sort_order' => kk_int($_POST, 'sort_order'),
                ];
                if ($data['title'] === '') { throw new RuntimeException('عنوان دسته‌بندی الزامی است.'); }
                if ($id > 0) {
                    $data['id'] = $id;
                    db()->prepare('UPDATE categories SET slug=:slug,title=:title,descr=:descr,glow=:glow,soft=:soft,icon=:icon,sort_order=:sort_order WHERE id=:id')->execute($data);
                    $notice = 'دسته‌بندی به‌روزرسانی شد.';
                } else {
                    db()->prepare('INSERT INTO categories (slug,title,descr,glow,soft,icon,sort_order) VALUES (:slug,:title,:descr,:glow,:soft,:icon,:sort_order)')->execute($data);
                    $notice = 'دسته‌بندی جدید ثبت شد.';
                }
                break;
            }
            case 'coupon.save': {
                $id = kk_int($_POST, 'id');
                $code = strtoupper(kk_str($_POST, 'code', 32));
                if (!preg_match('/^[A-Z0-9]{3,32}$/', $code)) { throw new RuntimeException('کد تخفیف باید ۳ تا ۳۲ کاراکتر انگلیسی یا عدد باشد.'); }
                $percent = max(1, min(90, kk_int($_POST, 'percent')));
                $data = [
                    'code' => $code,
                    'percent' => $percent,
                    'max_discount' => max(0, kk_int($_POST, 'max_discount')),
                    'min_subtotal' => max(0, kk_int($_POST, 'min_subtotal')),
                    'expires_at' => kk_str($_POST, 'expires_at', 10) ?: date('Y-m-d', strtotime('+1 month')),
                    'usage_limit' => max(1, kk_int($_POST, 'usage_limit', 1)),
                    'active' => isset($_POST['active']) ? 1 : 0,
                ];
                if ($id > 0) {
                    $data['id'] = $id;
                    db()->prepare('UPDATE coupons SET code=:code,percent=:percent,max_discount=:max_discount,min_subtotal=:min_subtotal,expires_at=:expires_at,usage_limit=:usage_limit,active=:active WHERE id=:id')->execute($data);
                    $notice = 'کد تخفیف به‌روزرسانی شد.';
                } else {
                    db()->prepare('INSERT INTO coupons (code,percent,max_discount,min_subtotal,expires_at,usage_limit,active) VALUES (:code,:percent,:max_discount,:min_subtotal,:expires_at,:usage_limit,:active)')->execute($data);
                    $notice = 'کد تخفیف ساخته شد.';
                }
                break;
            }
            case 'coupon.delete': {
                db()->prepare('DELETE FROM coupons WHERE id = ?')->execute([kk_int($_POST, 'id')]);
                $notice = 'کد تخفیف حذف شد.';
                break;
            }
            case 'order.status': {
                $status = (string) ($_POST['status'] ?? '');
                if (!in_array($status, ['pending', 'paid', 'sent', 'canceled'], true)) {
                    throw new RuntimeException('وضعیت نامعتبر است.');
                }
                $orderId = kk_int($_POST, 'id');
                $stmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
                $stmt->execute([$orderId]);
                $order = $stmt->fetch();
                if (!$order) { throw new RuntimeException('سفارش یافت نشد.'); }
                if ($status === 'paid') {
                    kk_order_fulfill($order);
                } else {
                    db()->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$status, $orderId]);
                }
                kk_sms((string) $order['phone'], 'وضعیت سفارش ' . $order['number'] . ' به «' . $status . '» تغییر کرد. کتاب‌خانه');
                $notice = 'وضعیت سفارش به‌روزرسانی شد.';
                break;
            }
            case 'customer.toggle': {
                $id = kk_int($_POST, 'id');
                $me = kk_user();
                if ((int) $me['id'] === $id) { throw new RuntimeException('وضعیت حساب خودت را نمی‌توانی تغییر دهی.'); }
                db()->prepare("UPDATE users SET status = IF(status = 'active', 'blocked', 'active') WHERE id = ? AND role = 'customer'")->execute([$id]);
                $notice = 'وضعیت مشتری تغییر کرد.';
                break;
            }
            case 'backup.create': {
                $dir = KK_ROOT . '/' . trim((string) kk_env('BACKUP_DIR', 'storage/backups'), '/');
                if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
                    throw new RuntimeException('ساخت پوشه پشتیبان ممکن نشد.');
                }
                $tables = ['categories', 'users', 'books', 'coupons', 'orders', 'order_items', 'addresses', 'payments', 'sms_log'];
                $pdo = db();
                $dump = "-- کتاب‌خانه backup " . date('c') . "\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n";
                foreach ($tables as $table) {
                    $row = $pdo->query('SHOW CREATE TABLE `' . $table . '`')->fetch();
                    $dump .= "\nDROP TABLE IF EXISTS `$table`;\n" . ($row['Create Table'] ?? '') . ";\n";
                    foreach ($pdo->query('SELECT * FROM `' . $table . '`')->fetchAll() as $record) {
                        $cols = array_keys($record);
                        $vals = array_map(static fn($v) => $v === null ? 'NULL' : $pdo->quote((string) $v), array_values($record));
                        $dump .= 'INSERT INTO `' . $table . '` (`' . implode('`,`', $cols) . '`) VALUES (' . implode(',', $vals) . ");\n";
                    }
                }
                $dump .= "SET FOREIGN_KEY_CHECKS=1;\n";
                $file = 'backup-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.sql';
                if (file_put_contents($dir . '/' . $file, $dump) === false) {
                    throw new RuntimeException('نوشتن فایل پشتیبان ممکن نشد.');
                }
                @chmod($dir . '/' . $file, 0640);
                $notice = 'پشتیبان ساخته شد: ' . $file;
                break;
            }
            default:
                throw new RuntimeException('عملیات ناشناخته است.');
        }
    } catch (Throwable $e) {
        $error = $e->getMessage();
        if ($e instanceof PDOException) {
            $error = 'خطای دیتابیس: ' . $e->getMessage();
        }
    }
    if ($error === null) {
        header('Location: ' . $self . '?s=' . $section . '&ok=' . urlencode((string) $notice));
        exit;
    }
}
if (isset($_GET['ok'])) {
    $notice = (string) $_GET['ok'];
}

/* ---------------- داده صفحات ---------------- */
$categories = db()->query('SELECT * FROM categories ORDER BY sort_order, id')->fetchAll();
$editBook = null;
if ($section === 'books' && isset($_GET['edit'])) {
    $stmt = db()->prepare('SELECT * FROM books WHERE id = ?');
    $stmt->execute([(int) $_GET['edit']]);
    $editBook = $stmt->fetch() ?: null;
}
$editCategory = null;
if ($section === 'categories' && isset($_GET['edit'])) {
    $stmt = db()->prepare('SELECT * FROM categories WHERE id = ?');
    $stmt->execute([(int) $_GET['edit']]);
    $editCategory = $stmt->fetch() ?: null;
}
$editCoupon = null;
if ($section === 'coupons' && isset($_GET['edit'])) {
    $stmt = db()->prepare('SELECT * FROM coupons WHERE id = ?');
    $stmt->execute([(int) $_GET['edit']]);
    $editCoupon = $stmt->fetch() ?: null;
}

function adm_head(string $title, string $section): void
{
    global $self;
    ?>
    <!doctype html>
    <html lang="fa" dir="rtl">
    <head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title><?= kk_e($title) ?> — مدیریت کتاب‌خانه</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
    <style>
      :root{color-scheme:dark}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Vazirmatn',Tahoma,system-ui,sans-serif;background:#070B16;color:#F4F6FC;line-height:1.8;font-size:14.5px}
      a{color:#E7B957;text-decoration:none}
      .wrap{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
      aside{background:linear-gradient(180deg,#0B1426,#070C17);border-left:1px solid rgba(255,255,255,.08);padding:1.2rem}
      aside h2{font-size:1.05rem;color:#E7B957;margin-bottom:.3rem}
      aside p{font-size:.72rem;color:#6F819F;margin-bottom:1.2rem}
      aside nav{display:grid;gap:.2rem}
      aside nav a{padding:.55rem .7rem;border-radius:10px;color:#9AAAC4;font-size:.86rem}
      aside nav a:hover{background:rgba(255,255,255,.05);color:#F4F6FC}
      aside nav a.on{background:rgba(231,185,87,.13);color:#E7B957}
      main{padding:1.6rem 1.8rem;max-width:1200px}
      h1{font-size:1.25rem;margin-bottom:1rem}
      .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:.8rem;margin-bottom:1.4rem}
      .kpi{background:#111D33;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:1rem}
      .kpi span{font-size:.74rem;color:#9AAAC4;display:block}
      .kpi strong{font-size:1.2rem;color:#E7B957;display:block;margin-top:.2rem}
      .card{background:#111D33;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:1.1rem;margin-bottom:1.2rem}
      .card h2{font-size:1rem;margin-bottom:.8rem}
      table{width:100%;border-collapse:collapse;font-size:.82rem}
      th,td{padding:.55rem .5rem;text-align:start;border-bottom:1px solid rgba(255,255,255,.07);vertical-align:middle}
      th{color:#9AAAC4;font-weight:600;font-size:.76rem}
      tr:hover td{background:rgba(255,255,255,.02)}
      input,select,textarea{width:100%;padding:.5rem .65rem;border-radius:10px;border:1px solid rgba(255,255,255,.12);
        background:#060B16;color:#F4F6FC;font-family:inherit;font-size:.84rem}
      input[type=checkbox]{width:auto;accent-color:#E7B957}
      label{font-size:.76rem;color:#9AAAC4;display:block;margin:.55rem 0 .25rem}
      button,.btn{display:inline-block;padding:.5rem .9rem;border-radius:10px;border:none;cursor:pointer;
        background:linear-gradient(135deg,#F2D07E,#E7B957 45%,#C99B45);color:#20180A;font-weight:700;
        font-family:inherit;font-size:.82rem}
      .btn-sm{padding:.28rem .6rem;font-size:.74rem}
      .btn-ghost{background:rgba(255,255,255,.06);color:#F4F6FC;border:1px solid rgba(255,255,255,.12)}
      .btn-danger{background:rgba(232,105,122,.16);color:#F5A3AE;border:1px solid rgba(232,105,122,.35)}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:.9rem}
      .msg{padding:.65rem .9rem;border-radius:12px;font-size:.82rem;margin-bottom:1rem;
        background:rgba(47,191,138,.12);border:1px solid rgba(47,191,138,.35);color:#8FE7C1}
      .err{padding:.65rem .9rem;border-radius:12px;font-size:.82rem;margin-bottom:1rem;
        background:rgba(232,105,122,.12);border:1px solid rgba(232,105,122,.35);color:#F5A3AE}
      .row-actions{display:flex;gap:.35rem;flex-wrap:wrap}
      .tag{font-size:.7rem;padding:.1rem .45rem;border-radius:99px;border:1px solid rgba(255,255,255,.16);color:#9AAAC4}
      .tag.paid{color:#8FE7C1;border-color:rgba(47,191,138,.4)}
      .tag.pending{color:#F0CE8A;border-color:rgba(231,185,87,.4)}
      .tag.sent{color:#A9C8FF;border-color:rgba(75,145,255,.4)}
      .tag.canceled{color:#F5A3AE;border-color:rgba(232,105,122,.4)}
      .muted{color:#9AAAC4;font-size:.8rem}
      .stack{display:grid;gap:.6rem}
      @media(max-width:860px){.wrap{grid-template-columns:1fr}aside{border-left:none;border-bottom:1px solid rgba(255,255,255,.08)}
        aside nav{grid-auto-flow:column;grid-auto-columns:max-content;overflow-x:auto}
        .grid2,.grid3{grid-template-columns:1fr}main{padding:1.2rem}}
    </style>
    </head>
    <body>
    <div class="wrap">
      <aside>
        <h2>کتاب‌خانه</h2>
        <p>پنل مدیریت فروشگاه</p>
        <nav>
          <?php
          $items = [
              'overview' => 'نمای کلی',
              'orders' => 'سفارش‌ها',
              'books' => 'کتاب‌ها',
              'categories' => 'دسته‌بندی‌ها',
              'coupons' => 'کدهای تخفیف',
              'customers' => 'مشتریان',
              'reports' => 'گزارش‌ها',
              'backup' => 'پشتیبان‌گیری',
          ];
          foreach ($items as $key => $label) {
              echo '<a class="' . ($section === $key ? 'on' : '') . '" href="' . $self . '?s=' . $key . '">' . kk_e($label) . '</a>';
          }
          ?>
        </nav>
        <p style="margin-top:1.4rem"><a href="../" target="_blank">مشاهده فروشگاه ↗</a></p>
        <p><a href="index.php?logout=1">خروج از حساب</a></p>
      </aside>
      <main>
        <h1><?= kk_e($title) ?></h1>
        <?php
}

function adm_foot(): void
{
    echo '</main></div></body></html>';
}

function status_tag(string $status): string
{
    $labels = ['pending' => 'در انتظار پرداخت', 'paid' => 'پرداخت‌شده', 'sent' => 'ارسال‌شده', 'canceled' => 'لغو‌شده'];
    return '<span class="tag ' . kk_e($status) . '">' . kk_e($labels[$status] ?? $status) . '</span>';
}

/* ---------------- خروجی ---------------- */
switch ($section) {
    case 'orders':
        adm_head('سفارش‌ها', $section);
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        if ($error) { echo '<div class="err">' . kk_e($error) . '</div>'; }

        if (isset($_GET['view'])) {
            $stmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
            $stmt->execute([(int) $_GET['view']]);
            $order = $stmt->fetch();
            if ($order) {
                $items = kk_order_items((int) $order['id']);
                echo '<div class="card"><h2>سفارش ' . kk_e($order['number']) . ' ' . status_tag($order['status']) . '</h2>';
                echo '<p class="muted">' . kk_e($order['recipient']) . ' — ' . kk_e($order['phone']) . ' — '
                    . kk_e($order['province'] . '، ' . $order['city']) . ' — ' . kk_e($order['address'])
                    . ' — کد پستی ' . kk_e($order['postal']) . '</p>';
                echo '<table style="margin-top:.8rem"><thead><tr><th>کتاب</th><th>تعداد</th><th>قیمت</th><th>جمع</th></tr></thead><tbody>';
                foreach ($items as $item) {
                    echo '<tr><td>' . kk_e($item['title']) . '</td><td>' . kk_e(kk_fa_num($item['qty'])) . '</td><td>'
                        . kk_e(kk_money($item['price'])) . '</td><td>' . kk_e(kk_money($item['line_total'])) . '</td></tr>';
                }
                echo '</tbody></table>';
                echo '<div class="grid3" style="margin-top:1rem"><div class="kpi"><span>جمع کالاها</span><strong>' . kk_e(kk_money($order['subtotal'])) . '</strong></div>'
                    . '<div class="kpi"><span>تخفیف</span><strong>' . kk_e(kk_money($order['discount'])) . '</strong></div>'
                    . '<div class="kpi"><span>ارسال</span><strong>' . kk_e(kk_money($order['shipping'])) . '</strong></div></div>';
                echo '<div class="kpi" style="margin-top:.8rem"><span>مبلغ کل</span><strong>' . kk_e(kk_money($order['total'])) . '</strong></div>';
                echo '<div class="row-actions" style="margin-top:1rem">';
                echo '<form method="post">' . '<input type="hidden" name="csrf" value="' . kk_e(kk_csrf_token()) . '">'
                    . '<input type="hidden" name="do" value="order.status"><input type="hidden" name="id" value="' . (int) $order['id'] . '">'
                    . '<select name="status" style="width:auto;display:inline-block">';
                foreach (['pending' => 'در انتظار پرداخت', 'paid' => 'پرداخت‌شده', 'sent' => 'ارسال‌شده', 'canceled' => 'لغو‌شده'] as $k => $v) {
                    echo '<option value="' . $k . '"' . ($order['status'] === $k ? ' selected' : '') . '>' . kk_e($v) . '</option>';
                }
                echo '</select> <button class="btn-sm" type="submit">تغییر وضعیت</button></form>';
                echo '<a class="btn btn-ghost btn-sm" href="invoice.php?number=' . urlencode((string) $order['number']) . '" target="_blank">چاپ فاکتور</a>';
                echo '<a class="btn btn-ghost btn-sm" href="index.php?s=orders">بازگشت</a>';
                echo '</div></div>';
            } else {
                echo '<div class="err">سفارش یافت نشد.</div>';
            }
            adm_foot();
            break;
        }

        $filter = (string) ($_GET['status'] ?? '');
        $sql = 'SELECT * FROM orders' . (in_array($filter, ['pending', 'paid', 'sent', 'canceled'], true) ? ' WHERE status = ' . db()->quote($filter) : '') . ' ORDER BY id DESC LIMIT 100';
        $orders = db()->query($sql)->fetchAll();
        echo '<div class="card"><div class="row-actions" style="margin-bottom:.6rem">';
        foreach (['' => 'همه', 'pending' => 'در انتظار پرداخت', 'paid' => 'پرداخت‌شده', 'sent' => 'ارسال‌شده', 'canceled' => 'لغو‌شده'] as $k => $v) {
            echo '<a class="btn btn-sm ' . ($filter === $k ? '' : 'btn-ghost') . '" href="index.php?s=orders' . ($k ? '&status=' . $k : '') . '">' . kk_e($v) . '</a>';
        }
        echo '</div><table><thead><tr><th>شماره</th><th>مشتری</th><th>گیرنده</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th></th></tr></thead><tbody>';
        foreach ($orders as $order) {
            echo '<tr><td style="direction:ltr">' . kk_e($order['number']) . '</td>';
            echo '<td>' . kk_e($order['phone']) . '</td>';
            echo '<td>' . kk_e($order['recipient']) . '</td>';
            echo '<td>' . kk_e(kk_money($order['total'])) . '</td>';
            echo '<td>' . status_tag($order['status']) . '</td>';
            echo '<td>' . kk_e(kk_fa_date($order['created_at'])) . '</td>';
            echo '<td><a class="btn btn-ghost btn-sm" href="index.php?s=orders&view=' . (int) $order['id'] . '">جزئیات</a></td></tr>';
        }
        echo '</tbody></table>';
        if (!$orders) { echo '<p class="muted" style="margin-top:.8rem">سفارشی با این فیلتر وجود ندارد.</p>'; }
        echo '</div>';
        adm_foot();
        break;

    case 'books':
        adm_head('مدیریت کتاب‌ها', $section);
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        if ($error) { echo '<div class="err">' . kk_e($error) . '</div>'; }
        $form = $editBook ?: [
            'id' => 0, 'slug' => '', 'title' => '', 'author' => '', 'publisher' => '', 'category_id' => $categories[0]['id'] ?? 0,
            'price' => '', 'off' => 0, 'pages' => '', 'pub_year' => '', 'isbn' => '', 'stock' => 0,
            'published_on' => date('Y-m-d'), 'book_rank' => 100, 'pal' => 0, 'orn' => 0, 'description' => '', 'active' => 1,
        ];
        ?>
        <div class="card">
          <h2><?= $editBook ? 'ویرایش کتاب' : 'افزودن کتاب' ?></h2>
          <form method="post">
            <input type="hidden" name="csrf" value="<?= kk_e(kk_csrf_token()) ?>">
            <input type="hidden" name="do" value="book.save">
            <input type="hidden" name="id" value="<?= (int) $form['id'] ?>">
            <div class="grid2">
              <div><label>عنوان</label><input name="title" value="<?= kk_e($form['title']) ?>" required></div>
              <div><label>نامک انگلیسی (برای URL و شناسه)</label><input name="slug" value="<?= kk_e($form['slug']) ?>" placeholder="bof-kur" required></div>
              <div><label>نویسنده</label><input name="author" value="<?= kk_e($form['author']) ?>" required></div>
              <div><label>ناشر</label><input name="publisher" value="<?= kk_e($form['publisher']) ?>"></div>
              <div><label>دسته‌بندی</label><select name="category_id">
                <?php foreach ($categories as $c): ?>
                  <option value="<?= (int) $c['id'] ?>" <?= (int) $c['id'] === (int) $form['category_id'] ? 'selected' : '' ?>><?= kk_e($c['title']) ?></option>
                <?php endforeach; ?>
              </select></div>
              <div><label>قیمت (تومان)</label><input name="price" type="number" min="1000" value="<?= kk_e($form['price']) ?>" required></div>
              <div><label>درصد تخفیف (۰ = بدون تخفیف)</label><input name="off" type="number" min="0" max="90" value="<?= (int) $form['off'] ?>"></div>
              <div><label>موجودی انبار</label><input name="stock" type="number" min="0" value="<?= (int) $form['stock'] ?>"></div>
              <div><label>تعداد صفحه</label><input name="pages" type="number" min="0" value="<?= (int) $form['pages'] ?>"></div>
              <div><label>سال چاپ</label><input name="pub_year" type="number" min="1200" max="1500" value="<?= (int) $form['pub_year'] ?>"></div>
              <div><label>شابک</label><input name="isbn" value="<?= kk_e($form['isbn']) ?>"></div>
              <div><label>تاریخ انتشار (برای مرتب‌سازی «جدیدترین»)</label><input name="published_on" type="date" value="<?= kk_e($form['published_on']) ?>"></div>
              <div><label>رتبه محبوبیت (کمتر = بالاتر)</label><input name="book_rank" type="number" min="1" value="<?= (int) $form['book_rank'] ?>"></div>
              <div><label>طرح جلد (۰ تا ۵)</label><input name="pal" type="number" min="0" max="5" value="<?= (int) $form['pal'] ?>"></div>
              <div><label>نشان جلد (۰ تا ۴)</label><input name="orn" type="number" min="0" max="4" value="<?= (int) $form['orn'] ?>"></div>
            </div>
            <label>توضیحات</label><textarea name="description" rows="4"><?= kk_e($form['description']) ?></textarea>
            <label><span><input type="checkbox" name="active" value="1" <?= (int) $form['active'] === 1 ? 'checked' : '' ?>> نمایش در فروشگاه</span></label>
            <div class="row-actions" style="margin-top:.9rem">
              <button type="submit"><?= $editBook ? 'ذخیره تغییرات' : 'ثبت کتاب' ?></button>
              <?php if ($editBook): ?><a class="btn btn-ghost" href="index.php?s=books">انصراف</a><?php endif; ?>
            </div>
          </form>
        </div>
        <?php
        $books = db()->query('SELECT b.*, c.title AS category_title FROM books b JOIN categories c ON c.id = b.category_id ORDER BY b.id DESC')->fetchAll();
        echo '<div class="card"><h2>فهرست کتاب‌ها (' . kk_fa_num(count($books)) . ')</h2><table><thead><tr><th>عنوان</th><th>نویسنده</th><th>دسته</th><th>قیمت</th><th>تخفیف</th><th>موجودی</th><th>وضعیت</th><th></th></tr></thead><tbody>';
        foreach ($books as $b) {
            echo '<tr><td>' . kk_e($b['title']) . '</td><td>' . kk_e($b['author']) . '</td><td>' . kk_e($b['category_title']) . '</td>'
                . '<td>' . kk_e(kk_money($b['price'])) . '</td><td>' . kk_e(kk_fa_num($b['off'])) . '٪</td>'
                . '<td' . ((int) $b['stock'] <= 3 ? ' style="color:#F5A3AE"' : '') . '>' . kk_e(kk_fa_num($b['stock'])) . '</td>'
                . '<td>' . ((int) $b['active'] === 1 ? 'فعال' : 'غیرفعال') . '</td>'
                . '<td><div class="row-actions"><a class="btn btn-ghost btn-sm" href="index.php?s=books&edit=' . (int) $b['id'] . '">ویرایش</a>'
                . '<form method="post" onsubmit="return confirm(\'این کتاب حذف شود؟\')"><input type="hidden" name="csrf" value="' . kk_e(kk_csrf_token()) . '">'
                . '<input type="hidden" name="do" value="book.delete"><input type="hidden" name="id" value="' . (int) $b['id'] . '">'
                . '<button class="btn-danger btn-sm" type="submit">حذف</button></form></div></td></tr>';
        }
        echo '</tbody></table></div>';
        adm_foot();
        break;

    case 'categories':
        adm_head('دسته‌بندی‌ها', $section);
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        if ($error) { echo '<div class="err">' . kk_e($error) . '</div>'; }
        $form = $editCategory ?: ['id' => 0, 'slug' => '', 'title' => '', 'descr' => '', 'glow' => 'rgba(75,145,255,.22)', 'soft' => 'rgba(75,145,255,.10)', 'icon' => '', 'sort_order' => 0];
        ?>
        <div class="card">
          <h2><?= $editCategory ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی' ?></h2>
          <form method="post">
            <input type="hidden" name="csrf" value="<?= kk_e(kk_csrf_token()) ?>">
            <input type="hidden" name="do" value="category.save">
            <input type="hidden" name="id" value="<?= (int) $form['id'] ?>">
            <div class="grid2">
              <div><label>عنوان</label><input name="title" value="<?= kk_e($form['title']) ?>" required></div>
              <div><label>نامک انگلیسی</label><input name="slug" value="<?= kk_e($form['slug']) ?>" required></div>
              <div><label>توضیح کوتاه</label><input name="descr" value="<?= kk_e($form['descr']) ?>"></div>
              <div><label>ترتیب نمایش</label><input name="sort_order" type="number" value="<?= (int) $form['sort_order'] ?>"></div>
              <div><label>رنگ درخشش</label><input name="glow" value="<?= kk_e($form['glow']) ?>"></div>
              <div><label>رنگ پس‌زمینه ملایم</label><input name="soft" value="<?= kk_e($form['soft']) ?>"></div>
            </div>
            <label>آیکون (SVG خطی)</label><textarea name="icon" rows="2"><?= kk_e($form['icon']) ?></textarea>
            <div class="row-actions" style="margin-top:.9rem">
              <button type="submit">ذخیره</button>
              <?php if ($editCategory): ?><a class="btn btn-ghost" href="index.php?s=categories">انصراف</a><?php endif; ?>
            </div>
          </form>
        </div>
        <?php
        echo '<div class="card"><h2>فهرست دسته‌بندی‌ها</h2><table><thead><tr><th>عنوان</th><th>نامک</th><th>ترتیب</th><th>تعداد کتاب</th><th></th></tr></thead><tbody>';
        foreach ($categories as $c) {
            $stmt = db()->prepare('SELECT COUNT(*) FROM books WHERE category_id = ?');
            $stmt->execute([(int) $c['id']]);
            $count = (int) $stmt->fetchColumn();
            echo '<tr><td>' . kk_e($c['title']) . '</td><td style="direction:ltr">' . kk_e($c['slug']) . '</td><td>' . kk_e(kk_fa_num($c['sort_order'])) . '</td>'
                . '<td>' . kk_e(kk_fa_num($count)) . '</td>'
                . '<td><a class="btn btn-ghost btn-sm" href="index.php?s=categories&edit=' . (int) $c['id'] . '">ویرایش</a></td></tr>';
        }
        echo '</tbody></table></div>';
        adm_foot();
        break;

    case 'coupons':
        adm_head('کدهای تخفیف', $section);
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        if ($error) { echo '<div class="err">' . kk_e($error) . '</div>'; }
        $form = $editCoupon ?: ['id' => 0, 'code' => '', 'percent' => 10, 'max_discount' => 120000, 'min_subtotal' => 200000, 'expires_at' => date('Y-m-d', strtotime('+1 month')), 'usage_limit' => 100, 'used_count' => 0, 'active' => 1];
        ?>
        <div class="card">
          <h2><?= $editCoupon ? 'ویرایش کد تخفیف' : 'ساخت کد تخفیف' ?></h2>
          <form method="post">
            <input type="hidden" name="csrf" value="<?= kk_e(kk_csrf_token()) ?>">
            <input type="hidden" name="do" value="coupon.save">
            <input type="hidden" name="id" value="<?= (int) $form['id'] ?>">
            <div class="grid3">
              <div><label>کد</label><input name="code" value="<?= kk_e($form['code']) ?>" required></div>
              <div><label>درصد تخفیف</label><input name="percent" type="number" min="1" max="90" value="<?= (int) $form['percent'] ?>"></div>
              <div><label>سقف تخفیف (تومان، ۰ = نامحدود)</label><input name="max_discount" type="number" min="0" value="<?= (int) $form['max_discount'] ?>"></div>
              <div><label>حداقل مبلغ سبد (تومان)</label><input name="min_subtotal" type="number" min="0" value="<?= (int) $form['min_subtotal'] ?>"></div>
              <div><label>تاریخ انقضا</label><input name="expires_at" type="date" value="<?= kk_e($form['expires_at']) ?>"></div>
              <div><label>سقف استفاده</label><input name="usage_limit" type="number" min="1" value="<?= (int) $form['usage_limit'] ?>"></div>
            </div>
            <label><span><input type="checkbox" name="active" value="1" <?= (int) $form['active'] === 1 ? 'checked' : '' ?>> فعال</span></label>
            <div class="row-actions" style="margin-top:.9rem">
              <button type="submit">ذخیره</button>
              <?php if ($editCoupon): ?><a class="btn btn-ghost" href="index.php?s=coupons">انصراف</a><?php endif; ?>
            </div>
          </form>
        </div>
        <?php
        $coupons = db()->query('SELECT * FROM coupons ORDER BY id DESC')->fetchAll();
        echo '<div class="card"><h2>کدهای تخفیف</h2><table><thead><tr><th>کد</th><th>درصد</th><th>سقف</th><th>حداقل سبد</th><th>انقضا</th><th>استفاده</th><th>وضعیت</th><th></th></tr></thead><tbody>';
        foreach ($coupons as $c) {
            echo '<tr><td style="direction:ltr">' . kk_e($c['code']) . '</td><td>' . kk_e(kk_fa_num($c['percent'])) . '٪</td>'
                . '<td>' . kk_e(kk_money($c['max_discount'])) . '</td><td>' . kk_e(kk_money($c['min_subtotal'])) . '</td>'
                . '<td>' . kk_e($c['expires_at']) . '</td><td>' . kk_e(kk_fa_num($c['used_count']) . ' / ' . kk_fa_num($c['usage_limit'])) . '</td>'
                . '<td>' . ((int) $c['active'] === 1 ? 'فعال' : 'غیرفعال') . '</td>'
                . '<td><div class="row-actions"><a class="btn btn-ghost btn-sm" href="index.php?s=coupons&edit=' . (int) $c['id'] . '">ویرایش</a>'
                . '<form method="post" onsubmit="return confirm(\'حذف شود؟\')"><input type="hidden" name="csrf" value="' . kk_e(kk_csrf_token()) . '">'
                . '<input type="hidden" name="do" value="coupon.delete"><input type="hidden" name="id" value="' . (int) $c['id'] . '">'
                . '<button class="btn-danger btn-sm" type="submit">حذف</button></form></div></td></tr>';
        }
        echo '</tbody></table></div>';
        adm_foot();
        break;

    case 'customers':
        adm_head('مشتریان', $section);
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        $customers = db()->query(
            'SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
                    (SELECT COALESCE(SUM(o.total),0) FROM orders o WHERE o.user_id = u.id AND o.status IN ("paid","sent")) AS spent
               FROM users u WHERE u.role = "customer" ORDER BY u.id DESC'
        )->fetchAll();
        echo '<div class="card"><h2>مشتریان (' . kk_fa_num(count($customers)) . ')</h2><table><thead><tr><th>نام</th><th>موبایل</th><th>نام کاربری</th><th>سفارش‌ها</th><th>خرید موفق</th><th>وضعیت</th><th></th></tr></thead><tbody>';
        foreach ($customers as $c) {
            echo '<tr><td>' . kk_e($c['fullname']) . '</td><td>' . kk_e($c['phone']) . '</td><td style="direction:ltr">' . kk_e($c['username']) . '</td>'
                . '<td>' . kk_e(kk_fa_num($c['order_count'])) . '</td><td>' . kk_e(kk_money($c['spent'])) . '</td>'
                . '<td>' . ($c['status'] === 'active' ? 'فعال' : 'مسدود') . '</td>'
                . '<td><form method="post"><input type="hidden" name="csrf" value="' . kk_e(kk_csrf_token()) . '">'
                . '<input type="hidden" name="do" value="customer.toggle"><input type="hidden" name="id" value="' . (int) $c['id'] . '">'
                . '<button class="btn-ghost btn-sm" type="submit">' . ($c['status'] === 'active' ? 'مسدود کردن' : 'فعال کردن') . '</button></form></td></tr>';
        }
        echo '</tbody></table></div>';
        adm_foot();
        break;

    case 'reports':
        adm_head('گزارش‌ها', $section);
        $revenue = (int) db()->query('SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ("paid","sent")')->fetchColumn();
        $paidCount = (int) db()->query('SELECT COUNT(*) FROM orders WHERE status IN ("paid","sent")')->fetchColumn();
        $pendingCount = (int) db()->query('SELECT COUNT(*) FROM orders WHERE status = "pending"')->fetchColumn();
        $avg = $paidCount ? (int) round($revenue / $paidCount) : 0;
        echo '<div class="cards">'
            . '<div class="kpi"><span>درآمد سفارش‌های موفق</span><strong>' . kk_e(kk_money($revenue)) . '</strong></div>'
            . '<div class="kpi"><span>سفارش‌های موفق</span><strong>' . kk_e(kk_fa_num($paidCount)) . '</strong></div>'
            . '<div class="kpi"><span>میانگین هر سفارش</span><strong>' . kk_e(kk_money($avg)) . '</strong></div>'
            . '<div class="kpi"><span>در انتظار پرداخت</span><strong>' . kk_e(kk_fa_num($pendingCount)) . '</strong></div>'
            . '</div>';

        $days = db()->query('SELECT DATE(COALESCE(paid_at, created_at)) d, COUNT(*) c, COALESCE(SUM(total),0) s
                             FROM orders WHERE status IN ("paid","sent") GROUP BY d ORDER BY d DESC LIMIT 14')->fetchAll();
        echo '<div class="card"><h2>فروش ۱۴ روز اخیر</h2><table><thead><tr><th>تاریخ</th><th>تعداد سفارش</th><th>مبلغ</th></tr></thead><tbody>';
        foreach ($days as $row) {
            echo '<tr><td>' . kk_e(kk_fa_date($row['d'])) . '</td><td>' . kk_e(kk_fa_num($row['c'])) . '</td><td>' . kk_e(kk_money($row['s'])) . '</td></tr>';
        }
        if (!$days) { echo '<tr><td colspan="3" class="muted">هنوز فروش ثبت‌شده‌ای وجود ندارد.</td></tr>'; }
        echo '</tbody></table></div>';

        $top = db()->query('SELECT oi.title, SUM(oi.qty) qty, SUM(oi.line_total) total
                            FROM order_items oi JOIN orders o ON o.id = oi.order_id
                            WHERE o.status IN ("paid","sent") GROUP BY oi.title ORDER BY qty DESC LIMIT 10')->fetchAll();
        echo '<div class="card"><h2>پرفروش‌های واقعی (بر اساس سفارش‌های موفق)</h2><table><thead><tr><th>کتاب</th><th>تعداد فروش</th><th>مبلغ</th></tr></thead><tbody>';
        foreach ($top as $row) {
            echo '<tr><td>' . kk_e($row['title']) . '</td><td>' . kk_e(kk_fa_num($row['qty'])) . '</td><td>' . kk_e(kk_money($row['total'])) . '</td></tr>';
        }
        if (!$top) { echo '<tr><td colspan="3" class="muted">پس از ثبت اولین پرداخت موفق، این گزارش پر می‌شود.</td></tr>'; }
        echo '</tbody></table></div>';

        $low = (int) kk_config('LOW_STOCK_ALERT', 5);
        $stock = db()->prepare('SELECT title, stock, price FROM books WHERE stock <= ? ORDER BY stock, title');
        $stock->execute([$low]);
        echo '<div class="card"><h2>گزارش موجودی (کمتر از ' . kk_e(kk_fa_num($low)) . ')</h2><table><thead><tr><th>کتاب</th><th>موجودی</th></tr></thead><tbody>';
        foreach ($stock->fetchAll() as $row) {
            echo '<tr><td>' . kk_e($row['title']) . '</td><td style="color:#F5A3AE">' . kk_e(kk_fa_num($row['stock'])) . '</td></tr>';
        }
        echo '</tbody></table></div>';
        adm_foot();
        break;

    case 'backup':
        adm_head('پشتیبان‌گیری و امنیت', $section);
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        if ($error) { echo '<div class="err">' . kk_e($error) . '</div>'; }
        $dir = KK_ROOT . '/' . trim((string) kk_env('BACKUP_DIR', 'storage/backups'), '/');

        if (isset($_GET['download'])) {
            $file = basename((string) $_GET['download']);
            $path = realpath($dir . '/' . $file);
            if ($path && str_starts_with($path, realpath($dir) ?: $dir) && preg_match('/^backup-[\w\-]+\.sql$/', $file)) {
                header('Content-Type: application/sql');
                header('Content-Disposition: attachment; filename="' . $file . '"');
                header('Content-Length: ' . (string) filesize($path));
                readfile($path);
                exit;
            }
            echo '<div class="err">فایل پشتیبان معتبر نیست.</div>';
        }

        echo '<div class="card"><h2>ساخت نسخه پشتیبان</h2>'
            . '<p class="muted">یک فایل SQL از دیتابیس در پوشه <code>' . kk_e($dir) . '</code> ساخته می‌شود. این پوشه نباید از وب قابل دسترسی باشد (فایل .htaccess آن را می‌بندد).</p>'
            . '<form method="post" style="margin-top:.8rem"><input type="hidden" name="csrf" value="' . kk_e(kk_csrf_token()) . '">'
            . '<input type="hidden" name="do" value="backup.create"><button type="submit">ساخت پشتیبان اکنون</button></form></div>';

        $files = is_dir($dir) ? glob($dir . '/backup-*.sql') ?: [] : [];
        rsort($files);
        echo '<div class="card"><h2>پشتیبان‌های موجود</h2><table><thead><tr><th>فایل</th><th>حجم</th><th>تاریخ</th><th></th></tr></thead><tbody>';
        foreach ($files as $f) {
            echo '<tr><td style="direction:ltr">' . kk_e(basename($f)) . '</td><td>' . kk_e(kk_fa_num(round(filesize($f) / 1024))) . ' کیلوبایت</td>'
                . '<td>' . kk_e(kk_fa_date(date('Y-m-d H:i:s', (int) filemtime($f)))) . '</td>'
                . '<td><a class="btn btn-ghost btn-sm" href="index.php?s=backup&download=' . urlencode(basename($f)) . '">دانلود</a></td></tr>';
        }
        if (!$files) { echo '<tr><td colspan="4" class="muted">هنوز پشتیبانی ساخته نشده است.</td></tr>'; }
        echo '</tbody></table></div>';

        echo '<div class="card"><h2>چک‌لیست امنیتی</h2><ul class="muted" style="padding-inline-start:1.1rem;display:grid;gap:.35rem">'
            . '<li>پس از نصب، فایل <code>install.php</code> را حذف کن.</li>'
            . '<li>فایل <code>.env</code> بیرون از وب‌روت یا با دسترسی 600 نگهداری شود.</li>'
            . '<li>HTTPS اجباری باشد؛ کوکی نشست با SameSite=Strict و HttpOnly ارسال می‌شود.</li>'
            . '<li>پوشه <code>storage/backups</code> با .htaccess بسته شده است؛ پشتیبان‌ها را به فضای ابری خصوصی منتقل کن.</li>'
            . '<li>رمزها با <code>password_hash</code> ذخیره می‌شوند؛ کوئری‌ها با PDO Prepared Statements اجرا می‌شوند.</li>'
            . '<li>کلید زرین‌پال و پیامک فقط در <code>.env</code> سمت سرور نگهداری شود.</li>'
            . '</ul></div>';
        adm_foot();
        break;

    default:
        adm_head('نمای کلی', 'overview');
        if ($notice) { echo '<div class="msg">' . kk_e($notice) . '</div>'; }
        $revenue = (int) db()->query('SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ("paid","sent")')->fetchColumn();
        $pending = (int) db()->query('SELECT COUNT(*) FROM orders WHERE status = "pending"')->fetchColumn();
        $customers = (int) db()->query('SELECT COUNT(*) FROM users WHERE role = "customer"')->fetchColumn();
        $bookCount = (int) db()->query('SELECT COUNT(*) FROM books')->fetchColumn();
        $low = (int) db()->query('SELECT COUNT(*) FROM books WHERE stock <= 3')->fetchColumn();
        echo '<div class="cards">'
            . '<div class="kpi"><span>فروش موفق</span><strong>' . kk_e(kk_money($revenue)) . '</strong></div>'
            . '<div class="kpi"><span>در انتظار پرداخت</span><strong>' . kk_e(kk_fa_num($pending)) . '</strong></div>'
            . '<div class="kpi"><span>مشتریان</span><strong>' . kk_e(kk_fa_num($customers)) . '</strong></div>'
            . '<div class="kpi"><span>کتاب‌ها</span><strong>' . kk_e(kk_fa_num($bookCount)) . '</strong></div>'
            . '<div class="kpi"><span>کمبود موجودی</span><strong>' . kk_e(kk_fa_num($low)) . '</strong></div>'
            . '</div>';
        $recent = db()->query('SELECT * FROM orders ORDER BY id DESC LIMIT 8')->fetchAll();
        echo '<div class="card"><h2>آخرین سفارش‌ها</h2><table><thead><tr><th>شماره</th><th>گیرنده</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th><th></th></tr></thead><tbody>';
        foreach ($recent as $order) {
            echo '<tr><td style="direction:ltr">' . kk_e($order['number']) . '</td><td>' . kk_e($order['recipient']) . '</td>'
                . '<td>' . kk_e(kk_money($order['total'])) . '</td><td>' . status_tag($order['status']) . '</td>'
                . '<td>' . kk_e(kk_fa_date($order['created_at'])) . '</td>'
                . '<td><a class="btn btn-ghost btn-sm" href="index.php?s=orders&view=' . (int) $order['id'] . '">جزئیات</a></td></tr>';
        }
        if (!$recent) { echo '<tr><td colspan="6" class="muted">هنوز سفارشی ثبت نشده است.</td></tr>'; }
        echo '</tbody></table></div>';
        adm_foot();
        break;
}
