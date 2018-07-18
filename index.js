const axios = require('axios');
const moment = require('moment');
const config = require('./config');

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
    return session;
  }
  return false;
}

/**
 *获取预约信息
 *
 * @returns
 */
async function getResvInfo(session) {
  const getResvIdUrl = 'http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?stat_flag=9&act=get_my_resv&_nocache=1531801794371';
  const {
    data: { data },
  } = await axios.get(getResvIdUrl, {
    headers: { Cookie: session },
  });
  if (data.length !== 0) {
    const [{ id: resvId, devId, labId }] = data;
    return { resvId, devId, labId };
  }
  return false;
}

/**
 *删除预约
 *
 * @param {*} resvId
 */
async function delResv(session, resvId) {
  const delResvUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?act=del_resv&id=${resvId}&_nocache=1531823241100`;
  await axios.get(delResvUrl, {
    headers: { Cookie: session },
  });
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
  const {
    data: { ret },
  } = await axios.get(occupyUrl, {
    headers: { Cookie: session },
  });
  return ret === 1;
}

async function getSeat(user) {
  const startTime = moment().format('YYYY-MM-DD 07:00');
  const endTime = moment().format('YYYY-MM-DD 21:30');
  // 是否为图书馆开馆时间
  if (!moment().isBetween(startTime, endTime, 'minute')) {
    return;
  }
  // 登陆 获取session
  const session = await login(user);
  if (!session) {
    return;
  }
  // 获取预约信息
  const info = await getResvInfo(session);
  const start = moment()
    .add(20, 'm')
    .format('YYYY-MM-DD HH:mm');
  const end = moment().format('YYYY-MM-DD 22:30');
  // 是否已经预约
  if (!info) {
    // 预约座位
    const { devId, labId } = user;
    await occupy(session, {
      resvId: '',
      devId,
      labId,
      start,
      end,
    });
  } else {
    // 占座 预约时间调到20分钟后
    info.start = start;
    info.end = end;
    const occupyRes = await occupy(session, info);
    if (!occupyRes) {
      await delResv(session, info.resvId);
    }
  }
  // TODO: log
}

async function index() {
  const getSeatPromises = [];
  config.forEach((user) => {
    getSeatPromises.push(getSeat(user));
  });
  await Promise.all(getSeatPromises);
}

index();

// 5分钟一次
setInterval(index, 1000 * 60 * 5);
