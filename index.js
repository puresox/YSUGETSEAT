const axios = require('axios');
const moment = require('moment');
const config = require('./config');

let session = '';

/**
 *登录获取session
 *
 * @returns
 */
async function login() {
  const loginUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/login.aspx?act=login&id=${
    config.id
  }&pwd=${config.pwd}&role=512&aliuserid=&schoolcode=&wxuserid=&_nocache=1531731958096`;
  return axios.get(loginUrl).then(({ data, headers }) => {
    if (data.ret === 1) {
      // 保存session
      ({
        'set-cookie': [session],
      } = headers);
    } else {
      throw new Error('账户密码错误');
    }
  });
}

/**
 *获取预约信息
 *
 * @returns
 */
async function getResvInfo() {
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
async function delResv(resvId) {
  const delResvUrl = `http://seat.ysu.edu.cn/ClientWeb/pro/ajax/reserve.aspx?act=del_resv&id=${resvId}&_nocache=1531823241100`;
  await axios.get(delResvUrl, {
    headers: { Cookie: session },
  });
}

async function reserve() {}

/**
 *修改预约信息占座
 *
 * @param {*} {
 *   resvId, devId, labId, start,
 * }
 * @returns
 */
async function occupy({
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

async function index() {
  const time = moment().format('YYYY-MM-DD HH:mm');
  const startTime = moment().format('YYYY-MM-DD 07:00');
  const endTime = moment().format('YYYY-MM-DD 21:30');
  if (moment(time).isBetween(startTime, endTime, 'minute')) {
    // 登陆
    await login();
    // 获取预约信息
    const info = await getResvInfo();
    if (info) {
      // 占座 预约时间调到20分钟后
      info.start = moment()
        .add(20, 'm')
        .format('YYYY-MM-DD HH:mm');
      info.end = moment().format('YYYY-MM-DD 22:30');
      const occupyRes = await occupy(info);
      if (!occupyRes) {
        await delResv(info.resvId);
      }
    } else {
      // 若无预约信息则预约
    }
  }
}

index();

// 10分钟一次
setInterval(index, 1000 * 60 * 5);
