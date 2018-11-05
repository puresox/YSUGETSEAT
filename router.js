const Router = require('koa-router');
const signup = require('./routers/signup');
const signin = require('./routers/signin');
const index = require('./routers/index');
const changeSeat = require('./routers/changeSeat');
const findUser = require('./routers/findUser');
const logout = require('./routers/logout');
const getStuDetail = require('./routers/getStuDetail');

const router = new Router();

router.use('/', index.routes(), index.allowedMethods());
router.use('/signup', signup.routes(), signup.allowedMethods());
router.use('/signin', signin.routes(), signin.allowedMethods());
router.use('/changeSeat', changeSeat.routes(), changeSeat.allowedMethods());
router.use('/findUser', findUser.routes(), findUser.allowedMethods());
router.use('/logout', logout.routes(), logout.allowedMethods());
router.use('/getStuDetail', getStuDetail.routes(), getStuDetail.allowedMethods());

module.exports = router;
