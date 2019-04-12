const Koa = require('koa');
const schedule = require('node-schedule');
const axios = require('axios');
const bodyParser = require('koa-bodyparser');
const views = require('koa-views');
const router = require('./router');
const { logger } = require('./logger.js');
const { getSeat } = require('./getSeat.js');
const { keys, port, SCKEY } = require('./config/config.js');

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

// 1分钟一次
schedule.scheduleJob('0 * * * * *', async () => {
  await getSeat();
});

app.on('error', async (err) => {
  logger.error(err.message);
  await axios.post(`https://sc.ftqq.com/${SCKEY}.send`, {
    text: 'YSUGETSEAT ERROR',
    desp: err.message,
  });
});

// TODO:开始结束时间
