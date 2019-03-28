module.exports = {
  checkHasSignIn: async (ctx, next) => {
    const userid = ctx.cookies.get('id', { signed: true });
    if (!userid) {
      await ctx.redirect('/signin');
    } else {
      ctx.userid = userid;
      await next();
    }
  },
  checkNotSignIn: async (ctx, next) => {
    const userid = ctx.cookies.get('id', { signed: true });
    if (userid) {
      await ctx.redirect('/');
    } else {
      await next();
    }
  },
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
