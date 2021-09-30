#! /usr/bin/env node

// 默认开启http服务
// 解析用户命令行传入的参数 替换掉默认的配置
// commander yargs
// program
//   .option('-n, --number <numbers...>', 'specify numbers')
//   .option('-l, --letter [letters...]', 'specify letters');

let { Command } = require('commander');
const version = require('../package.json').version;
const program = new Command();
let config = {
  '-p,--port <port>': {
    description: 'set live-serve port',
    example: 'zl-server -p 3000',
  },
  '-d,--directory <dir>': {
    description: 'set live-serve directory',
    example: 'zl-server -d d',
  },
};
const entries = (config, cb) => {
  Object.entries(config).forEach(([key, option]) => {
    cb(key, option);
  });
};

entries(config, (key, option) => {
  program.option(key, option.description);
});

program.on('--help', function () {
  console.log('Example:');
  entries(config, (key, option) => {
    console.log(' ' + option.example);
  });
});
program.version(version);
program.name('zl-server')
const userConfig = program.parse(process.argv);
// 启动服务
let MyServer = require('../main');
let server = new MyServer(userConfig);
server.start();
