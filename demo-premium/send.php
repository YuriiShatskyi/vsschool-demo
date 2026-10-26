<?php
/* VS School — відправка заявки з сайту на пошту.
   Змінити адресу отримувача можна в рядку $TO нижче. */

$TO   = 'vsschoolif@gmail.com';            // куди приходять заявки
$FROM = 'noreply@vsschool.com.ua';         // відправник (адреса на домені школи)

date_default_timezone_set('Europe/Kyiv');
header('Content-Type: application/json; charset=utf-8');

function done($ok, $code = 200) { http_response_code($code); echo json_encode(['ok' => $ok]); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') done(false, 405);

// Пастка для спам-ботів: справжні люди це поле не бачать
if (!empty($_POST['website'])) done(true);

function clean($v, $max) {
  $v = trim((string)($v ?? ''));
  $v = str_replace(["\r", "\n"], ' ', $v);
  return mb_substr(strip_tags($v), 0, $max, 'UTF-8');
}

$name  = clean($_POST['name']  ?? '', 100);
$phone = clean($_POST['phone'] ?? '', 30);
$grade = clean($_POST['grade'] ?? '', 40);

if ($name === '' || strlen(preg_replace('/\D/', '', $phone)) < 9) done(false, 422);

$subject = '=?UTF-8?B?' . base64_encode('Нова заявка з сайту: ' . $grade) . '?=';
$body  = "Нова заявка з сайту VS School\n\n";
$body .= "Ім'я: $name\n";
$body .= "Телефон: $phone\n";
$body .= "Клас: $grade\n";
$body .= "Час: " . date('d.m.Y H:i') . "\n";

$headers  = "From: VS School <$FROM>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$sent = @mail($TO, $subject, $body, $headers, '-f' . $FROM);
done($sent, $sent ? 200 : 500);
