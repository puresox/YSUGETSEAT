const Router = require('koa-router');
const { checkHasSignIn } = require('../middlewares/check.js');
const { findUserById, findUser } = require('../lowdb.js');
const { getSeatImmediately, delAllResv } = require('../getSeat.js');

const router = new Router();

// /
router
  .get('/', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    const user = findUserById(userid);
    if (!user) {
      await ctx.redirect('/logout');
    } else {
      const {
        enable, deleteAuto, name, seat,
      } = user;
      await ctx.render('index', {
        enable,
        deleteAuto,
        name,
        seat,
      });
    }
  })
  .post('/', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    let { enable, deleteAuto } = ctx.request.body;
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
    const user = findUser(userid);
    const userValue = user.value();
    if (userValue.enable === true && enable === false) {
      await delAllResv(userValue);
    } else if (userValue.enable === false && enable === true) {
      getSeatImmediately(userValue);
    }
    user.assign({ enable, deleteAuto }).write();
    // TODO:flash
    await ctx.redirect('/');
  });

module.exports = router;
