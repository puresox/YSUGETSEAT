const axios = require('axios');
const moment = require('moment');
const { logger } = require('./logger');
const { findUsers } = require('./lowdb.js');

/**
 *登录获取session
 *
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
    return { success: true, msg: session };
  }
  return { success: false, msg: data.msg };
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
  // 登陆 获取session
  let { success, msg } = await login(user);
  if (!success) {
    logger.error(`${user.id} login error,system end. Error:${msg}`);
    return;
  }
  const session = msg;
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
  const { success, msg } = await occupy(session, {
    resvId: '',
    devId,
    labId,
    start,
    end,
  });
  if (success) {
    logger.info(`${user.id} reserves a new seat successfully in ${start}`);
  } else {
    logger.error(`${user.id} fail to reserve a new seat. Error:${msg}`);
  }
}

async function getSeat(user) {
  // 登陆 获取session
  let { success, msg } = await login(user);
  if (!success) {
    logger.error(`${user.id} login error,system end. Error:${msg}`);
    return;
  }
  const session = msg;
  // 获取预约信息
  ({ success, msg } = await getResvInfo(session));
  if (!success) {
    logger.error(`${user.id} getResvInfo error,system end. Error:${msg}`);
    return;
  }
  const reserves = msg;
  // 设置开始结束时间
  let start = moment()
    .add(20, 'm')
    .format('YYYY-MM-DD HH:mm');
  const end = moment().format('YYYY-MM-DD 22:30');
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
      logger.error(`${user.id} fail to change a reserve. Error:${msg}`);
      await delResv(user, session, info.resvId);
    } else {
      logger.error(`${user.id} fail to change a reserve. Error:${msg}`);
    }
  } else if (!reserveOfToday && moment().isBefore(moment().format('YYYY-MM-DD 21:00'), 'minute')) {
    // 预约今日座位
    if (moment().isBefore(moment().format('YYYY-MM-DD 07:30'), 'minute')) {
      start = moment().format('YYYY-MM-DD 07:30');
    }
    await reserve(user, session, start, end);
  }
}

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

exports.getSeat = index;
exports.delAllResv = delAllResv;
exports.getRooms = getRooms;
exports.getRoomStatus = getRoomStatus;
