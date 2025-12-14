export interface User {
  id: string;
  username: string;
}

const users = [
  {
    id: "1",
    username: process.env.USER1_USERNAME || "usuario1",
    password: process.env.USER1_PASSWORD || "password1",
  },
  {
    id: "2",
    username: process.env.USER2_USERNAME || "usuario2",
    password: process.env.USER2_PASSWORD || "password2",
  },
];

export function validateCredentials(
  username: string,
  password: string
): User | null {
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    return { id: user.id, username: user.username };
  }
  return null;
}
