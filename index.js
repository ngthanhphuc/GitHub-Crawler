const puppeteer = require('puppeteer');
const mongoose = require('mongoose');

const CREDS = require('./creds');
const User = require('./models/user');

const userToSearch = 'john';
const searchUrl = `https://github.com/search?q=${userToSearch}&type=Users&utf8=%E2%9C%93`;

// dom element selector
const USERNAME_SELECTOR = '#login_field';
const PASSWORD_SELECTOR = '#password';
const BUTTON_SELECTOR = '#login > form > div.auth-form-body.mt-3 > input.btn.btn-primary.btn-block';

async function run() {
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();

    await page.goto('https://github.com/login');
    await page.type(USERNAME_SELECTOR, CREDS.username);
    await page.type(PASSWORD_SELECTOR, CREDS.password);

    await page.click(BUTTON_SELECTOR);

    await page.waitFor(2 * 1000);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitFor(2 * 1000);

    let databas = await page.$$eval('.user-list-item', data => {
        return data.filter(row => row.querySelector(' div.d-flex > div > ul > li:nth-child(2) > a') != null)
            .map(row => ({
                username: row.querySelector('div.d-flex > div > a').getAttribute('href').replace('/', ''),
                email: row.querySelector(' div.d-flex > div > ul > li:nth-child(2) > a').innerText,
                dateCrawled: Date.now()
            }));
    });
    console.log(JSON.stringify(databas))

    databas.forEach(daa => {
        upsertUser(daa)
    });

    browser.close();

}

function upsertUser(userObj) {
    var DB_URL = 'mongodb://127.0.0.1:27017/test';

    mongoose.connect(DB_URL, {
        useNewUrlParser: true,
        useFindAndModify: false
    });

    // if this email exists, update the entry, don't insert
    const conditions = { email: userObj.email };
    const options = { upsert: true, new: true };
    User.findOneAndUpdate(conditions, userObj, options, (err, result) => {
        if (err) console.log(err)
    });
}

run();