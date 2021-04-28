import * as yaml from "js-yaml";
import * as fs from "fs";
import { Logger } from "@yunyoujun/logger";

const logger = new Logger();

/**
 * 友链
 */
export interface Friend {
  /**
   * 链接
   */
  url: string;
  /**
   * 头像
   */
  avatar: string;
  /**
   * 种类
   */
  category?: string;
  /**
   * 称呼
   */
  name: string;
  /**
   * 博客
   */
  blog: string;
  /**
   * 描述
   */
  desc: string;
  /**
   * 邮件
   */
  email: string;
  /**
   * 代表色
   */
  color: string;
}

/**
 * 主函数
 * @returns
 */
function main() {
  const sourceFolder = "src";
  const distFolder = "dist";

  const links = yaml.load(
    fs.readFileSync(`${sourceFolder}/links.yml`, "utf8")
  ) as Friend[];

  links.forEach((link) => {
    // hide email
    delete link.email;
  });

  if (fs.existsSync(distFolder)) {
    fs.mkdirSync(distFolder, { recursive: true });
  }
  fs.writeFileSync(`${distFolder}/links.json`, JSON.stringify(links));
  logger.success("Generated links.json successfully!");
}

try {
  main();
} catch (e) {
  console.error(e);
}
