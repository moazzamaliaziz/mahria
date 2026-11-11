# Easy Setup / آسان سیٹ اَپ

## This Computer Is Configured / اس کمپیوٹر پر سیٹ اَپ مکمل ہے

- Website: `http://localhost:3000`. Admin: `http://localhost:3000/admin/login`.
- Local admin email: `admin@mehria.local`. The generated password is in the private file `.local/admin-access.txt`. Do not share or commit that file. Change the password in Admin > Store settings after first sign-in.
- A separate MySQL 8.4 database runs on `127.0.0.1:3307`, database `mehria_pulao`. Its permanent files are in `.local/mysql/data`, not the disposable test directory. Never delete `.local` or expose it through a web server.
- The website and database are currently running. Do not start duplicate copies. After a reboot or if they are stopped, run `npm run db:start` in one terminal and `npm run dev` in another. These are local processes, not Windows services or automatic startup entries.
- `.env.local` contains only the restricted runtime database account and application secrets. For upgrades, back up the database and use `npm run db:migrate:local`; that command uses the separate private migration account. Do not replace the runtime URL with a root login.
- Menu items are intentionally **unapproved** and ordering is **paused**. Confirm names, prices, tax and servings in Admin > Menu manager before approving. Then enable ordering in Store settings. Cash is the only payment method.

ویب سائٹ اور ڈیٹابیس چل رہے ہیں۔ ایڈمن ای میل `admin@mehria.local` ہے۔ تیار کردہ نجی پاس ورڈ `.local/admin-access.txt` میں ہے؛ اسے شیئر نہ کریں۔ پہلی بار لاگ اِن کے بعد ترتیبات سے پاس ورڈ تبدیل کریں۔ کمپیوٹر دوبارہ چلانے پر ایک ٹرمینل میں `npm run db:start` اور دوسرے میں `npm run dev` چلائیں۔ `.local/mysql/data` اصل مقامی ڈیٹابیس ہے؛ اسے حذف نہ کریں۔ مینو کی قیمتیں چیک اور منظور کرنے کے بعد ہی آرڈر فعال کریں۔ ادائیگی صرف نقد ہے۔

## English

1. Install Node.js 22 LTS and MySQL 8. Use an **existing, backed-up database** and its login URL. Setup does not create cloud resources or a database.
2. Open a terminal in this project. Run `npm install`, then `npm run setup`.
3. Choose English or Urdu. Enter your MySQL URL at the hidden prompt, for example `mysql://USER:URL_ENCODED_PASSWORD@127.0.0.1:3306/mehria_pulao`. Percent-encode special characters in the username/password. Enter `http://localhost:3000` for a local website, or your real `https://...` origin for production. Use verified database TLS for remote MySQL.
4. Setup generates private random secrets if absent and saves ignored `.env.local`. Existing configuration is changed **only after you type YES**. Existing passwords are never silently reset. Confirm the database migration, then enter your own admin name, email and password (12+ characters; hidden). There is no default password.
5. Run `npm run dev`. Open `http://localhost:3000/admin`. Check every menu name, translation and price, then approve only verified items. Menu rows are not automatically approved. In Settings, set real delivery areas/fee and enable ordering. Empty areas mean pickup only. Menu and settings changes do not need a restart.
6. Receive orders in Admin. Confirm, prepare and mark ready. Delivery orders then go out for delivery; pickup orders can complete when handed over. Mark completed **only after collecting cash**. Completed and cancelled orders cannot be reopened. No card or online payment is accepted.

Keep the admin screen open for new-order polling and optional sound/browser alerts. **There is no push notification service:** a closed or suspended app is not a reliable order alarm. Installation as a PWA does not change this. Provide a staffed device and regularly check the dashboard.

## اردو

1. Node.js 22 LTS اور MySQL 8 انسٹال کریں۔ پہلے سے موجود ڈیٹابیس اور اس کا بیک اَپ رکھیں۔ یہ سیٹ اَپ نیا کلاؤڈ یا ڈیٹابیس نہیں بناتا۔
2. پروجیکٹ کے فولڈر میں ٹرمینل کھولیں۔ `npm install` اور پھر `npm run setup` چلائیں۔ اردو کے لیے `2` منتخب کریں۔
3. ڈیٹابیس کا URL پوشیدہ خانے میں درج کریں۔ مقامی ویب سائٹ کے لیے `http://localhost:3000` یا اصل ویب سائٹ کے لیے `https://...` پتہ دیں۔ باہر کے ڈیٹابیس کے لیے تصدیق شدہ TLS استعمال کریں۔ پرانی `.env.local` صرف `YES` لکھنے پر بدلے گی۔
4. مائیگریشن کی اجازت دیں۔ اپنا ایڈمن نام، ای میل اور کم از کم 12 حروف کا پاس ورڈ درج کریں۔ پاس ورڈ نظر نہیں آئے گا۔ کوئی پہلے سے مقرر پاس ورڈ نہیں ہے۔ پرانا پاس ورڈ خود بخود تبدیل نہیں ہوگا۔
5. `npm run dev` چلائیں اور `http://localhost:3000/admin` کھولیں۔ مینو کی قیمتیں، نام اور اردو ترجمہ چیک کرکے اشیا منظور کریں۔ ترتیبات میں اصل ڈیلیوری علاقے اور فیس درج کریں، پھر آرڈر فعال کریں۔ خالی علاقے ہوں تو صرف پک اَپ دستیاب ہے۔
6. ایڈمن میں آرڈر وصول کریں، تصدیق کریں، تیار کریں اور تیار ہونے کا نشان لگائیں۔ ڈیلیوری آرڈر بھیجنے کے بعد، یا پک اَپ دیتے وقت، **نقد رقم وصول کرکے ہی آرڈر مکمل کریں**۔ کارڈ یا آن لائن ادائیگی موجود نہیں۔ مکمل یا منسوخ آرڈر دوبارہ نہیں کھلتا۔

