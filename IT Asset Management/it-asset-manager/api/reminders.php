<?php
// Emails a list of overdue returns, ending warranties, service dates and expiring licences.
// Run from cron (see README). It refuses to run from a browser.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Command line only.'); }
$cfg = require __DIR__ . '/config.php';
$db = new PDO('sqlite:' . __DIR__ . '/data/itam.sqlite');
$limit = (int)($cfg['alert_days'] ?? 14);
$today = new DateTime('today');
$days = function ($d) use ($today) { return $d ? (int)$today->diff(new DateTime($d))->format('%r%a') : null; };
$lines = [];
foreach ($db->query("SELECT col,data FROM docs") as $row) {
    $x = json_decode($row['data'], true); $name = $x['id'] . ' ' . $x['name'];
    if ($row['col'] === 'assets') {
        if (($x['status'] ?? '') === 'Retired') continue;
        if (($x['status'] ?? '') === 'In use' && !empty($x['due']) && $days($x['due']) < 0) $lines[] = "OVERDUE return: $name (" . ($x['assignee'] ?? '') . ", due " . $x['due'] . ")";
        foreach (['warranty' => 'Warranty ends', 'nextService' => 'Service due'] as $k => $label) {
            if (!empty($x[$k]) && $days($x[$k]) <= $limit) $lines[] = "$label: $name on " . $x[$k];
        }
    } else {
        if (!empty($x['expires']) && $days($x['expires']) <= $limit) $lines[] = "Licence expires: $name on " . $x['expires'];
        if ((int)($x['used'] ?? 0) > (int)($x['seats'] ?? 0)) $lines[] = "Licence over-allocated: $name";
    }
}
if (!$lines) { echo "Nothing due.\n"; exit; }
$body = "IT Asset Manager reminders (" . $today->format('Y-m-d') . ")\n\n" . implode("\n", $lines) . "\n";
mail($cfg['alert_email'], 'IT asset reminders: ' . count($lines) . ' item(s)', $body, 'Content-Type: text/plain; charset=utf-8') ? print("Sent.\n") : print("mail() failed. Check your host's mail settings.\n");
