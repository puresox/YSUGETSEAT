const Router = require('koa-router');
const { checkHasSignIn } = require('../middlewares/check.js');

const router = new Router();

// /logout
router.get('/', checkHasSignIn, async (ctx) => {
  ctx.cookies.set('id', null);
  await ctx.redirect('/');
});
module.exports = router;
