-- Remove K3next accounts not in the demo list
DELETE FROM "User" WHERE email IN (
  'nikunjdeshani7878@gmail.com',
  'kishangondaliya7575@gmail.com'
);
