const Router = require('koa-router');
const index = require('./routers/index');
const api = require('./routers/api');

const router = new Router();

router.use('/', index.routes(), index.allowedMethods());
router.use('/api', api.routes(), api.allowedMethods());

module.exports = router;
