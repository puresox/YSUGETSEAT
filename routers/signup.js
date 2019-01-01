const Router = require('koa-router');
const { checkNotSignIn } = require('../middlewares/check.js');
const { cookie } = require('../config/config.js');
const {
  createUser, findUserById, getCode, resetCode,
} = require('../lowdb.js');
const { login } = require('../getSeat.js');

const router = new Router();

// /signup
router
  .get('/', checkNotSignIn, async (ctx) => {
    await ctx.render('signup');
  })
  .post('/', checkNotSignIn, async (ctx) => {
    const { code } = ctx.request.query;
    const { id, pwd } = ctx.request.body;
    const user = findUserById(id);
    const { success, msg: session, name } = await login({ id, pwd });
    if (getCode() !== code || user || !success) {
      await ctx.redirect('/signup');
    } else {
      resetCode();
      createUser({
        enable: false,
        id,
        pwd,
        devId: '',
        labId: '',
        roomId: '',
        deleteAuto: false,
        name,
        seat: '',
        session,
        adjust: true,
        hasSeat: false,
      });
      ctx.cookies.set('id', id, cookie);
      await ctx.redirect('/');
    }
  });

module.exports = router;
