#! /usr/bin/env node

// 默认开启http服务
console.log('123');
let config = {
  cwd : process.cwd(),
  port:8080
}
// 解析用户命令行传入的参数 替换掉默认的配置
// commander yargs
let yargs = require('yargs');
let options = yargs.option('port', {
  alias: 'p',
  default: 8080
}).argv
Object.assign(config,options);
console.log(config)
// let MyServer = require('../server');
// let server = new MyServer(config);
// server.start();



