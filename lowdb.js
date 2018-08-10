const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Set some defaults (required if your JSON file is empty)
db.defaults({ users: [] }).write();

// Add a post
exports.createUser = ({
  enable, id, pwd, devId, labId, deleteAuto,
}) => db
  .get('users')
  .push({
    enable,
    id,
    pwd,
    devId,
    labId,
    deleteAuto,
  })
  .write();

exports.findUsers = () => db.get('users').value();

exports.findUserById = id => db
  .get('users')
  .find({ id })
  .value();

// find user
exports.findUser = id => db.get('users').find({ id });
