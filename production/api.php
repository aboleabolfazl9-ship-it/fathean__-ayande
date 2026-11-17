<?php
declare(strict_types=1);

/**
 * کتاب‌خانه — API فروشگاه (نسخه PHP/MySQL)
 * همه پاسخ‌ها JSON هستند، جز بازگشت از درگاه پرداخت که redirect است.
 */

require_once __DIR__ . '/lib/config.php';
require_once __DIR__ . '/lib/helpers.php';
require_once __DIR__ . '/lib/payment.php';

kk_boot_session();

$action = isset($_GET['action']) ? (string) $_GET['action'] : '';

/* ---------- بازگشت از درگاه پرداخت ---------- */
if ($action === 'payment.callback') {
    $authority = (string) ($_GET['Authority'] ?? $_GET['authority'] ?? '');
    $status = (string) ($_GET['Status'] ?? $_GET['status'] ?? '');
    $site = rtrim((string) kk_env('APP_URL', ''), '/');

    $result = ['state' => 'failed', 'order' => ''];
    try {
        $stmt = db()->prepare('SELECT p.*, o.number, o.status AS order_status FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.authority = ?');
        $stmt->execute([$authority]);
        $payment = $stmt->fetch();
        if (!$payment) {
            throw new RuntimeException('تراکنش یافت نشد.');
        }
        $result['order'] = (string) $payment['number'];

        if ($status !== 'OK') {
            db()->prepare("UPDATE payments SET status = 'failed' WHERE id = ?")->execute([(int) $payment['id']]);
            throw new RuntimeException('پرداخت توسط کاربر لغو شد.');
        }
        if ($payment['status'] === 'verified') {
            $result['state'] = 'success';
            throw new RuntimeException('این تراکنش پیش‌تر تأیید شده است.');
        }

        $verify = kk_gateway_verify($authority, (int) $payment['amount']);
        if (!$verify['ok']) {
            db()->prepare("UPDATE payments SET status = 'failed', raw = ? WHERE id = ?")
                ->execute([json_encode($verify, JSON_UNESCAPED_UNICODE), (int) $payment['id']]);
            throw new RuntimeException($verify['message']);
        }

        db()->prepare("UPDATE payments SET status = 'verified', ref_id = ?, raw = ? WHERE id = ?")
            ->execute([$verify['ref_id'], json_encode($verify, JSON_UNESCAPED_UNICODE), (int) $payment['id']]);

        $orderStmt = db()->prepare('SELECT * FROM orders WHERE id = ?');
        $orderStmt->execute([(int) $payment['order_id']]);
        $order = $orderStmt->fetch();
        if ($order) {
            kk_order_fulfill($order);
        }
        $result['state'] = 'success';
    } catch (Throwable $e) {
        error_log('[ketabkhaneh][payment] ' . $e->getMessage());
    }
    header('Location: ' . $site . '/?payment=' . $result['state'] . '&order=' . urlencode($result['order']), true, 302);
    exit;
}

/* ---------- محافظت‌های عمومی API ---------- */
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$allowedOrigin = (string) kk_env('ALLOWED_ORIGIN', '');
if ($origin !== '' && $allowedOrigin !== '' && rtrim($origin, '/') !== rtrim($allowedOrigin, '/')) {
    kk_fail('مبدا درخواست مجاز نیست.', 403);
}

function kk_require_json(): void
{
    $type = (string) ($_SERVER['CONTENT_TYPE'] ?? '');
    if (!str_contains(strtolower($type), 'application/json')) {
        kk_fail('Content-Type باید application/json باشد.', 415);
    }
}

