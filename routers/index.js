const Router = require('koa-router');
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
      const { msg: session } = await reLogin(user.session, userModel);
      const { msg: reserves } = await getResvInfo(session);
      let devName = '';
      // 获取预约
      if (reserves.length !== 0) {
        [{ devName }] = reserves;
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
    if (userValue.enable === true && enable === false) {
      await delAllResv(userValue);
    } else if (userValue.enable === false && enable === true) {
      getSeatImmediately(userValue);
    }
    user.assign({ enable, deleteAuto, adjust }).write();
    // TODO:flash
    await ctx.redirect('/');
  });

module.exports = router;
