const Router = require('koa-router');
const { checkHasSignIn } = require('../middlewares/check.js');
const { findStusByName } = require('../lowdb.js');

const router = new Router();

// /getStuDetail
router.get('/:name', checkHasSignIn, async (ctx) => {
  const stus = await findStusByName(ctx.params.name);
  await ctx.render('stuDetail', {
    stus,
  });
});
module.exports = router;
