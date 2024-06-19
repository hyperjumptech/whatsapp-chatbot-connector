// TODO: save users session in redis or database
type UserType = { id: string; conversationId: string };
const users: UserType[] = [];

// Function to set user data in the session
export function setUserSession(user: UserType) {
  users.push(user);
  return;
}

// Function to get user data from the session
export function getUserSession(
  userId: string
): { [key: string]: string } | null {
  return users.find((user) => user.id === userId) || null;
}
