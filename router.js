const Router = require('koa-router');
const { checkNotSignIn, checkHasSignIn } = require('./middlewares/check.js');
const { cookie } = require('./config/config.js');
const {
  findUserById, findUser, findSeatById, findStusByName,
} = require('./lowdb.js');
const {
  getSeatImmediately, delAllResv, getRooms, getRoomStatus,
} = require('./getSeat.js');

const router = new Router();

// /signin
router
  .get('/signin', checkNotSignIn, async (ctx) => {
    await ctx.render('signin.html');
  })
  .post('/signin', checkNotSignIn, async (ctx) => {
    const { id, pwd } = ctx.request.body;
    const user = findUserById(id);
    if (!user || user.pwd !== pwd) {
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
    } else if (userValue.enable === false && enable === true) {
      getSeatImmediately(userValue);
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

// /findUser
router
  .get('/findUser', checkHasSignIn, async (ctx) => {
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
  .post('/findUserByRoom', checkHasSignIn, async (ctx) => {
    const { roomId } = ctx.request.body;
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
  .post('/findUserByName', checkHasSignIn, async (ctx) => {
    const { name: userName } = ctx.request.body;
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

// /logout
router.get('/logout', checkHasSignIn, async (ctx) => {
  ctx.cookies.set('id', null);
  await ctx.redirect('/');
});

// /getStuDetail
router.get('/getStuDetail/:name', checkHasSignIn, async (ctx) => {
  const stus = await findStusByName(ctx.params.name);
  await ctx.render('stuDetail', {
    stus,
  });
});

module.exports = router;
