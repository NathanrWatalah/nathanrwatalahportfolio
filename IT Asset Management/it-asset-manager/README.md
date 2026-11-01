# IT Asset Manager

Plain HTML, CSS and JavaScript front end with an optional PHP + SQLite backend.

```
it-asset-manager/
  index.html           page
  css/style.css        styles
  js/app.js            app (settings are in CONFIG at the top)
  api/index.php        JSON API, sessions, admin/viewer roles
  api/config.php       passwords and reminder email
  api/reminders.php    emails due items (run by cron)
  api/data/            SQLite database lives here (blocked from the web)
  helpdesk-snippet.html  fills "Asset tag" in your ticket form
  sample-import.csv    example for Import CSV
```

## Install on your site
1. Open `api/config.php` and change both passwords and the email address.
2. Upload the whole folder to your host, for example `/asset-management/`, with cPanel File Manager or FTP.
3. Open `https://nathanrwatalahportfolio.com/asset-management/`. You should see a sign-in box.
   If you see "Demo mode" at the bottom, PHP is not running there and data stays in the browser.
4. Check `https://nathanrwatalahportfolio.com/asset-management/api/data/itam.sqlite` returns 403 or 404. If it downloads, tell your host to enable `.htaccess`, or move `api/data` above the web root and update the path in `api/index.php` and `api/reminders.php`.
5. Add a menu link to the page in WordPress (Appearance > Menus > Custom Links).

Needs PHP 7.4+ with the `pdo_sqlite` extension (most hosts have it).

## Link it with the helpdesk and knowledge base
- Each asset row has **Open ticket** (adds `?asset=AST-0001`) and **Fix guide** (searches your knowledge base by asset name).
- Add an "Asset tag" field to the ticket form and paste `helpdesk-snippet.html` into that page so the tag fills in.
- Change the URLs in `CONFIG` at the top of `js/app.js` if your pages move.

## Email reminders
In cPanel > Cron Jobs add a daily job (adjust the path):
`0 7 * * * php /home/YOURUSER/public_html/asset-management/api/reminders.php`

## Roles
The admin password can add, edit, delete and import. The viewer password can only look. Passwords are checked on the server, so the buttons hidden in the page are not the only protection.

## Notes
- Depreciation is straight line over `depreciationYears` (4 by default) down to zero.
- Photos are shrunk to 320 px and stored inside the record.
- To back up, copy `api/data/itam.sqlite`.
- QR codes open the page URL plus `#AST-0001`, so scanning needs the same sign-in.
