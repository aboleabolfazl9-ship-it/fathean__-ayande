<?php
declare(strict_types=1);

/**
 * کتاب‌خانه — فاکتور چاپی سفارش (فقط مدیر)
 */

require_once dirname(__DIR__) . '/lib/config.php';
require_once dirname(__DIR__) . '/lib/helpers.php';

kk_boot_session();
kk_require_admin();

$number = preg_replace('/[^A-Za-z0-9\-]/', '', (string) ($_GET['number'] ?? '')) ?? '';
$stmt = db()->prepare('SELECT * FROM orders WHERE number = ?');
$stmt->execute([$number]);
$order = $stmt->fetch();
if (!$order) {
    http_response_code(404);
    exit('سفارش یافت نشد.');
}
$items = kk_order_items((int) $order['id']);
$labels = ['pending' => 'در انتظار پرداخت', 'paid' => 'پرداخت‌شده', 'sent' => 'ارسال‌شده', 'canceled' => 'لغو‌شده'];
?>
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<title>فاکتور <?= kk_e($order['number']) ?> — کتاب‌خانه</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;padding:2.4rem;font-family:'Vazirmatn',Tahoma,system-ui,sans-serif;background:#fff;color:#111;line-height:1.9;font-size:14px}
  .sheet{max-width:760px;margin:0 auto}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:.9rem;margin-bottom:1.2rem}
  .brand h1{font-size:1.35rem;margin:0;color:#111}
  .brand p{margin:.1rem 0;font-size:.8rem;color:#555}
  .meta{text-align:left;font-size:.82rem}
  table{width:100%;border-collapse:collapse;margin-top:1rem;font-size:.85rem}
  th,td{padding:.5rem .4rem;border-bottom:1px solid #ddd;text-align:right}
  th{background:#f4f4f4;font-size:.78rem}
  .totals{margin-top:1rem;float:left;width:280px;font-size:.85rem}
  .totals div{display:flex;justify-content:space-between;padding:.25rem 0}
  .totals .grand{border-top:1px solid #111;margin-top:.4rem;padding-top:.5rem;font-weight:700}
  .note{clear:both;margin-top:2rem;font-size:.78rem;color:#555;border-top:1px dashed #bbb;padding-top:.7rem}
  .actions{margin-bottom:1.4rem;text-align:center}
  .actions button{padding:.6rem 1.4rem;border:1px solid #111;background:#111;color:#fff;border-radius:8px;cursor:pointer;font-family:inherit}
  @media print{.actions{display:none}body{padding:0}@page{margin:14mm}}
</style>
</head>
<body>
<div class="actions"><button type="button" onclick="window.print()">چاپ فاکتور</button></div>
<div class="sheet">
  <div class="head">
    <div class="brand">
      <h1>کتاب‌خانه</h1>
      <p>فروشگاه اینترنتی کتاب</p>
      <p>کتاب، آغاز یک دنیای تازه است.</p>
    </div>
    <div class="meta">
      <div><strong>فاکتور فروش</strong></div>
      <div>شماره سفارش: <?= kk_e($order['number']) ?></div>
      <div>تاریخ ثبت: <?= kk_e(kk_fa_date($order['created_at'])) ?></div>
      <div>وضعیت: <?= kk_e($labels[$order['status']] ?? $order['status']) ?></div>
      <?php if ($order['paid_at']): ?><div>تاریخ پرداخت: <?= kk_e(kk_fa_date($order['paid_at'])) ?></div><?php endif; ?>
    </div>
  </div>

  <p><strong>گیرنده:</strong> <?= kk_e($order['recipient']) ?> — <?= kk_e($order['phone']) ?></p>
  <p><strong>نشانی:</strong> <?= kk_e($order['province']) ?>، <?= kk_e($order['city']) ?>، <?= kk_e($order['address']) ?> — کد پستی <?= kk_e($order['postal']) ?></p>
  <p><strong>روش ارسال:</strong> <?= kk_e(kk_shipping_label((string) $order['shipping_method'])) ?></p>

  <table>
    <thead><tr><th>#</th><th>کتاب</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead>
    <tbody>
    <?php foreach ($items as $i => $item): ?>
      <tr>
        <td><?= kk_e(kk_fa_num($i + 1)) ?></td>
        <td><?= kk_e($item['title']) ?></td>
        <td><?= kk_e(kk_fa_num($item['qty'])) ?></td>
        <td><?= kk_e(kk_money($item['price'])) ?></td>
        <td><?= kk_e(kk_money($item['line_total'])) ?></td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table>

  <div class="totals">
    <div><span>جمع کالاها</span><span><?= kk_e(kk_money($order['subtotal'])) ?></span></div>
    <?php if ((int) $order['discount'] > 0): ?>
      <div><span>تخفیف <?= $order['coupon_code'] ? '(' . kk_e($order['coupon_code']) . ')' : '' ?></span><span>− <?= kk_e(kk_money($order['discount'])) ?></span></div>
    <?php endif; ?>
    <div><span>هزینه ارسال</span><span><?= (int) $order['shipping'] ? kk_e(kk_money($order['shipping'])) : 'رایگان' ?></span></div>
    <div class="grand"><span>مبلغ کل</span><span><?= kk_e(kk_money($order['total'])) ?></span></div>
  </div>

  <div class="note">
    <?php if ($order['status'] === 'pending'): ?>
      این سفارش هنوز پرداخت نشده است؛ این فاکتور سند پرداخت نیست.
    <?php else: ?>
      پرداخت این سفارش در سمت سرور تأیید شده است.
    <?php endif; ?>
    <br>کتاب‌خانه — این فاکتور به‌صورت خودکار از سامانه مدیریت صادر شده است.
  </div>
</div>
</body>
</html>
