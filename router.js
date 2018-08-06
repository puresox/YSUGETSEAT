const Router = require('koa-router');
const { checkNotSignIn, checkHasSignIn } = require('./middlewares/check.js');
const { cookie } = require('./config/config.js');
const { findUserById, updateUser } = require('./lowdb.js');

const router = new Router();

// /signin
router
  .get('/signin', checkNotSignIn, async (ctx) => {
    await ctx.render('signin.html');
  })
  .post('/signin', checkNotSignIn, async (ctx) => {
    const { id, pwd } = ctx.request.body;
    const user = findUserById(id);
    if (user.pwd !== pwd) {
      await ctx.redirect('/signin');
    } else {
      ctx.cookies.set('id', id, cookie);
      await ctx.redirect('/');
    }
  });

// /
router
  .get('/', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    const { enable, deleteAuto, name } = findUserById(userid);
    await ctx.render('index', { enable, deleteAuto, name });
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
    updateUser(userid, enable, deleteAuto);
    // TODO:删除预约
    // TODO:flash
    await ctx.redirect('/');
  });

module.exports = router;
