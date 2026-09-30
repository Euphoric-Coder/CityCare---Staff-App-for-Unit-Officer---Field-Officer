export async function requireCityAdmin(ctx: any, cityAdminUserId: any) {
  const user = await ctx.db.get(cityAdminUserId);
  if (!user || user.role !== 'city_admin') {
    throw new Error('Unauthorised: City Admin access required');
  }

  const profile = await ctx.db
    .query('cityAdmins')
    .withIndex('by_user', (q: any) => q.eq('userId', cityAdminUserId))
    .unique();

  if (!profile) {
    throw new Error('City Admin profile not found');
  }

  return {
    user,
    profile,
    city: profile.city,
    state: profile.state,
  };
}
