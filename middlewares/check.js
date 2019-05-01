module.exports = {
  checkApi: async (ctx, next) => {
    const userid = ctx.request.header.id;
    if (userid) {
      ctx.userid = userid;
      await next();
    } else {
      ctx.body = {
        success: false,
        msg: '用户验证错误',
      };
    }
  },
};
