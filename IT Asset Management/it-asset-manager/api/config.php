<?php
// Change both passwords before you upload. To store a hash instead of plain text, run:
//   php -r "echo password_hash('your-password', PASSWORD_DEFAULT);"
// and paste the result (it starts with $2y$). Both formats work.
return [
    'admin_password'  => 'ChangeMe-Admin-1',   // can add, edit, delete, import
    'viewer_password' => 'ChangeMe-Viewer-1',  // can only look
    'alert_email'     => 'you@example.com',    // receives reminder emails from reminders.php
    'alert_days'      => 14,                   // warn this many days ahead
];
