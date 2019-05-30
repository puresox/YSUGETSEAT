# YSUGETSEAT

燕山大学图书馆占座后端程序

## 重要通知
散了吧，2019/5/27开始，一开脚本ip就被学校封了。

## 特点

1.  自动预约今日座位
2.  闭馆前自动释放
3.  离馆不需要释放座位/暂离，永不违规
4.  可以查看座位上用户的信息

## 原理

图书馆的预约规则：

1.  预约开始时间与当前时间相差小于一小时时，其他人无法占这个座位。
2.  预约开始时间可以无限变更。

利用这两个规则，先预定一个座位然后用脚本一直更改预约开始时间，使其与当前时间之差小于一小时，这样除我以外所有人都不能占这个座位，即这个座位是我的，因为预约没有开始，所以这个座位不是我的，也就不会违规。

## Usage

1.  环境 nodejs 8+
2.  下载仓库
3.  安装依赖 `npm i`
4.  安装 PM2 `npm -g install pm2`
5.  参照 `config.example.js` 配置 `config.js` (此文件需要自己新建)
6.  运行 `npm start`

## 数据库(位于根目录 `db.json`)

```javascript
{
  "users": [
    {
      "name": "姓名",
      "enable": false,
      "id": "学号",
      "pwd": "密码",
      "seat": "二阅-238",
      "devId": "101439455",
      "labId": "100457205",
      "deleteAuto": true,
      "session": "ASP.NET_SessionId=**************; path=/; HttpOnly",
      "adjust": true,
      "roomId": "100457213",
      "hasSeat": true
    }
  ],
  "code": "邀请码"
}
```