نئے آرڈر دیکھنے اور آواز یا براؤزر الرٹ کے لیے ایڈمن اسکرین کھلی رکھیں۔ **پش نوٹیفکیشن نہیں ہیں۔** بند یا سلیپ حالت میں ایپ قابلِ اعتماد الارم نہیں ہے۔ PWA انسٹال کرنے سے بھی یہ پابندی ختم نہیں ہوتی۔ عملہ ڈیش بورڈ باقاعدگی سے چیک کرے۔

## Commands

- `npm run setup`: guided first setup; safe to rerun; existing admin password is preserved.
- `npm run db:migrate` (or `npm run db:setup`): ordered, versioned migrations on the configured existing database. They preserve menu edits, approvals and old orders. Back up first. Interrupted DDL steps can be rerun. Stop old app instances during an upgrade, then restart on the new code.
- `npm run admin:create`: add an admin interactively. Existing email addresses are refused.
- `npm run admin:reset`: explicit password reset, with a `RESET` confirmation; revokes every session for that admin. It does not re-enable a disabled admin.
- `npm test`, `npm run typecheck`, `npm run build`: local checks. Start production with `npm start` behind HTTPS.

## Security & Operations

- `APP_URL` is the exact public origin, not a page path. Production admin authentication refuses missing origins and non-HTTPS domains; local production testing may use HTTP localhost. HTTPS uses a Secure, HttpOnly, SameSite=Strict session cookie. Sessions expire after 8 hours. Password changes/reset revoke all sessions. Mutations require Origin and CSRF checks. Do not expose the development server publicly.
- Use unique long passwords, a password manager, and separate admin accounts. Login limiting is shared in MySQL: 5 attempts/account and 100 global attempts per 15 minutes, without trusting proxy IP headers. Failed attempts count; wait 15 minutes if blocked. The global limit can affect all admins during an attack; add an edge firewall/rate limit for public deployments.
- Keep `ADMIN_AUTH_SECRET` and `RATE_LIMIT_SECRET` random, each at least 32 characters. Do not post `.env.local`, database URLs or passwords in chat/screenshots. Unix setup uses mode `0600`; Windows operators must restrict the file ACL to the app/operator account. Keep all instances on the same secrets. Rotate secrets only during a planned restart and revoke existing `admin_sessions` when rotating authentication keys.
- Give the runtime DB user only required SELECT/INSERT/UPDATE/DELETE access, never root. Run migrations separately with temporary CREATE/ALTER/INDEX/REFERENCES permissions. Keep MySQL private (localhost/private network); remote connections require verified TLS. Configure HTTPS, security updates and restricted server access before launch. Do not enable request-body or SQL logging: orders contain customer names, phones and addresses.
- Ordering and delivery environment fields are **one-time migration seeds**. MySQL `store_settings` is the source of truth afterwards. Missing DB or no approved menu shows preview; DB failures fail closed. Approved menus remain visible while ordering is paused. Changes are protected by version checks; refresh on a conflict.
- New database connections use UTC for both SQL timestamps and JavaScript conversion; the dashboard displays Pakistan time. If an older deployment wrote timestamps in a non-UTC server timezone, review that data against the original timezone, logs and backups before correcting it. Some columns may already contain explicit UTC values, so never shift all historical timestamps blindly. Existing timestamps are not rewritten by this fix. پرانے سرور کے وقت سے محفوظ شدہ ریکارڈ پہلے چیک کریں؛ تمام پرانے اوقات ایک ساتھ تبدیل نہ کریں۔
- Back up MySQL daily with encryption and access control; take a fresh backup before upgrades. Test restores regularly. Keep a documented customer-data retention period based on local accounting/legal needs; restrict exports, delete expired backups and use a reviewed maintenance process to remove/anonymize old customer details. Audit events contain action/IDs/statuses, not PII snapshots. Expired admin sessions and stale login buckets are cleaned on successful sign-in attempts; schedule operator-controlled housekeeping for abandoned sessions, old phone-rate buckets and audit history under your retention policy. Never delete live order lines or disable foreign keys to clean data.

## Optional Local Docker

`compose.yaml` runs MySQL 8.4 on **127.0.0.1 only**, with a persistent volume. Before `docker compose up -d`, supply distinct strong `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` in your terminal environment or a private, ignored Compose environment file. There are no default passwords. Use database `mehria_pulao` and user `mehria_app` in setup. This is optional local development, not a production deployment. Do not run `docker compose down -v` unless you intend to erase that local database. Existing volumes retain their old credentials when environment values change.
