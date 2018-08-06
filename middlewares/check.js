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
};
