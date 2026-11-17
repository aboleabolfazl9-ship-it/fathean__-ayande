<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

/* ---------- پاسخ JSON ---------- */

function kk_json(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function kk_fail(string $message, int $code = 400): void
{
    kk_json(['ok' => false, 'error' => $message], $code);
}

function kk_ok(array $data = []): void
{
    kk_json(array_merge(['ok' => true], $data));
}

/* ---------- ورودی ---------- */

function kk_body(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') {
        return $_POST;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function kk_post_only(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        kk_fail('این درخواست باید POST باشد.', 405);
    }
}

function kk_str(array $src, string $key, int $max = 500): string
{
    $value = isset($src[$key]) ? trim((string) $src[$key]) : '';
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $value) ?? '';
    return mb_substr($value, 0, $max);
}

function kk_int(array $src, string $key, int $default = 0): int
{
    return isset($src[$key]) ? (int) $src[$key] : $default;
}

function kk_fa_num($n): string
{
    $digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str_replace(range(0, 9), $digits, number_format((float) $n));
}

function kk_money($n): string
{
    return kk_fa_num($n) . ' تومان';
}

function kk_fa_date(?string $mysqlDate): string
{
    if (!$mysqlDate) {
        return '—';
    }
    $ts = strtotime($mysqlDate);
    if (!$ts) {
        return '—';
    }
    return kk_fa_num(date('Y', $ts)) . '/' . kk_fa_num(date('n', $ts)) . '/' . kk_fa_num(date('j', $ts));
}

function kk_e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function kk_ip(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return mb_substr((string) $ip, 0, 45);
}

/* ---------- احراز هویت ---------- */

function kk_user(): ?array
{
    if (empty($_SESSION['kk_user_id'])) {
        return null;
    }
    static $cached = null;
    if ($cached !== null && (int) $cached['id'] === (int) $_SESSION['kk_user_id']) {
        return $cached;
    }
    $stmt = db()->prepare('SELECT id, fullname, phone, username, role, status FROM users WHERE id = ?');
    $stmt->execute([(int) $_SESSION['kk_user_id']]);
    $user = $stmt->fetch();
    if (!$user || $user['status'] !== 'active') {
        kk_logout();
        return null;
    }
    $cached = $user;
    return $user;
}

function kk_login_user(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['kk_user_id'] = (int) $user['id'];
    $_SESSION['kk_role'] = $user['role'];
    $_SESSION['kk_csrf'] = bin2hex(random_bytes(24));
}

function kk_logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}

function kk_require_login(): array
{
    $user = kk_user();
    if (!$user) {
        kk_fail('برای این عملیات باید وارد حساب شوی.', 401);
    }
    return $user;
}

function kk_is_admin(): bool
{
    $user = kk_user();
    return $user !== null && $user['role'] === 'admin';
}

function kk_require_admin(): void
{
    if (!kk_is_admin()) {
        http_response_code(403);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>دسترسی غیرمجاز</title>'
            . '<body style="font-family:Tahoma;background:#0B1426;color:#F4F6FC;padding:3rem;text-align:center">'
            . '<h1>دسترسی غیرمجاز</h1><p>این بخش فقط برای مدیران است.</p>'
            . '<p><a style="color:#E7B957" href="../admin/index.php?login=1">ورود مدیر</a></p></body></html>';
        exit;
    }
}

/* ---------- CSRF (فرم‌های مدیریت) ---------- */

function kk_csrf_token(): string
{
    if (empty($_SESSION['kk_csrf'])) {
        $_SESSION['kk_csrf'] = bin2hex(random_bytes(24));
    }
    return $_SESSION['kk_csrf'];
}

function kk_csrf_check(): void
{
    $token = $_POST['csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!is_string($token) || $token === '' || !hash_equals((string) ($_SESSION['kk_csrf'] ?? ''), $token)) {
        http_response_code(419);
        exit('توکن امنیتی نامعتبر است. صفحه را دوباره بارگذاری کن.');
    }
}

/* ---------- محدودیت تلاش ورود ---------- */

function kk_login_too_many(string $identifier): bool
{
    $stmt = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE (identifier = ? OR ip = ?) AND created_at > (NOW() - INTERVAL 15 MINUTE)');
    $stmt->execute([$identifier, kk_ip()]);
    return (int) $stmt->fetchColumn() >= 8;
}

