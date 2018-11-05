const Router = require('koa-router');
const { checkHasSignIn } = require('../middlewares/check.js');
const { getRooms, getRoomStatus } = require('../getSeat.js');

const router = new Router();

// /findUser
router
  .get('/', checkHasSignIn, async (ctx) => {
    const { success, msg } = await getRooms();
    if (success) {
      const rooms = msg;
      await ctx.render('findUser', {
        rooms,
      });
    } else {
      await ctx.redirect('back');
    }
  })
  .get('/room', checkHasSignIn, async (ctx) => {
    const { roomId } = ctx.request.query;
    const { success, msg } = await getRoomStatus(roomId);
    if (success) {
      const seats = msg;
      const userList = [];
      seats.forEach(({ name, ts }) => {
        ts.forEach(({ owner, start, end }) => {
          userList.push({
            name,
            owner,
            start,
            end,
          });
        });
      });
      await ctx.render('userList', {
        userList,
      });
    } else {
      await ctx.redirect('back');
    }
  })
  .get('/name', checkHasSignIn, async (ctx) => {
    const { name: userName } = ctx.request.query;
    const userList = [];
    let { success, msg } = await getRooms();
    if (success) {
      const rooms = msg;
      const findUserPromises = [];
      rooms.forEach(({ id }) => {
        findUserPromises.push(
          (async () => {
            ({ success, msg } = await getRoomStatus(id));
            if (success) {
              const seats = msg;
              seats.forEach(({ name, ts }) => {
                ts.forEach(({ owner, start, end }) => {
                  if (userName === owner) {
                    userList.push({
                      name,
                      owner,
                      start,
                      end,
                    });
                  }
                });
              });
            } else {
              await ctx.redirect('back');
            }
          })(),
        );
      });
      await Promise.all(findUserPromises);
      await ctx.render('userList', {
        userList,
      });
    } else {
      await ctx.redirect('back');
    }
  });

module.exports = router;
