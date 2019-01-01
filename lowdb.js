const low = require('lowdb');
const uuidv1 = require('uuid/v1');
const FileSync = require('lowdb/adapters/FileSync');

const userAdapter = new FileSync('./db.json');
const users = low(userAdapter);

const stuAdapter = new FileSync('./stu2017.json');
const stus = low(stuAdapter);

// Set some defaults (required if your JSON file is empty)
users.defaults({ users: [], code: '00000000' }).write();

// Add a post
exports.createUser = ({
  enable,
  id,
  pwd,
  devId,
  labId,
  roomId,
  deleteAuto,
  name,
  seat,
  session,
  adjust,
  hasSeat,
}) => users
  .get('users')
  .push({
    enable,
    id,
    pwd,
    devId,
    labId,
    roomId,
    deleteAuto,
    name,
    seat,
    session,
    adjust,
    hasSeat,
  })
  .write();

exports.findUsers = () => users.get('users').value();

exports.getCode = () => users.get('code').value();

exports.resetCode = () => users.set('code', uuidv1()).write();

exports.findUserById = id => users
  .get('users')
  .find({ id })
  .value();

// find user
exports.findUser = id => users.get('users').find({ id });

exports.findSeatById = devId => users
  .get('users')
  .find({ devId })
  .value();

exports.findStusByName = name => stus.filter({ XM: name }).value();
