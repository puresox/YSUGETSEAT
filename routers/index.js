const Router = require('koa-router');
const moment = require('moment');
const { checkHasSignIn } = require('../middlewares/check.js');
const { findUser } = require('../lowdb.js');
const {
  getSeatImmediately, delAllResv, reLogin, getResvInfo,
} = require('../getSeat.js');

const router = new Router();

// /
router
  .get('/', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    const userModel = findUser(userid);
    const user = userModel.value();
    if (!user) {
      await ctx.redirect('/logout');
    } else {
      const { success, msg: session } = await reLogin(user.session, userModel);
      if (!success) {
        await ctx.render('error');
      } else {
        const { msg: reserves } = await getResvInfo(session);
        let devName = '';
        let start = '';
        let safe = false;
        // 获取预约
        if (reserves.length !== 0) {
          [{ devName, start }] = reserves;
          if (moment().isBefore(start, 'minute')) {
            safe = true;
          }
        }
        const {
          enable, deleteAuto, name, seat, adjust,
        } = user;
        await ctx.render('index', {
          enable,
          deleteAuto,
          devName,
          name,
          seat,
          adjust,
          safe,
        });
      }
    }
  })
  .post('/', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    let { enable, deleteAuto, adjust } = ctx.request.body;
    if (enable === 'enable') {
      enable = true;
    } else {
      enable = false;
    }
    if (deleteAuto === 'deleteAuto') {
      deleteAuto = true;
    } else {
      deleteAuto = false;
    }
    if (adjust === 'adjust') {
      adjust = true;
    } else {
      adjust = false;
    }
    const user = findUser(userid);
    const userValue = user.value();
    if (userValue.enable === true && enable === false) {
      await delAllResv(userValue);
    } else if (enable === true) {
      getSeatImmediately(userValue);
    }
    user.assign({ enable, deleteAuto, adjust }).write();
    // TODO:flash
    await ctx.redirect('/');
  });

module.exports = router;
