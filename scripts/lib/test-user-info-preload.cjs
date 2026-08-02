/* eslint-disable @typescript-eslint/no-require-imports */
const os = require("node:os");
const nativeUserInfo = os.userInfo.bind(os);

os.userInfo = (...args) => {
  try {
    return nativeUserInfo(...args);
  } catch (error) {
    if (error?.code !== "ERR_SYSTEM_ERROR") {
      throw error;
    }

    return {
      username: process.env.USERNAME || "boxario-test",
      uid: -1,
      gid: -1,
      shell: null,
      homedir: process.env.USERPROFILE || process.cwd(),
    };
  }
};
