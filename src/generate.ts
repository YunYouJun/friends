import fs from "fs";
import yaml from "js-yaml";
import { Logger } from "@yunyoujun/logger";
import config from "./config";

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
  email?: string;
  /**
   * 代表色
   */
  color: string;
}

/**
 * 生成 links.json
 * @returns
 */
function generateLinksJson() {
  const distFolder = "dist";

  const links = yaml.load(fs.readFileSync(config.dataFile, "utf8")) as Friend[];

  links.forEach((link) => {
    // hide email
    delete link.email;
  });

  if (!fs.existsSync(distFolder)) {
    fs.mkdirSync(distFolder, { recursive: true });
  }
  fs.writeFileSync(`${distFolder}/links.json`, JSON.stringify(links));
  logger.success("Generated links.json successfully!");
}

try {
  generateLinksJson();
} catch (e) {
  console.error(e);
}
