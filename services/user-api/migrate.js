const { pool, pg } = require("./db")
const bcrypt = require("bcrypt")

async function migrate() {
    try {
        // Create Database user_db
        await pg.query(`
            CREATE DATABASE formatic_user
            `)
        console.log("Berhasil Membuat User DB")

        await pg.query(`
            CREATE DATABASE formatic_form
        `)
        console.log("Berhasil Membuat Form DB")

        // Create Table Admin
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin(
            id SERIAL PRIMARY KEY,
            username VARCHAR,
            password TEXT
            )
        `)

        const hashPassword = await bcrypt.hash('smkn10jktdki', 10)
        await pool.query(`
            INSERT INTO admin (username, password) VALUES ('admin123', $1)`,
        [hashPassword])

        console.log("Berhasil Membuat Admin")

        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_setting(
            id SERIAL PRIMARY KEY,
            config VARCHAR UNIQUE,
            action BOOLEAN DEFAULT TRUE
            )
        `)

        console.log("Berhasil Membuat app_setting")

        await pool.query(`
            INSERT INTO app_setting (config, action) 
            VALUES ('allow_registration', true) 
            ON CONFLICT (config) DO NOTHING;
        `)

        await pool.query(`
            INSERT INTO app_setting (config, action) 
            VALUES ('allow_login', true) 
            ON CONFLICT (config) DO NOTHING;
        `)

        console.log("Berhasil Menambahkan Default Setting")

        // Create Table User
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            username VARCHAR,
            email VARCHAR,
            password TEXT
        )    
        `)
        console.log("Berhasil Membuat Table User")

    }
    catch (err) {
        console.log(err)
    }
    finally {
        process.exit(0)
    }
}

migrate()