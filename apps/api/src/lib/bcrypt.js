import bcrypt from 'bcrypt';

export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password, password_hash) {
    return await bcrypt.compare(password, password_hash);
}