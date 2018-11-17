const Koa = require('koa');
const schedule = require('node-schedule');
const moment = require('moment');
const bodyParser = require('koa-bodyparser');
const views = require('koa-views');
const router = require('./router');
const { logger } = require('./logger.js');
const { getSeat, preReserve } = require('./getSeat.js');
const { keys, port } = require('./config/config.js');

const app = new Koa();

app.keys = keys;

app.use(
  bodyParser({
    enableTypes: ['json', 'form'],
  }),
);

app.use(
  views(`${__dirname}/views`, {
    extension: 'ejs',
    map: {
      html: 'ejs',
    },
    options: {},
  }),
);

app.use(router.routes()).use(router.allowedMethods());

app.listen(port);
logger.info(`system start,listened on ${port}`);

app.on('error', (err) => {
  logger.error(err.message);
});

getSeat();

// 5分钟一次
schedule.scheduleJob('0 */5 * * * *', async () => {
  await getSeat();
});

// 6点29
let date = '';
schedule.scheduleJob('* 29 6 * * *', async () => {
  const time = moment().format('YYYY-MM-DD');
  if (date !== time) {
    const { success } = await preReserve();
    if (success) {
      date = time;
    }
  }
});

// TODO:座位数量监控
// TODO:开始结束时间
// TODO:调剂
// TODO:随机座位
