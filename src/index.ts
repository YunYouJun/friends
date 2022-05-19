#!/usr/bin/env node
import { program } from "commander";
import yaml from "js-yaml";
import fs from "fs";
import chalkPipe from "chalk-pipe";
import inquirer from "inquirer";
import config from "./config";

const pkg = require("../package.json");
program.version(pkg.version);

const questions = [
  {
    type: "input",
    name: "url",
    message: "站点链接：",
  },
  {
    type: "input",
    name: "avatar",
    message: "头像链接：",
  },
  {
    type: "input",
    name: "name",
    message: "作者名称：",
  },
  {
    type: "input",
    name: "blog",
    message: "站点名称：",
  },
  {
    type: "input",
    name: "desc",
    message: "站点描述：",
  },
  {
    type: "input",
    name: "email",
    message: "联系邮箱：",
  },
  {
    type: "input",
    name: "color",
    message: "代表色彩：",
    transformer(color: string) {
      return chalkPipe(color)(color);
    },
  },
];

program.command("add").action(async () => {
  const answers = await inquirer.prompt(questions);
  const item = yaml.dump([answers]);
  console.log(item);
  fs.appendFileSync(config.dataFile, item);
});

export async function run() {
  program.parse(process.argv);
}
