const Router = require('koa-router');
const moment = require('moment');
const { checkHasSignIn } = require('../middlewares/check.js');
const { findUser } = require('../lowdb.js');
const { quickResvSeat } = require('../getSeat.js');

const router = new Router();

// /quickResvSeat
router.post('/', checkHasSignIn, async (ctx) => {
  const { userid } = ctx;
  const { hour, minute } = ctx.request.body;
  const user = findUser(userid).value();
  const startTime = moment().format(`YYYY-MM-DD ${hour}:${minute}`);
  await quickResvSeat(user, startTime);
  // TODO:flash
  await ctx.redirect('/');
});

module.exports = router;