function kk_login_record_failure(string $identifier): void
{
    db()->prepare('INSERT INTO login_attempts (identifier, ip) VALUES (?, ?)')->execute([$identifier, kk_ip()]);
}

function kk_login_clear_failures(string $identifier): void
{
    db()->prepare('DELETE FROM login_attempts WHERE identifier = ? OR ip = ?')->execute([$identifier, kk_ip()]);
}

/* ---------- پیامک ---------- */

function kk_sms(string $phone, string $message): bool
{
    $provider = (string) kk_env('SMS_PROVIDER', 'log');
    $status = 'logged';
    $sent = false;

    if ($provider === 'kavenegar' && kk_env('SMS_API_KEY')) {
        $url = 'https://api.kavenegar.com/v1/' . rawurlencode((string) kk_env('SMS_API_KEY')) . '/sms/send.json';
        $post = http_build_query([
            'receptor' => $phone,
            'sender'   => (string) kk_env('SMS_SENDER', ''),
            'message'  => $message,
        ]);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $post,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 12,
        ]);
        $response = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $sent = $code >= 200 && $code < 300;
        $status = $sent ? 'sent' : 'failed';
        db()->prepare('INSERT INTO sms_log (phone, message, provider, status) VALUES (?, ?, ?, ?)')
            ->execute([$phone, mb_substr($message, 0, 480), 'kavenegar:' . $code, $status]);
        return $sent;
    }

    db()->prepare('INSERT INTO sms_log (phone, message, provider, status) VALUES (?, ?, ?, ?)')
        ->execute([$phone, mb_substr($message, 0, 480), 'log', $status]);
    return $sent;
}

/* ---------- کاتالوگ ---------- */

function kk_category_public(array $c): array
{
    return [
        'slug'  => $c['slug'],
        'title' => $c['title'],
        'desc'  => $c['descr'],
        'glow'  => $c['glow'],
        'soft'  => $c['soft'],
        'icon'  => $c['icon'] ?? '',
    ];
}

function kk_book_public(array $b): array
{
    return [
        'id'            => $b['slug'],
        'title'         => $b['title'],
        'author'        => $b['author'],
        'publisher'     => $b['publisher'],
        'category'      => $b['category_slug'],
        'categoryTitle' => $b['category_title'],
        'price'         => (int) $b['price'],
        'off'           => (int) $b['off'],
        'pages'         => (int) $b['pages'],
        'year'          => (int) $b['pub_year'],
        'isbn'          => $b['isbn'],
        'stock'         => (int) $b['stock'],
        'date'          => $b['published_on'],
        'rank'          => (int) $b['book_rank'],
        'pal'           => (int) $b['pal'],
        'orn'           => (int) $b['orn'],
        'desc'          => (string) ($b['description'] ?? ''),
        'cover'         => $b['cover_url'] ?? null,
    ];
}

function kk_catalog(): array
{
    $books = db()->query(
        'SELECT b.*, c.slug AS category_slug, c.title AS category_title
           FROM books b JOIN categories c ON c.id = b.category_id
          WHERE b.active = 1
          ORDER BY b.published_on DESC, b.id DESC'
    )->fetchAll();
    $categories = db()->query('SELECT * FROM categories ORDER BY sort_order, id')->fetchAll();
    return [
        'books'      => array_map('kk_book_public', $books),
        'categories' => array_map('kk_category_public', $categories),
    ];
}

/* ---------- سبد و سفارش ---------- */

/**
 * قیمت‌ها همیشه از دیتابیس خوانده می‌شوند؛ قیمت ارسالی مرورگر قابل اعتماد نیست.
 * @return array{items: array<int, array>, subtotal: int}
 */
function kk_price_items(array $rawItems): array
{
    $items = [];
    $subtotal = 0;
    foreach ($rawItems as $raw) {
        $slug = is_array($raw) ? (string) ($raw['id'] ?? '') : '';
        $qty = is_array($raw) ? max(1, (int) ($raw['qty'] ?? 0)) : 0;
        if ($slug === '' || $qty < 1) {
            continue;
        }
        $stmt = db()->prepare('SELECT id, slug, title, price, off, stock FROM books WHERE slug = ? AND active = 1');
        $stmt->execute([$slug]);
        $book = $stmt->fetch();
        if (!$book) {
            throw new RuntimeException('کتاب انتخاب‌شده یافت نشد.');
        }
        if ((int) $book['stock'] < $qty) {
            throw new RuntimeException('موجودی «' . $book['title'] . '» کافی نیست.');
        }
        $price = (int) $book['price'];
        if ((int) $book['off'] > 0) {
            $price = (int) round($price * (1 - ((int) $book['off'] / 100)));
        }
        $line = $price * $qty;
        $items[] = [
            'book_id'    => (int) $book['id'],
            'title'      => $book['title'],
            'price'      => $price,
            'qty'        => $qty,
            'line_total' => $line,
        ];
        $subtotal += $line;
    }
    return ['items' => $items, 'subtotal' => $subtotal];
}

