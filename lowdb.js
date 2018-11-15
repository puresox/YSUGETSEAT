const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const userAdapter = new FileSync('./db.json');
const users = low(userAdapter);

const stuAdapter = new FileSync('./stu2017.json');
const stus = low(stuAdapter);

// Set some defaults (required if your JSON file is empty)
users.defaults({ users: [] }).write();

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
  })
  .write();

exports.findUsers = () => users.get('users').value();

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
