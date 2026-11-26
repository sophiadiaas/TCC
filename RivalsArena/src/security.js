const {
  randomBytes,
  scrypt: derive,
  timingSafeEqual,
  createHash,
} = require("node:crypto");
const { promisify } = require("node:util");
const scrypt = promisify(derive);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await scrypt(password, salt, 64)).toString("hex");
}
async function verifyPassword(password, hash) {
  const [salt, key] = hash.split(":");
  const got = await scrypt(password, salt, 64);
  return timingSafeEqual(got, Buffer.from(key, "hex"));
}
const digest = (t) => createHash("sha256").update(t).digest("hex");
module.exports = { hashPassword, verifyPassword, digest, randomBytes };