/**
 * اعتبارسنجی کد تخفیف (سمت سرور).
 * @return array{code: string, percent: int, amount: int}|null
 */
function kk_coupon_validate(string $code, int $subtotal): array
{
    $code = strtoupper(trim($code));
    if ($code === '') {
        throw new RuntimeException('کد تخفیف را وارد کن.');
    }
    $stmt = db()->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1');
    $stmt->execute([$code]);
    $coupon = $stmt->fetch();
    if (!$coupon) {
        throw new RuntimeException('کد تخفیف معتبر نیست.');
    }
    if (strtotime((string) $coupon['expires_at'] . ' 23:59:59') < time()) {
        throw new RuntimeException('این کد تخفیف منقضی شده است.');
    }
    if ((int) $coupon['used_count'] >= (int) $coupon['usage_limit']) {
        throw new RuntimeException('سقف استفاده از این کد تکمیل شده است.');
    }
    if ($subtotal < (int) $coupon['min_subtotal']) {
        throw new RuntimeException('حداقل مبلغ سفارش برای این کد ' . kk_money((int) $coupon['min_subtotal']) . ' است.');
    }
    $amount = (int) round(($subtotal * (int) $coupon['percent']) / 100);
    if ((int) $coupon['max_discount'] > 0) {
        $amount = min($amount, (int) $coupon['max_discount']);
    }
    return ['code' => $coupon['code'], 'percent' => (int) $coupon['percent'], 'amount' => $amount];
}

function kk_order_number(): string
{
    return 'KK-' . strtoupper(base_convert((string) time(), 10, 36)) . strtoupper(bin2hex(random_bytes(2)));
}

function kk_order_public(array $order, array $items = []): array
{
    return [
        'number'    => $order['number'],
        'status'    => $order['status'],
        'subtotal'  => (int) $order['subtotal'],
        'discount'  => (int) $order['discount'],
        'shipping'  => (int) $order['shipping'],
        'total'     => (int) $order['total'],
        'createdAt' => $order['created_at'],
        'paidAt'    => $order['paid_at'],
        'customer'  => [
            'recipient' => $order['recipient'],
            'phone'     => $order['phone'],
            'province'  => $order['province'],
            'city'      => $order['city'],
            'address'   => $order['address'],
            'postal'    => $order['postal'],
            'note'      => $order['note'],
        ],
        'items'     => array_map(static function (array $i): array {
            return [
                'title'     => $i['title'],
                'qty'       => (int) $i['qty'],
                'price'     => (int) $i['price'],
                'lineTotal' => (int) $i['line_total'],
            ];
        }, $items),
    ];
}

function kk_order_items(int $orderId): array
{
    $stmt = db()->prepare('SELECT * FROM order_items WHERE order_id = ?');
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

/** کاهش موجودی پس از پرداخت موفق — فقط یک‌بار */
function kk_order_fulfill(array $order): void
{
    if ($order['status'] === 'paid' || $order['status'] === 'sent') {
        return;
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $items = kk_order_items((int) $order['id']);
        foreach ($items as $item) {
            if ($item['book_id']) {
                $pdo->prepare('UPDATE books SET stock = GREATEST(0, stock - ?) WHERE id = ?')
                    ->execute([(int) $item['qty'], (int) $item['book_id']]);
            }
        }
        if (!empty($order['coupon_code'])) {
            $pdo->prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?')
                ->execute([$order['coupon_code']]);
        }
        $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ? AND status = 'pending'")
            ->execute([(int) $order['id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    kk_sms(
        (string) $order['phone'],
        'سفارش ' . $order['number'] . ' با موفقیت پرداخت شد. کتاب‌خانه — کتاب، آغاز یک دنیای تازه است.'
    );
}