try {
    switch ($action) {
        case 'ping':
            kk_ok(['installed' => kk_installed()]);
            break;

        case 'books.list':
            kk_ok(kk_catalog());
            break;

        case 'coupons.validate': {
            kk_post_only();
            kk_require_json();
            $input = kk_body();
            $priced = kk_price_items($input['items'] ?? []);
            if ($priced['subtotal'] <= 0) {
                kk_fail('سبد خرید خالی است.', 422);
            }
            $coupon = kk_coupon_validate((string) ($input['code'] ?? ''), $priced['subtotal']);
            kk_ok($coupon + ['subtotal' => $priced['subtotal']]);
            break;
        }

        case 'auth.register': {
            kk_post_only();
            kk_require_json();
            $input = kk_body();
            $fullname = kk_str($input, 'fullname', 120);
            $phone = preg_replace('/\D/', '', (string) ($input['phone'] ?? '')) ?? '';
            $username = strtolower(kk_str($input, 'username', 40));
            $password = (string) ($input['password'] ?? '');

            if (mb_strlen($fullname) < 3) {
                kk_fail('نام و نام خانوادگی را کامل وارد کن.', 422);
            }
            if (!preg_match('/^09\d{9}$/', $phone)) {
                kk_fail('شماره موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.', 422);
            }
            if (!preg_match('/^[a-z0-9_.]{4,20}$/', $username)) {
                kk_fail('نام کاربری ۴ تا ۲۰ کاراکتر انگلیسی، عدد یا _ باشد.', 422);
            }
            if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
                kk_fail('رمز عبور حداقل ۸ کاراکتر و شامل حرف و رقم باشد.', 422);
            }

            $exists = db()->prepare('SELECT id FROM users WHERE username = ? OR phone = ?');
            $exists->execute([$username, $phone]);
            if ($exists->fetch()) {
                kk_fail('این نام کاربری یا شماره موبایل قبلاً ثبت شده است.', 409);
            }

            db()->prepare('INSERT INTO users (fullname, phone, username, pass_hash, role) VALUES (?, ?, ?, ?, ?)')
                ->execute([$fullname, $phone, $username, password_hash($password, PASSWORD_DEFAULT), 'customer']);

            $stmt = db()->prepare('SELECT id, fullname, phone, username, role FROM users WHERE id = ?');
            $stmt->execute([(int) db()->lastInsertId()]);
            $user = $stmt->fetch();
            kk_login_user($user);
            kk_sms($phone, $fullname . ' عزیز، به کتاب‌خانه خوش آمدی. کتاب، آغاز یک دنیای تازه است.');
            kk_ok(['user' => $user]);
            break;
        }

        case 'auth.login': {
            kk_post_only();
            kk_require_json();
            $input = kk_body();
            $identifier = mb_strtolower(kk_str($input, 'user', 80));
            $password = (string) ($input['password'] ?? '');
            if ($identifier === '' || $password === '') {
                kk_fail('نام کاربری و رمز عبور را وارد کن.', 422);
            }
            if (kk_login_too_many($identifier)) {
                kk_fail('تلاش‌های ناموفق زیاد بوده است؛ چند دقیقه بعد دوباره امتحان کن.', 429);
            }
            $stmt = db()->prepare('SELECT * FROM users WHERE username = ? OR phone = ?');
            $stmt->execute([$identifier, $identifier]);
            $user = $stmt->fetch();
            if (!$user || !password_verify($password, (string) $user['pass_hash'])) {
                kk_login_record_failure($identifier);
                kk_fail('نام کاربری یا رمز عبور نادرست است.', 401);
            }
            if ($user['status'] !== 'active') {
                kk_fail('این حساب غیرفعال شده است.', 403);
            }
            kk_login_clear_failures($identifier);
            kk_login_user($user);
            kk_ok(['user' => [
                'id' => (int) $user['id'], 'fullname' => $user['fullname'],
                'phone' => $user['phone'], 'username' => $user['username'], 'role' => $user['role'],
            ]]);
            break;
        }

        case 'auth.logout':
            kk_logout();
            kk_ok();
            break;

        case 'auth.me': {
            $user = kk_user();
            kk_ok(['user' => $user ? [
                'id' => (int) $user['id'], 'fullname' => $user['fullname'],
                'phone' => $user['phone'], 'username' => $user['username'], 'role' => $user['role'],
            ] : null, 'csrf' => kk_csrf_token()]);
            break;
        }

        case 'orders.create': {
            kk_post_only();
            kk_require_json();
            $input = kk_body();
            $customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];

            $recipient = kk_str($customer, 'recipient', 120);
            $phone = preg_replace('/\D/', '', (string) ($customer['phone'] ?? '')) ?? '';
            $province = kk_str($customer, 'province', 60);
            $city = kk_str($customer, 'city', 60);
            $address = kk_str($customer, 'address', 400);
            $postal = preg_replace('/\D/', '', (string) ($customer['postal'] ?? '')) ?? '';
            $note = kk_str($customer, 'note', 300);

            if (mb_strlen($recipient) < 3) { kk_fail('نام گیرنده را کامل وارد کن.', 422); }
            if (!preg_match('/^09\d{9}$/', $phone)) { kk_fail('شماره موبایل معتبر نیست.', 422); }
            if (mb_strlen($province) < 2 || mb_strlen($city) < 2) { kk_fail('استان و شهر را وارد کن.', 422); }
            if (mb_strlen($address) < 10) { kk_fail('نشانی کامل‌تری وارد کن.', 422); }
            if (!preg_match('/^\d{10}$/', $postal)) { kk_fail('کد پستی باید ۱۰ رقم باشد.', 422); }

            $priced = kk_price_items($input['items'] ?? []);
            if (!$priced['items']) {
                kk_fail('سبد خرید خالی است.', 422);
            }
            $subtotal = $priced['subtotal'];

            $method = (string) ($input['shippingMethod'] ?? 'post');
            if (!in_array($method, ['post', 'tipax', 'pickup'], true)) {
                $method = 'post';
            }

            $discount = 0;
            $couponCode = null;
            $couponRaw = strtoupper(trim((string) ($input['coupon'] ?? '')));
            if ($couponRaw !== '') {
                $coupon = kk_coupon_validate($couponRaw, $subtotal);
                $discount = $coupon['amount'];
                $couponCode = $coupon['code'];
            }

            $shipping = kk_shipping_cost($subtotal, $method);
            $total = max(0, $subtotal - $discount) + $shipping;
            $user = kk_user();
            $number = kk_order_number();

            $pdo = db();
            $pdo->beginTransaction();
            try {
                $pdo->prepare(
                    'INSERT INTO orders (number, user_id, status, subtotal, discount, shipping, total, coupon_code,
                        shipping_method, recipient, phone, province, city, address, postal, note)
                     VALUES (?, ?, "pending", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                )->execute([
                    $number, $user['id'] ?? null, $subtotal, $discount, $shipping, $total, $couponCode,
                    $method, $recipient, $phone, $province, $city, $address, $postal, $note,
                ]);
                $orderId = (int) $pdo->lastInsertId();
                $itemStmt = $pdo->prepare('INSERT INTO order_items (order_id, book_id, title, price, qty, line_total) VALUES (?, ?, ?, ?, ?, ?)');
                foreach ($priced['items'] as $item) {
                    $itemStmt->execute([$orderId, $item['book_id'], $item['title'], $item['price'], $item['qty'], $item['line_total']]);
                }
                if ($user) {
                    $pdo->prepare('INSERT INTO addresses (user_id, recipient, phone, province, city, address, postal) VALUES (?, ?, ?, ?, ?, ?, ?)')
                        ->execute([(int) $user['id'], $recipient, $phone, $province, $city, $address, $postal]);
                }
                $pdo->commit();
            } catch (Throwable $e) {
                $pdo->rollBack();
                throw $e;
            }

            $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();

            kk_sms($phone, 'سفارش ' . $number . ' ثبت شد و در انتظار پرداخت است. کتاب‌خانه');

            $paymentUrl = null;
            $paymentError = null;
            try {
                $paymentUrl = kk_gateway_start($order);
            } catch (Throwable $e) {
                $paymentError = $e->getMessage();
                error_log('[ketabkhaneh][payment-start] ' . $e->getMessage());
            }

            kk_ok([
                'order'          => kk_order_public($order, $priced['items']),
                'paymentUrl'     => $paymentUrl,
                'paymentError'   => $paymentError,
                'paymentConfigured' => $paymentUrl !== null,
            ]);
            break;
        }

        case 'orders.mine': {
            $user = kk_require_login();
            $stmt = db()->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 50');
            $stmt->execute([(int) $user['id']]);
            $orders = $stmt->fetchAll();
            $out = [];
            foreach ($orders as $order) {
                $out[] = kk_order_public($order, kk_order_items((int) $order['id']));
            }
            kk_ok(['orders' => $out]);
            break;
        }

        case 'orders.get': {
            $user = kk_require_login();
            $number = kk_str($_GET, 'number', 24);
            $stmt = db()->prepare('SELECT * FROM orders WHERE number = ?');
            $stmt->execute([$number]);
            $order = $stmt->fetch();
            if (!$order) {
                kk_fail('سفارش یافت نشد.', 404);
            }
            if ((int) $order['user_id'] !== (int) $user['id'] && $user['role'] !== 'admin') {
                kk_fail('دسترسی به این سفارش مجاز نیست.', 403);
            }
            kk_ok(['order' => kk_order_public($order, kk_order_items((int) $order['id']))]);
            break;
        }

        case 'payment.start': {
            kk_post_only();
            kk_require_json();
            $user = kk_require_login();
            $input = kk_body();
            $number = kk_str($input, 'number', 24);
            $stmt = db()->prepare('SELECT * FROM orders WHERE number = ?');
            $stmt->execute([$number]);
            $order = $stmt->fetch();
            if (!$order) {
                kk_fail('سفارش یافت نشد.', 404);
            }
            if ((int) $order['user_id'] !== (int) $user['id']) {
                kk_fail('دسترسی به این سفارش مجاز نیست.', 403);
            }
            if ($order['status'] !== 'pending') {
                kk_fail('این سفارش در وضعیت قابل پرداخت نیست.', 409);
            }
            try {
                $url = kk_gateway_start($order);
            } catch (RuntimeException $e) {
                kk_fail($e->getMessage(), 503);
            }
            kk_ok(['paymentUrl' => $url]);
            break;
        }

        default:
            kk_fail('عملیات ناشناخته است.', 404);
    }
} catch (RuntimeException $e) {
    kk_fail($e->getMessage(), 422);
} catch (Throwable $e) {
    error_log('[ketabkhaneh][api] ' . $e->getMessage());
    kk_fail('خطای داخلی سرور رخ داد.', 500);
}
