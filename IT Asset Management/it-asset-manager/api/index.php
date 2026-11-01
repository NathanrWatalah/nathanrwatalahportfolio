<?php
declare(strict_types=1);
// JSON API for the IT Asset Manager. Storage is one SQLite file in api/data (needs PHP 7.4+ with pdo_sqlite).
$cfg = require __DIR__ . '/config.php';
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function out($d, int $code = 200): void { http_response_code($code); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }
function check_pw(string $given, string $stored): bool {
    return strpos($stored, '$2y$') === 0 || strpos($stored, '$argon') === 0 ? password_verify($given, $stored) : hash_equals($stored, $given);
}

$dir = __DIR__ . '/data';
if (!is_dir($dir)) mkdir($dir, 0750, true);
$db = new PDO('sqlite:' . $dir . '/itam.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(col,id))');
$db->exec('CREATE TABLE IF NOT EXISTS log(n INTEGER PRIMARY KEY AUTOINCREMENT, t TEXT, id TEXT, msg TEXT, who TEXT)');

$r = $_GET['r'] ?? '';
$role = $_SESSION['role'] ?? null;
$in = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'itam') out(['error' => 'Bad request'], 400);
    $in = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($in)) out(['error' => 'Invalid JSON'], 400);
}
function need(?string $role, bool $admin): void {
    if (!$role) out(['error' => 'Sign in required'], 401);
    if ($admin && $role !== 'admin') out(['error' => 'Your account is read-only'], 403);
}
function write_log(PDO $db, string $id, string $msg, string $who): void {
    $db->prepare('INSERT INTO log(t,id,msg,who) VALUES(?,?,?,?)')->execute([gmdate('c'), $id, mb_substr($msg, 0, 300), $who]);
    $db->exec('DELETE FROM log WHERE n <= (SELECT MAX(n) FROM log) - 2000');
}

switch ($r) {
    case 'session':
        out(['role' => $role]);
    case 'login':
        usleep(500000); // slows down password guessing
        $pw = (string)($in['password'] ?? '');
        foreach (['admin', 'viewer'] as $u) {
            if (check_pw($pw, (string)$cfg[$u . '_password'])) { session_regenerate_id(true); $_SESSION['role'] = $u; out(['role' => $u]); }
        }
        out(['error' => 'Wrong password'], 401);
    case 'logout':
        session_destroy(); out(['ok' => true]);
    case 'all':
        need($role, false);
        $res = ['assets' => [], 'licenses' => [], 'log' => []];
        foreach ($db->query('SELECT col,id,data FROM docs ORDER BY id') as $row) {
            if (isset($res[$row['col']])) $res[$row['col']][] = json_decode($row['data'], true);
        }
        $res['log'] = $db->query('SELECT t,id,msg FROM log ORDER BY n DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC);
        out($res);
    case 'save':
        need($role, true);
        $col = $in['col'] ?? ''; $doc = $in['doc'] ?? null;
        if (!in_array($col, ['assets', 'licenses'], true) || !is_array($doc)) out(['error' => 'Invalid data'], 400);
        $id = (string)($doc['id'] ?? '');
        if (!preg_match('/^(AST|LIC)-\d{4,}$/', $id)) out(['error' => 'Invalid id'], 400);
        $json = json_encode($doc, JSON_UNESCAPED_UNICODE);
        if (strlen($json) > 400000) out(['error' => 'Record is too large. Use a smaller photo.'], 413);
        $db->prepare('INSERT OR REPLACE INTO docs(col,id,data) VALUES(?,?,?)')->execute([$col, $id, $json]);
        if (!empty($in['log'])) write_log($db, $id, (string)$in['log'], $role);
        out(['ok' => true]);
    case 'delete':
        need($role, true);
        $col = $in['col'] ?? ''; $id = (string)($in['id'] ?? '');
        if (!in_array($col, ['assets', 'licenses'], true)) out(['error' => 'Invalid data'], 400);
        $db->prepare('DELETE FROM docs WHERE col=? AND id=?')->execute([$col, $id]);
        if (!empty($in['log'])) write_log($db, $id, (string)$in['log'], $role);
        out(['ok' => true]);
    default:
        out(['error' => 'Unknown request'], 404);
}
