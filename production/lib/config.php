<?php
declare(strict_types=1);

/**
 * کتاب‌خانه — پیکربندی سرور
 * متغیرها از فایل .env (خارج از گیت) خوانده می‌شوند.
 */

define('KK_ROOT', dirname(__DIR__));

function kk_load_env(string $path): void
{
    if (!is_file($path) || !is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if (strlen($value) > 1 && ($value[0] === '"' || $value[0] === "'")) {
            $value = substr($value, 1, -1);
        }
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}
kk_load_env(KK_ROOT . '/.env');

function kk_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

function kk_config(string $key, int $default = 0): int
{
    $value = kk_env($key);
    return $value === null ? $default : (int) $value;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        kk_env('DB_HOST', 'localhost'),
        kk_env('DB_PORT', '3306'),
        kk_env('DB_NAME', '')
    );
    $pdo = new PDO($dsn, (string) kk_env('DB_USER', ''), (string) kk_env('DB_PASS', ''), [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    try {
        $pdo->exec("SET time_zone = '+03:30'");
    } catch (Throwable $e) {
        // سرور ممکن است جدول مناطق زمانی نداشته باشد؛ مهم نیست.
    }
    return $pdo;
}

function kk_boot_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || kk_env('APP_HTTPS', '0') === '1';
    session_name((string) kk_env('SESSION_NAME', 'kk_session'));
    session_set_cookie_params([
        'lifetime' => kk_config('SESSION_LIFETIME', 0),
        'path'     => '/',
        'domain'   => '',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    if (empty($_SESSION['kk_init'])) {
        session_regenerate_id(true);
        $_SESSION['kk_init'] = time();
    }
}

function kk_installed(): bool
{
    try {
        $count = (int) db()->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        return $count > 0;
    } catch (Throwable $e) {
        return false;
    }
}

function kk_shipping_cost(int $subtotal, string $method): int
{
    $free_from = kk_config('FREE_SHIPPING_FROM', 500000);
    if ($method === 'pickup') {
        return 0;
    }
    if ($subtotal >= $free_from) {
        return 0;
    }
    return $method === 'tipax' ? kk_config('SHIPPING_TIPAX', 75000) : kk_config('SHIPPING_POST', 45000);
}

function kk_shipping_label(string $method): string
{
    return [
        'post'   => 'پست پیشتاز',
        'tipax'  => 'تیپاکس (پس‌کرایه)',
        'pickup' => 'تحویل حضوری در فروشگاه',
    ][$method] ?? 'پست پیشتاز';
}
