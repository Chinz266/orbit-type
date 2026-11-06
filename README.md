# Orbit Type

## หมวดคำศัพท์

เลือกบทเรียน “คำศัพท์ · ออกสำรวจ” แล้วเลือกหมวดได้ 19 หมวด (รวมอวกาศเดิม) หรือรวมทุกหมวด คำจะสลับลำดับในแต่ละรอบ หมวดใหม่ 18 หมวดมีหมวดละ 20 คำต่อภาษา: สัตว์ อาหาร ผักและผลไม้ เครื่องดื่มและขนม ธรรมชาติ อากาศและฤดูกาล เทคโนโลยี การเดินทาง บ้านและของใช้ โรงเรียนและการเรียน อาชีพ กีฬาและกิจกรรม ดนตรีและศิลปะ ร่างกายและสุขภาพ อารมณ์และความรู้สึก สถานที่ในเมือง โลกใต้ทะเล และเสื้อผ้า เก็บคะแนนสูงสุดแยกตามหมวด ตัวช่วยคีย์บอร์ดแสดงอักขระไทยเมื่อใช้ Shift ได้ด้วย แก้ไขคลังคำใน dist/vocabulary.js

เกมฝึกพิมพ์สัมผัสไทยเกษมณี / English QWERTY ด้วย Three.js

## เริ่มเล่นในเครื่อง

ใช้ Node.js 20+ แล้วรัน `npm run dev` ในโฟลเดอร์นี้ เปิด http://127.0.0.1:4173
ไฟล์ Three.js ที่ใช้จริงอยู่ใน dist/vendor จึงไม่ต้องติดตั้งแพ็กเกจเพื่อเปิดเกม ฟอนต์ Google มี fallback เมื่อออฟไลน์

เลือกภาษาและบทเรียน ฝึกไม่จับเวลาหรือ 60 วินาที พิมพ์คำทีละตัว ไม่ต้อง Enter เมื่อผิดพิมพ์ตัวที่ถูกต่อได้เลย Esc ใช้พัก/ฝึกต่อ เปลี่ยนแท็บจะพักอัตโนมัติ คะแนนสูงสุดเก็บในเบราว์เซอร์แยกตามภาษา บทเรียน และโหมด WPM คำนวณจากอักขระที่ถูก / 5 / นาที (รวมสระและวรรณยุกต์ไทย)

`npm test` ตรวจตรรกะคะแนน ภาษาไทย และการรีเซ็ต

dist/index.html: โครงหน้า; style.css: สไตล์; app.js: UI และวงจรเกม; engine.js: คะแนนและบทเรียน; scene.js: ฉาก Three.js

ใช้คีย์บอร์ดจริงเพื่อฝึกสัมผัส สามารถปิดตัวช่วยได้ หน้าเว็บตรวจไม่ได้ว่าผู้เล่นก้มมองคีย์บอร์ดหรือไม่

## ประวัติและคำผิด
บอร์ดสถิติบันทึกแต่ละรอบเมื่อกดจบการฝึกหรือหมดเวลา พร้อมหมวด ภาษา โหมด และรายละเอียดคำที่พิมพ์ผิด (ตัวที่พิมพ์ / ตัวที่ถูก / ตำแหน่ง) รวมถึงคำที่ยังพิมพ์ไม่จบ สรุปความแม่นยำรวมถ่วงตามจำนวนอักขระ และ WPM รวมตามเวลาฝึก ประวัติเก็บใน localStorage ของเบราว์เซอร์และเริ่มตั้งแต่อัปเดตนี้ หากพื้นที่เต็มจะแจ้งและเก็บรอบใหม่ในหน่วยความจำจนรีโหลด

## Supabase accounts
- Project: `orbit-type` (`jjxbyimqdbyogivywhsc`), Singapore, organization selected by owner.
- `dist/supabase-config.js` contains only the public API URL and publishable key. Never add a secret/service-role key to browser files.
- `supabase/migrations/202611060001_orbit_accounts.sql` creates immutable private sessions; authenticated users can insert/read their own rows only. User names are stored in Auth user metadata. Supabase Auth manages passwords.
- Signup, login, confirmation resend, password recovery and logout use the official Supabase JS SDK bundled with `npm run build:auth`. Commit the generated browser bundle when updating the SDK.
- Guest history stays local. Import requires a deliberate confirmation; stable round IDs avoid duplicate imports. Account history and pending uploads use separate local keys for each user. Failed uploads retry on reconnect or the Sync button. A round saved while an account changes belongs to the account that was playing it.
- History is self-reported practice data, not a tamper-proof public leaderboard.
- Supabase Auth Site URL and allowed Redirect URL must be `https://orbit-type-chinz.rainyislet4.chatgpt.site/`. Add a local callback only when testing email links locally.
- Keep email confirmation enabled. Supabase's built-in SMTP is for testing with project team addresses only. To accept public registrations and recovery emails, configure custom SMTP in Authentication > Emails using a verified sender/domain. See https://supabase.com/docs/guides/auth/auth-smtp.
- The Sites hosting audience is still owner-private; an app login does not change the site's sharing policy.
- Tests: `node --test --test-isolation=none tests/*.test.mjs` (avoids restricted Windows child-process spawning).
