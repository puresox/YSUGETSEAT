const Router = require('koa-router');
const { checkNotSignIn } = require('../middlewares/check.js');
const { cookie } = require('../config/config.js');
const { findUserById } = require('../lowdb.js');

const router = new Router();

// /signin
router
  .get('/', checkNotSignIn, async (ctx) => {
    await ctx.render('signin');
  })
  .post('/', checkNotSignIn, async (ctx) => {
    const { id, pwd } = ctx.request.body;
    const user = findUserById(id);
    if (!user || user.pwd !== pwd) {
      await ctx.redirect('/signin');
    } else {
      ctx.cookies.set('id', id, cookie);
      await ctx.redirect('/');
    }
  });
module.exports = router;
