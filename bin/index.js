#!/usr/bin/env node
const { program } = require("commander");
const pkg = require("../package.json");
const yaml = require("js-yaml");
const fs = require("fs");
const chalkPipe = require("chalk-pipe");

const inquirer = require("inquirer");

program.version(pkg.version);

const dataFile = "./src/links.yml";
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
    transformer: function (color) {
      return chalkPipe(color)(color);
    },
  },
];

program.command("add").action(async () => {
  const answers = await inquirer.prompt(questions);
  const item = yaml.dump([answers]);
  console.log(item);
  fs.appendFileSync(dataFile, item);
});

program.parse(process.argv);
