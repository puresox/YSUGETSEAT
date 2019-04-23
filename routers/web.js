const Router = require('koa-router');
const moment = require('moment');
const { checkHasSignIn } = require('../middlewares/check.js');
const { logger } = require('../logger.js');
const { admin } = require('../config/config.js');
const { findUser, getCode } = require('../lowdb.js');
const {
  getSeatImmediately, delAllResv, reLogin, getResvInfo,
} = require('../getSeat.js');

const router = new Router();

// /
router
  .get('/', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    let code;
    if (userid === admin) {
      code = getCode();
    }
    const userModel = findUser(userid);
    const user = userModel.value();
    if (!user) {
      await ctx.redirect('/logout');
    } else {
      const {
        enable, deleteAuto, name, seat, adjust,
      } = user;
      let devName = '';
      let start = '';
      let safe = false;
      try {
        const { success, msg: session } = await reLogin(user.session, userModel);
        if (success) {
          const { msg: reserves } = await getResvInfo(session);
          // 获取预约
          if (reserves.length !== 0) {
            [{ devName, start }] = reserves;
            if (moment().isBefore(start, 'minute')) {
              safe = true;
            }
          }
        }
      } catch (error) {
        logger.error(error.message);
      }
      await ctx.render('index', {
        enable,
        deleteAuto,
        devName,
        name,
        seat,
        adjust,
        safe,
        code,
      });
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
    try {
      if (userValue.enable === true && enable === false) {
        await delAllResv(userValue);
      } else if (enable === true) {
        await getSeatImmediately(userValue);
      }
    } catch (error) {
      logger.error(error.message);
    }
    user.assign({ enable, deleteAuto, adjust }).write();
    // TODO:flash
    await ctx.redirect('/');
  });

module.exports = router;
