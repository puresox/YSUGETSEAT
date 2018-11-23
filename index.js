const Koa = require('koa');
const schedule = require('node-schedule');
const bodyParser = require('koa-bodyparser');
const views = require('koa-views');
const router = require('./router');
const { logger } = require('./logger.js');
const { getSeat } = require('./getSeat.js');
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

getSeat();

// 5分钟一次
schedule.scheduleJob('0 */5 * * * *', async () => {
  await getSeat();
});

// 6点29
schedule.scheduleJob('* 29 6 * * *', async () => {
  await getSeat();
});

app.on('error', (err) => {
  logger.error(err.message);
});

// TODO:座位数量监控
// TODO:开始结束时间
// TODO:调剂
// TODO:随机座位
