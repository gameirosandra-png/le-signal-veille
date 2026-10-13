-- Better Auth 1.7.7: isolated admin tables, apply with migration role.
BEGIN;
create table "signal_admin_user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "signal_admin_session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "signal_admin_user" ("id") on delete cascade);

create table "signal_admin_account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "signal_admin_user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "signal_admin_verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "signal_admin_rate_limit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "signal_admin_session_userId_idx" on "signal_admin_session" ("userId");

create index "signal_admin_account_userId_idx" on "signal_admin_account" ("userId");

create index "signal_admin_verification_identifier_idx" on "signal_admin_verification" ("identifier");

GRANT SELECT, INSERT, UPDATE, DELETE ON signal_admin_user, signal_admin_session, signal_admin_account, signal_admin_verification, signal_admin_rate_limit TO signal_newsletter_app;
COMMIT;
