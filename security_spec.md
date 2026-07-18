# Firestore Security Specification - TruCast

## Data Invariants
1. Posts must have a valid author (the current user).
2. Comments must have a valid author and belong to an existing post.
3. Likes are unique per user per post (keyed by `request.auth.uid`).
4. Favorites are unique per user per post (keyed by `${userId}_${postId}`).
5. No one can modify another user's post, comment, or favorite.
6. Identity fields (`userId`, `userName`) are immutable and must match the authenticated user.

## The Dirty Dozen Payloads (Rejected)
1. Creating a post with another user's `userId`.
2. Updating a post's `userId` field.
3. Deleting someone else's post.
4. Adding a comment with a fake `userName`.
5. Modifying a comment's author.
6. Creating a like for another user.
7. Injecting a 2MB string into a post `content`.
8. Setting a future server timestamp for `createdAt`.
9. Accessing the `favorites` collection as an unauthenticated user.
10. Listing all `favorites` in the system (must filter by `userId`).
11. Updating a terminal status (not applicable yet but reserved).
12. Shadow fields injection (adding `isAdmin: true` to a user profile).

## Implementation Details
- Every write uses `isValidId()` and `isValid[Entity]()`.
- `allow list` explicitly filters by `resource.data.userId` or relational owner.
- Identity verification in every write.
