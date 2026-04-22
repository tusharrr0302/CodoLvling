const { requireAuth } = require('@clerk/express');

// Drop-in replacement for old JWT authMiddleware.
// requireAuth() validates the Clerk session token from the Authorization header.
// After this middleware, req.auth.userId contains the Clerk user ID.
module.exports = requireAuth();
