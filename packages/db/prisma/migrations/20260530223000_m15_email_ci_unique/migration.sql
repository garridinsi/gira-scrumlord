-- Case-insensitive uniqueness for User.email, enforced at the DB level (defense in
-- depth for the app-level lowercasing). The magic-link login path always lowercases
-- the email, so without this a case variant (Foo@x.com vs foo@x.com) could create a
-- second, shadowing account that login can never reach. Belt to the app's suspenders.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower("email"));
