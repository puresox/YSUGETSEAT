const axios = require('axios');
const moment = require('moment');
const { logger } = require('./logger');
const { findUsers, findUser } = require('./lowdb.js');
const { timeout } = require('./config/config.js');

/**
 *延迟任意秒
 *
 * @returns
 */
function takeLongTime(sec) {
  return new Promise((resolve) => {
    setTimeout(() => resolve('long_time_value'), 1000 * sec);
  });
}

/**
 *登录获取session
 *
 * 仅返回错误信息
 * @returns
 */
async function login({ id, pwd }) {
  const loginUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/login.aspx?act=login&id=${id}&pwd=${pwd}&role=512&aliuserid=&schoolcode=&wxuserid=&_nocache=1531731958096`;
  const { data, headers } = await axios.get(loginUrl, { timeout });
  if (data.ret === 1) {
    // 保存session
    const {
      'set-cookie': [session],
    } = headers;
    return { success: true, msg: session, name: data.data.name };
  }
  return { success: false, msg: data.msg };
}

/**
 *刷新登录状态
 *
 * @returns
 */
async function reLogin(session, userModel) {
  if (!session) {
    const { success, msg } = await login(userModel.value());
    if (success) {
      userModel.assign({ session: msg }).write();
      return { success: true, msg };
    }
    logger.error(`${userModel.value().id} login error,system end. Error:${msg}`);
    return { success: false };
  }
  const loginUrl = 'http://seat.ysu.edu.cn/ClientWeb/pro/ajax/login.aspx?act=login&id=@relogin&pwd=&role=512&aliuserid=&schoolcode=&wxuserid=&_nocache=1541949437657';
  const { data } = await axios.get(loginUrl, {
    headers: { Cookie: session },
    timeout,
  });
  if (data.ret !== 1) {
    logger.error(`${userModel.value().id} reLogin error, try to login. Error:${data.msg}`);
    const { success, msg } = await login(userModel.value());
    if (!success) {
      return { success: false, msg };
    }
    logger.info(`${userModel.value().id} reLogin successfully.`);
    userModel.assign({ session: msg }).write();
    return { success: true, msg };
  }
  return { success: true, msg: session };
}

/**
 *获取预约信息
 *
 * @returns
 */
async function getResvInfo(session) {
  const getResvIdUrl = 'http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?stat_flag=9&act=get_my_resv&_nocache=1531801794371';
  const { data } = await axios.get(getResvIdUrl, {
    headers: { Cookie: session },
    timeout,
  });
  if (data.ret !== 1) {
    return { success: false, msg: data.msg };
  }
  return { success: true, msg: data.data };
}

/**
 *获取阅览室列表
 *
 * @returns
 */
async function getRooms() {
  const getRoomsUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/room.aspx?classkind=8&date=${moment().format(
    'YYYY-MM-DD',
  )}&start=${moment().format('HH:mm')}&end=${moment()
    .add(60, 'm')
    .format('HH:mm')}&act=get_rm_sta&_nocache=1534001491105`;
  const { data } = await axios.get(getRoomsUrl, { timeout });
  if (data.ret !== 1) {
    return { success: false, msg: data.msg };
  }
  return { success: true, msg: data.data };
}

/**
 *获取一个阅览室的座位
 *
 * @param {*} roomId
 * @returns
 */
