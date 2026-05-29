export const withSchool = (req, base = {}) => {
  if (req.user.role === 'super_admin') return { ...base };
  if (!req.user.school) return { ...base, school: null };
  return { ...base, school: req.user.school };
};

export const schoolIdFromReq = (req) => {
  if (req.user.role === 'super_admin') return req.params.schoolId || req.query.schoolId || req.body.school;
  return req.user.school;
};
