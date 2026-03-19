require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized:false }, 
});

const app = express();
app.use(express.urlencoded({extended: true }));
const PORT = 3001;

const createTable = async ()=> {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS fans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        message TEXT
        );
        `);
};

createTable();

app.get("/", (req,res)=> {
    res.send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
        <meta charset="UTF-8">
        <title>登録フォーム</title>
        </head>
        <body>
        <h1>ID登録フォーム</h1>
        <form method="POST" action="/register">
        <input type="text" name="userID" maxlength="20" placeholder="名前を入力してください">
        <br>
        <textarea name="message" placeholder="メッセージを入力してください" rows="4"></textarea>
        <br>
        <button type="submit">送信</button>
        </form>
        </body>
        </html>
        `);
});

app.post("/register",async (req, res)=> {
    const userID = (req.body.userID ||'').trim();
    const message = (req.body.message|| '').trim();

    if (!userID) {
        return res.send('名前が空です。<br><a href="/">戻る</a>');
    }

    try {
        await pool.query(
            `INSERT INTO  fans(name,message) VALUES($1,$2)`,
            [userID,message]
        );
        res.send(`${userID}を登録しました<br><a href="/">戻る</a>`);
    }catch (err) {
            console.error(err);
            res.status(500).send(`登録に失敗しました<br><a href="/">戻る</a>`);
        }



app.listen(PORT,()=> {
    console.log(`サーバー起動: http://localhost:${PORT}`);
})
