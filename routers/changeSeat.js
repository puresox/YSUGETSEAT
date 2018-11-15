const Router = require('koa-router');
const { checkHasSignIn } = require('../middlewares/check.js');
const { findUserById, findUser, findSeatById } = require('../lowdb.js');
const { getRooms, getRoomStatus } = require('../getSeat.js');

const router = new Router();

// /changeSeat
router
  .get('/', checkHasSignIn, async (ctx) => {
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
  .post('/', checkHasSignIn, async (ctx) => {
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
          user
            .assign({
              seat: name,
              devId,
              labId,
              roomId,
            })
            .write();
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