async function getRoomStatus(roomId) {
  const getRoomStatusUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/device.aspx?room_id=${roomId}&date=${moment().format(
    'YYYY-MM-DD',
  )}&act=get_rsv_sta&fr_start=${moment().format('HH:mm')}&fr_end=${moment()
    .add(60, 'm')
    .format('HH:mm')}&_nocache=1534047543589`;
  const { data } = await axios.get(getRoomStatusUrl, { timeout });
  if (data.ret !== 1) {
    return { success: false, msg: data.msg };
  }
  return { success: true, msg: data.data };
}

/**
 *删除预约
 *
 * @param {*} resvId
 */
async function delResv(user, session, resvId) {
  const delResvUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?act=del_resv&id=${resvId}&_nocache=1531823241100`;
  const {
    data: { ret, msg },
  } = await axios.get(delResvUrl, {
    headers: { Cookie: session },
    timeout,
  });
  if (ret !== 1) {
    logger.error(`${user.id} fail to delete a reserve, try to anothor way. Error1:${msg}`);
    const resvLeave = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?act=resv_leave&type=2&resv_id=${resvId}&_nocache=1542681776115`;
    await axios.get(resvLeave, {
      headers: { Cookie: session },
      timeout,
    });
  } else {
    logger.info(`${user.id} delete a reserve successfully`);
  }
}

/**
 *删除该用户所有预约
 *
 * @param {*} user
 * @returns
 */
async function delAllResv(user) {
  const userModel = findUser(user.id);
  let { session } = userModel.value();
  // 刷新登陆
  let { success, msg } = await reLogin(session, userModel);
  if (!success) {
    logger.error(`${user.id} reLogin error,system end. Error:${msg}`);
    return;
  }
  session = msg;
  // 获取预约信息
  ({ success, msg } = await getResvInfo(session));
  if (!success) {
    logger.error(`${user.id} getResvInfo error,system end. Error:${msg}`);
    return;
  }
  const reserves = msg;
  const reservesPromises = [];
  reserves.forEach(({ id }) => {
    reservesPromises.push(delResv(user, session, id));
  });
  await Promise.all(reservesPromises);
}

/**
 *修改预约信息占座
 *
 * @param {*} {
 *   resvId, devId, labId, start,
 * }
 * @returns
 */
async function occupy(session, {
  resvId, devId, labId, start, end,
}) {
  const occupyUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?dev_id=${devId}&lab_id=${labId}&room_id=&kind_id=&type=dev&prop=&test_id=&resv_id=${resvId}&term=&min_user=&max_user=&mb_list=&test_name=&start=${start}&end=${end}&memo=&act=set_resv&_nocache=1531732522498`;
  const { data } = await axios.get(occupyUrl, {
    headers: { Cookie: session },
    timeout,
  });
  if (data.ret !== 1) {
    return { success: false, msg: data.msg };
  }
  return { success: true, msg: '' };
}

/**
 *预约座位
 *
 * @param {*} user
 * @param {*} session
 * @param {*} start
 * @param {*} end
 */
async function reserve(user, session, start, end) {
  const { devId, labId } = user;
  let { roomId } = user;
  let { success, msg } = await occupy(session, {
    resvId: '',
    devId,
    labId,
    start,
    end,
  });
  if (success) {
    logger.info(`${user.id} reserves a new seat ${user.seat} successfully`);
    return { success: true, msg: '' };
  }
  // 调剂
  if (!success && msg.includes('冲突') && user.adjust) {
    // 获取roomId
    if (!roomId) {
      ({ success, msg } = await getRooms());
      if (success) {
        const [seatName] = user.seat.split('-');
        const rooms = msg;
        const room = rooms.find(({ name }) => name.includes(seatName));
        ({ id: roomId } = room);
        // 保存
        const userModel = findUser(user.id);
        userModel.assign({ roomId }).write();
      }
    }
    // 获取空座位
    ({ success, msg } = await getRoomStatus(roomId));
    if (success) {
      const seats = msg;
      const seat = seats.find(({ ts }) => ts.length === 0);
      if (seat) {
        const newUser = Array.from(user);
        newUser.devId = seat.devId;
        newUser.labId = seat.labId;
        newUser.seat = seat.name;
        logger.error(`${user.id} fail to reserves the seat ${user.seat}, try to ${newUser.seat}.`);
        ({ success, msg } = await reserve(newUser, session, start, end));
        if (success) {
          return { success: true };
        }
        return { success: false, msg };
      }
      return { success: false, msg: 'there is no seat left' };
    }
  }
  logger.error(`${user.id} fail to reserve a new seat ${user.seat}. Error:${msg}`);
  return { success: false, msg };
}

/**
 *快速修改预约
 *
 * @param {*} user
 * @returns
 */
async function quickResvSeat(user, startTime) {
  const userModel = findUser(user.id);
  let { session } = userModel.value();
  // 刷新登陆
  let { success, msg } = await reLogin(session, userModel);
  if (!success) {
    logger.error(`${user.id} reLogin error,system end. Error:${msg}`);
    return;
  }
  session = msg;
  // 获取预约信息
  ({ success, msg } = await getResvInfo(session));
  if (!success) {
    logger.error(`${user.id} getResvInfo error,system end. Error:${msg}`);
    return;
  }
  const reserves = msg;
  // 获取预约
  const reserveOfToday = reserves[0];
  const { id: resvId, devId, labId } = reserveOfToday;
  const info = { resvId, devId, labId };
  // 占座 预约时间调到选定时间
  info.start = startTime;
  info.end = reserveOfToday.end;
  ({ success, msg } = await occupy(session, info));
  if (!success) {
    const reservesPromises = [];
    // 删除座位
    reserves.forEach(({ id }) => {
      reservesPromises.push(delResv(user, session, id));
    });
    await Promise.all(reservesPromises);
    // 预约座位
    await reserve(user, session, startTime, moment().format('YYYY-MM-DD 22:30'));
  }
}

/**
 *获取单个用户的座位
 *
 * @param {*} user
 * @returns
 */
async function getSeat(user) {
  const userModel = findUser(user.id);
  const nowMinute = parseInt(moment().format('mm'), 10);
  const needOccupy = nowMinute % 10 === 0;

  // 设置开始结束时间
  let start = moment()
    .add(35, 'm')
    .format('YYYY-MM-DD HH:mm');
  const end = moment().format('YYYY-MM-DD 22:30');

  // 获取session
  let { session } = user;
  if (!session) {
    const { success, msg } = await login(user);
    if (success) {
      userModel.assign({ session: msg }).write();
      session = msg;
    } else {
      logger.error(`${user.id} login error,system end. Error:${msg}`);
      return { success: false };
    }
  }
  // 06:30预约
  const nowTime = moment().format('HH:mm');
  if (nowTime === '06:30') {
    userModel.assign({ hasSeat: false }).write();
    let { success, msg } = await reserve(user, session, moment().format('YYYY-MM-DD 07:30'), end);
    if (!success && msg.includes('登录')) {
      ({ success, msg } = await login(user));
      if (!success) {
        logger.error(`${user.id} login error,system end. Error:${msg}`);
        return { success: false };
      }
      userModel.assign({ session: msg }).write();
      const newUser = Array.from(user);
      newUser.session = msg;
      await getSeat(newUser);
    } else if (!success && msg.includes('6:30')) {
      await takeLongTime(1);
      await getSeat(user);
    } else if (!success && msg.includes('积分不足')) {
      userModel.assign({ enable: false }).write();
      return { success: false };
    }
    return { success: true };
  }

  // 刷新登录信息
  let { success, msg } = await reLogin(session, userModel);
  if (!success) {
    logger.error(`${user.id} reLogin error,system end. Error:${msg}`);
    return { success: false };
  }
  session = msg;

  // 获取预约信息
  ({ success, msg } = await getResvInfo(session));
  if (!success) {
    logger.error(`${user.id} getResvInfo error,system end. Error:${msg}`);
    return { success: false };
  }
  const reserves = msg;
  // 获取预约
  const reserveOfToday = reserves[0];
  if (reserveOfToday) {
    userModel.assign({ hasSeat: true }).write();
  } else {
    userModel.assign({ hasSeat: false }).write();
  }
  // 修改预约状态
  if (
    reserveOfToday
    && moment(start).isBetween(reserveOfToday.start, reserveOfToday.end, 'minute')
    && needOccupy
  ) {
    const { id: resvId, devId, labId } = reserveOfToday;
    const info = { resvId, devId, labId };
    // 占座 预约时间调到35分钟后
    info.start = start;
    info.end = reserveOfToday.end;
    ({ success, msg } = await occupy(session, info));
    if (success) {
      // logger.info(`${user.id} change a reserve successfully`);
    } else if (user.deleteAuto === true) {
      logger.error(`${user.id} fail to change a reserve, try to delete it. Error:${msg}`);
      await delResv(user, session, info.resvId);
      await reserve(user, session, start, reserveOfToday.end);
    } else {
      logger.error(`${user.id} fail to change a reserve, but i will not do anything. Error:${msg}`);
      if (!msg.includes('1小时')) {
        await delResv(user, session, info.resvId);
        await reserve(user, session, start, reserveOfToday.end);
      }
    }
  } else if (
    !reserveOfToday
    && moment().isBetween(
      moment().format('YYYY-MM-DD 06:30'),
      moment().format('YYYY-MM-DD 21:00'),
      'minute',
    )
  ) {
    // 预约今日座位
    if (moment().add(35, 'm').isBefore(moment().format('YYYY-MM-DD 07:30'), 'minute')) {
      start = moment().format('YYYY-MM-DD 07:30');
    }
    await reserve(user, session, start, end);
  }
  return { success: true };
}

/**
 *所有用户占座
 *
 * @returns
 */
async function index() {
  if (
    !moment().isBetween(
      moment().format('YYYY-MM-DD 06:15'),
      moment().format('YYYY-MM-DD 22:30'),
      'minute',
    )
  ) {
    return;
  }
  const nowMinute = parseInt(moment().format('mm'), 10);
  const tenM = nowMinute % 10 === 0;
  const getSeatPromises = [];
  const users = findUsers();
  users.forEach((user) => {
    const { hasSeat } = user;
    if (user.enable && (tenM || !hasSeat)) {
      getSeatPromises.push(getSeat(user));
    }
  });
  await Promise.all(getSeatPromises);
  logger.info('----------------------------------------------------------------------------');
}

exports.getSeat = index;
exports.delAllResv = delAllResv;
exports.getRooms = getRooms;
exports.getRoomStatus = getRoomStatus;
exports.getSeatImmediately = getSeat;
exports.login = login;
exports.quickResvSeat = quickResvSeat;
exports.reLogin = reLogin;
exports.getResvInfo = getResvInfo;
