const axios = require('axios');
const moment = require('moment');
const log4js = require('log4js');
const schedule = require('node-schedule');
const config = require('./config');

log4js.configure({
  appenders: {
    app: {
      type: 'dateFile',
      filename: 'logs/application.log',
      compress: true,
      keepFileExt: true,
      daysToKeep: 3,
    },
    console: { type: 'console' },
  },
  categories: {
    default: { appenders: ['app', 'console'], level: 'debug' },
  },
});
const logger = log4js.getLogger();

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
 *删除预约
 *
 * @param {*} resvId
 */
async function delResv(session, resvId) {
  const delResvUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?act=del_resv&id=${resvId}&_nocache=1531823241100`;
  const { data } = await axios.get(delResvUrl, {
    headers: { Cookie: session },
  });
  if (data.ret !== 1) {
    return { success: false, msg: data.msg };
  }
  return { success: true, msg: '' };
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
  const startReal = moment().format('YYYY-MM-DD 07:30');
  let start = moment()
    .add(20, 'm')
    .format('YYYY-MM-DD HH:mm');
  if (moment(start).isBefore(startReal, 'minute')) {
    start = startReal;
  }
  const end = moment().format('YYYY-MM-DD 22:30');
  // 获取今日预约
  const reserveOfToday = reserves.find((reservation) => {
    const [today] = reservation.start.split(' ');
    return today === moment().format('YYYY-MM-DD');
  });
  if (reserveOfToday) {
    const { id: resvId, devId, labId } = reserveOfToday;
    const info = { resvId, devId, labId };
    // 占座 预约时间调到20分钟后
    info.start = start;
    info.end = end;
    ({ success, msg } = await occupy(session, info));
    if (success) {
      logger.info(`${user.id} change a reserve successfully`);
    } else {
      logger.error(`${user.id} fail to change a reserve. Error:${msg}`);
      ({ success, msg } = await delResv(session, info.resvId));
      if (!success) {
        logger.error(`${user.id} fail to delete a reserve. Error:${msg}`);
      }
      logger.info(`${user.id} delete a reserve successfully`);
    }
  } else {
    // 预约今日座位
    await reserve(user, session, start, end);
  }
  // 获取明日预约
  const reserveOfTomorrow = reserves.find((reservation) => {
    const [today] = reservation.start.split(' ');
    return (
      today
      === moment()
        .add(1, 'd')
        .format('YYYY-MM-DD')
    );
  });
  if (!reserveOfTomorrow) {
    // 预约明日座位
    await reserve(
      user,
      session,
      moment(start)
        .add(1, 'd')
        .format('YYYY-MM-DD 07:30'),
      moment(end)
        .add(1, 'd')
        .format('YYYY-MM-DD HH:mm'),
    );
  }
}

async function index() {
  const startTime = moment().format('YYYY-MM-DD 06:59');
  const endTime = moment().format('YYYY-MM-DD 21:26');
  // 是否为图书馆开馆时间
  if (!moment().isBetween(startTime, endTime, 'minute')) {
    // logger.warn('the library is close,system end');
    return;
  }
  logger.info('----------------------------------------------------------------------------');
  const getSeatPromises = [];
  config.forEach((user) => {
    getSeatPromises.push(getSeat(user));
  });
  await Promise.all(getSeatPromises);
  logger.info('----------------------------------------------------------------------------');
}

logger.info('system start');

index();

// 5分钟一次
schedule.scheduleJob('*/5 * * * *', async () => {
  await index();
});

// TODO:devid转换
// TODO:调剂
// TODO:可视化界面
