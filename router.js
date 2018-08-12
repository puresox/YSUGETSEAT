const Router = require('koa-router');
const { checkNotSignIn, checkHasSignIn } = require('./middlewares/check.js');
const { cookie } = require('./config/config.js');
const { findUserById, findUser, findSeatById } = require('./lowdb.js');
const { delAllResv, getRooms, getRoomStatus } = require('./getSeat.js');

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
    const {
      enable, deleteAuto, name, seat,
    } = findUserById(userid);
    await ctx.render('index', {
      enable,
      deleteAuto,
      name,
      seat,
    });
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
    }
    user.assign({ enable, deleteAuto }).write();
    // TODO:flash
    await ctx.redirect('/');
  });

// /changeSeat
router
  .get('/changeSeat', checkHasSignIn, async (ctx) => {
    const { success, msg } = await getRooms();
    if (success) {
      const { userid } = ctx;
      const { name, seat } = findUserById(userid);
      const rooms = msg;
      await ctx.render('changeSeat', {
        rooms,
        name,
        seat,
      });
    } else {
      await ctx.redirect('back');
    }
  })
  .post('/changeSeat', checkHasSignIn, async (ctx) => {
    const { userid } = ctx;
    const { roomId, dev } = ctx.request.body;
    const { success, msg } = await getRoomStatus(roomId);
    if (success) {
      const seats = msg;
      const seat = seats.find(({ name }) => name.includes(dev));
      if (seat) {
        const { name, devId, labId } = seat;
        const otherUser = findSeatById(devId);
        if (!otherUser || otherUser.id === userid) {
          const user = findUser(userid);
          user.assign({ seat: name, devId, labId }).write();
          // TODO:flash
          await ctx.redirect('/');
        } else {
          await ctx.redirect('back');
        }
      } else {
        await ctx.redirect('back');
      }
    } else {
      await ctx.redirect('back');
    }
  });

module.exports = router;
