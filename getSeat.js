const axios = require('axios');
const moment = require('moment');
const { logger } = require('./logger');
const { findUsers, findUser } = require('./lowdb.js');

/**
 *登录获取session
 *
 * 仅返回错误信息
 * @returns
 */
async function login({ id, pwd }) {
  const loginUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/login.aspx?act=login&id=${id}&pwd=${pwd}&role=512&aliuserid=&schoolcode=&wxuserid=&_nocache=1531731958096`;
  const { data, headers } = await axios.get(loginUrl);
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
  const loginUrl = 'http://seat.ysu.edu.cn/ClientWeb/pro/ajax/login.aspx?act=login&id=@relogin&pwd=&role=512&aliuserid=&schoolcode=&wxuserid=&_nocache=1541949437657';
  const { data } = await axios.get(loginUrl, {
    headers: { Cookie: session },
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
  const { data } = await axios.get(getRoomsUrl);
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
  const { data } = await axios.get(getRoomStatusUrl);
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
  const { data } = await axios.get(delResvUrl, {
    headers: { Cookie: session },
  });
  if (data.ret !== 1) {
    logger.error(`${user.id} fail to delete a reserve. Error:${data.msg}`);
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
        await reserve(newUser, session, start, end);
      }
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
 *判断是否可预约
 *
 * 仅返回错误信息
 * @returns
 */
async function checkReserve() {
  const { success, msg } = await getRoomStatus('100457211');
  if (success) {
    const seats = msg;
    const [{ state }] = seats;
    if (state !== 'close') {
      return { success: true };
    }
    return { success: false };
  }
  return { success: false, msg };
}

async function getSeat(user) {
  const userModel = findUser(user.id);

  // 设置开始结束时间
  let start = moment()
    .add(20, 'm')
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
      return;
    }
  }
  // 06:30预约
  const nowTime = moment().format('HH:mm');
  if (nowTime === '06:30' || nowTime === '06:29') {
    let { success, msg } = await reserve(user, session, moment().format('YYYY-MM-DD 07:30'), end);
    if (!success && msg.includes('登录')) {
      logger.error(`${user.id} session is out of date. Error:${msg}`);
      ({ success, msg } = await login(user));
      if (!success) {
        logger.error(`${user.id} login error,system end. Error:${msg}`);
        return;
      }
      userModel.assign({ session: msg }).write();
      const newUser = Array.from(user);
      newUser.session = msg;
      await getSeat(newUser);
    }
    return;
  }

  // 刷新登录信息
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
  // 修改预约状态
  if (
    reserveOfToday
    && moment(start).isBetween(reserveOfToday.start, reserveOfToday.end, 'minute')
  ) {
    const { id: resvId, devId, labId } = reserveOfToday;
    const info = { resvId, devId, labId };
    // 占座 预约时间调到20分钟后
    info.start = start;
    info.end = reserveOfToday.end;
    ({ success, msg } = await occupy(session, info));
    if (success) {
      // logger.info(`${user.id} change a reserve successfully`);
    } else if (user.deleteAuto === true) {
      logger.error(`${user.id} fail to change a reserve, try to delete it. Error:${msg}`);
      await delResv(user, session, info.resvId);
      // await reserve(user, session, start, end);
    } else {
      logger.error(`${user.id} fail to change a reserve, but i will not do anything. Error:${msg}`);
      // if (!msg.includes('1小时')) {
      //   await delResv(user, session, info.resvId);
      //   await reserve(user, session, start, end);
      // }
    }
  } else if (!reserveOfToday && moment().isBefore(moment().format('YYYY-MM-DD 21:00'), 'minute')) {
    // 预约今日座位
    if (moment().isBefore(moment().format('YYYY-MM-DD 07:30'), 'minute')) {
      start = moment().format('YYYY-MM-DD 07:30');
    }
    await reserve(user, session, start, end);
  }
}

/**
 *所有用户占座
 *
 * @returns
 */
async function index() {
  if (
    !moment().isBetween(
      moment().format('YYYY-MM-DD 06:20'),
      moment().format('YYYY-MM-DD 22:30'),
      'minute',
    )
  ) {
    return;
  }
  const getSeatPromises = [];
  const users = findUsers();
  users.forEach((user) => {
    if (user.enable) {
      getSeatPromises.push(getSeat(user));
    }
  });
  await Promise.all(getSeatPromises);
  // logger.info('----------------------------------------------------------------------------');
}

/**
 *提前预约
 *
 * 仅返回错误信息
 * @returns
 */
async function preReserve() {
  const { success, msg } = await checkReserve();
  if (success) {
    await index();
    return { success: true };
  }
  logger.error(`Error:${msg}`);
  return { success: false };
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
exports.preReserve = preReserve;
