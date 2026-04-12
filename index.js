require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    console.log('[DB] user:', u.username, '| host:', u.hostname, '| port:', u.port);
} else {
    console.log('[DB] DATABASE_URL is NOT SET');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(express.urlencoded({ extended: true }));
const PORT = 3001;

const escapeHtml = (s) =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const createTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS fans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT
        );
    `);
};

app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>名前・メッセージ登録</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: sans-serif; padding: 24px 16px; background: #f5f5f5; }
            h1 { font-size: 1.3rem; margin-bottom: 20px; color: #333; }
            form { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); max-width: 480px; margin: 0 auto; }
            input[type="text"], textarea {
                width: 100%; padding: 10px 12px; margin-bottom: 14px;
                border: 1px solid #ccc; border-radius: 6px; font-size: 1rem;
            }
            textarea { resize: vertical; }
            button {
                width: 100%; padding: 12px; background: #4f46e5; color: #fff;
                border: none; border-radius: 6px; font-size: 1rem; cursor: pointer;
            }
            button:active { background: #4338ca; }
        </style>
        </head>
        <body>
        <h1>名前・メッセージ登録フォーム</h1>
        <form method="POST" action="/register">
        <input type="text" name="userID" maxlength="20" required placeholder="名前を入力してください">
        <textarea name="message" placeholder="メッセージを入力してください" rows="4"></textarea>
        <button type="submit">送信</button>
        </form>
        </body>
        </html>
    `);
});

app.post("/register", async (req, res) => {
    const userID = (req.body.userID || '').trim();
    const message = (req.body.message || '').trim();

    if (!userID) {
        return res.send('名前が空です。<br><a href="/">戻る</a>');
    }

    try {
        await pool.query(
            `INSERT INTO fans(name, message) VALUES($1, $2)`,
            [userID, message]
        );

        transporter.sendMail({
            from: process.env.MAIL_USER,
            to: 'crosstalk9011@yahoo.co.jp',
            subject: '新しいファンメッセージが届きました',
            text: `ファン名: ${userID}\nメッセージ: ${message}`,
        }).catch(err => console.error('メール送信エラー:', err));

        res.send(`${escapeHtml(userID)}を登録しました<br><a href="/">戻る</a>`);
    } catch (err) {
        console.error(err);
        res.status(500).send(`登録に失敗しました<br><a href="/">戻る</a>`);
    }
});

const start = async () => {
    try {
        await createTable();
    } catch (err) {
        console.error('テーブル初期化に失敗しました:', err);
        process.exit(1);
    }
    app.listen(PORT, () => {
        console.log(`サーバー起動: http://localhost:${PORT}`);
    });
};

start();
