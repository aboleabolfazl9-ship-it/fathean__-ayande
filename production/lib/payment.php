<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

/**
 * درگاه پرداخت ایرانی — زرین‌پال (REST v4)
 * مبالغ در دیتابیس «تومان» هستند و برای درگاه به «ریال» تبدیل می‌شوند.
 * تأیید پرداخت فقط روی سرور انجام می‌شود؛ پاسخ مرورگر هرگز ملاک نیست.
 */

function kk_http_json(string $url, array $payload): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        throw new RuntimeException('ارتباط با درگاه پرداخت برقرار نشد' . ($error ? ': ' . $error : ''));
    }
    $decoded = json_decode((string) $body, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('پاسخ درگاه پرداخت نامعتبر بود (HTTP ' . $status . ').');
    }
    return $decoded;
}

function kk_gateway_endpoint(string $path): string
{
    $sandbox = kk_env('ZARINPAL_SANDBOX', '0') === '1';
    $base = $sandbox ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
    return $base . $path;
}

function kk_gateway_merchant(): string
{
    $merchant = (string) kk_env('ZARINPAL_MERCHANT_ID', '');
    if ($merchant === '') {
        throw new RuntimeException('درگاه پرداخت روی این سرور پیکربندی نشده است (ZARINPAL_MERCHANT_ID خالی است).');
    }
    return $merchant;
}

/** درخواست پرداخت و ساخت رکورد payments؛ نشانی بازگشت از درگاه را برمی‌گرداند. */
function kk_gateway_start(array $order): string
{
    $merchant = kk_gateway_merchant();
    $amountToman = (int) $order['total'];
    if ($amountToman <= 0) {
        throw new RuntimeException('مبلغ سفارش برای پرداخت معتبر نیست.');
    }
    $amountRial = $amountToman * 10;

    $callback = rtrim((string) kk_env('APP_URL', ''), '/')
        . '/api.php?action=payment.callback&order=' . urlencode((string) $order['number']);

    $response = kk_http_json(kk_gateway_endpoint('/pg/v4/payment/request.json'), [
        'merchant_id'  => $merchant,
        'amount'       => $amountRial,
        'callback_url' => $callback,
        'description'  => 'سفارش ' . $order['number'] . ' — کتاب‌خانه',
        'metadata'     => ['email' => '', 'mobile' => (string) $order['phone']],
    ]);

    $authority = $response['data']['authority'] ?? null;
    if (!is_string($authority) || $authority === '') {
        $message = $response['errors']['message'] ?? 'پاسخ نامعتبر از درگاه';
        throw new RuntimeException('درخواست پرداخت ناموفق بود: ' . $message);
    }

    db()->prepare('INSERT INTO payments (order_id, gateway, authority, amount, status) VALUES (?, ?, ?, ?, ?)')
        ->execute([(int) $order['id'], 'zarinpal', $authority, $amountToman, 'pending']);

    return kk_gateway_endpoint('/pg/StartPay/') . $authority;
}

/**
 * تأیید پرداخت روی سرور.
 * @return array{ok: bool, ref_id: ?string, message: string}
 */
function kk_gateway_verify(string $authority, int $amountToman): array
{
    $merchant = kk_gateway_merchant();
    $response = kk_http_json(kk_gateway_endpoint('/pg/v4/payment/verify.json'), [
        'merchant_id' => $merchant,
        'amount'      => $amountToman * 10,
        'authority'   => $authority,
    ]);

    $code = (int) ($response['data']['code'] ?? 0);
    $refId = isset($response['data']['ref_id']) ? (string) $response['data']['ref_id'] : null;
    if ($code === 100 || $code === 101) {
        return ['ok' => true, 'ref_id' => $refId, 'message' => $code === 101 ? 'این تراکنش پیش‌تر تأیید شده است.' : 'پرداخت تأیید شد.'];
    }
    return ['ok' => false, 'ref_id' => null, 'message' => (string) ($response['errors']['message'] ?? 'پرداخت تأیید نشد.')];
}
