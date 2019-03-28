const Router = require('koa-router');
const moment = require('moment');
const { checkApi } = require('../middlewares/check.js');
const { findUserById, findUser, findSeatById } = require('../lowdb.js');
const {
  quickResvSeat, getRooms, getRoomStatus, reLogin, getResvInfo, delAllResv, getSeatImmediately,
} = require('../getSeat.js');

const router = new Router();

router
  .post('/signin', async (ctx) => {
    const { id, pw: pwd } = ctx.request.body;
    const user = findUserById(id);
    if (!user || user.pwd !== pwd) {
      ctx.body = {
        success: false,
        msg: '用户不存在或密码错误',
      };
    } else {
      ctx.body = {
        success: true,
        msg: id,
      };
    }
  })
  .post('/changeTime', checkApi, async (ctx) => {
    const { userid } = ctx;
    const { time } = ctx.request.body;
    const user = findUser(userid).value();
    const startTime = moment().format(`YYYY-MM-DD ${time}`);
    await quickResvSeat(user, startTime);
    ctx.body = {
      success: true,
      msg: '成功',
    };
  })
  .post('/getrooms', checkApi, async (ctx) => {
    const { success, msg } = await getRooms();
    if (success) {
      ctx.body = {
        success: true,
        msg,
      };
    } else {
      ctx.body = {
        success: false,
        msg: '请求失败',
      };
    }
  })
  .post('/getRoomStatus', checkApi, async (ctx) => {
    const { roomId } = ctx.request.body;
    const { success, msg } = await getRoomStatus(roomId);
    if (success) {
      ctx.body = {
        success: true,
        msg,
      };
    } else {
      ctx.body = {
        success: false,
        msg: '请求失败',
      };
    }
  })
  .post('/changeSeat', checkApi, async (ctx) => {
    const { userid } = ctx;
    const {
      roomId, name, devId, labId,
    } = ctx.request.body;
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
      ctx.body = {
        success: true,
        msg: '成功',
      };
    } else {
      ctx.body = {
        success: false,
        msg: '失败，换个座位再试试',
      };
    }
  })
  .get('/userInfo', checkApi, async (ctx) => {
    const { userid } = ctx;
    const userModel = findUser(userid);
    const user = userModel.value();
    const {
      enable, deleteAuto, name, seat, adjust,
    } = user;
    ctx.body = {
      success: true,
      msg: {
        enable,
        deleteAuto,
        name,
        seat,
        adjust,
      },
    };
  })
  .get('/seatInfo', checkApi, async (ctx) => {
    const { userid } = ctx;
    const userModel = findUser(userid);
    const user = userModel.value();
    let devName = '';
    let labName = '';
    let start = '';
    let isResv = false;
    let timeDesc = '';
    try {
      const {
        success, msg: session, data: { credit: [[, credit]] },
      } = await reLogin(user.session, userModel);
      if (success) {
        const { msg: reserves } = await getResvInfo(session);
        // 获取预约
        if (reserves.length !== 0) {
          [{
            devName, labName, start, timeDesc,
          }] = reserves;
          if (moment().isBefore(start, 'minute')) {
            isResv = true;
          }
        }
      }
      ctx.body = {
        success: true,
        msg: {
          // 座位
          devName,
          // 楼层
          labName,
          // 是否为预约
          isResv,
          // 信用
          credit,
          // 时间
          timeDesc,
        },
      };
    } catch (error) {
      ctx.body = {
        success: false,
        msg: error.message,
      };
    }
  })
  .post('/changeEnable', checkApi, async (ctx) => {
    const { userid } = ctx;
    const { enable } = ctx.request.body;
    const user = findUser(userid);
    const userValue = user.value();
    try {
      if (userValue.enable === true && enable === false) {
        await delAllResv(userValue);
      } else if (enable === true) {
        await getSeatImmediately(userValue);
      }
    } catch (error) {
      ctx.body = {
        success: true,
        msg: error.message,
      };
    }
    user.assign({ enable }).write();
    ctx.body = {
      success: true,
      msg: '成功',
    };
  })
  .post('/changeDeleteAuto', checkApi, async (ctx) => {
    const { userid } = ctx;
    const { deleteAuto } = ctx.request.body;
    const user = findUser(userid);
    user.assign({ deleteAuto }).write();
    ctx.body = {
      success: true,
      msg: '成功',
    };
  })
  .post('/changeAdjust', checkApi, async (ctx) => {
    const { userid } = ctx;
    const { adjust } = ctx.request.body;
    const user = findUser(userid);
    user.assign({ adjust }).write();
    ctx.body = {
      success: true,
      msg: '成功',
    };
  });
module.exports = router;
