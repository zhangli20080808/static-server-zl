let http = require('http');
let url = require('url');
let path = require('path');
let fs = require('fs').promises;
let { createReadStream } = require('fs');
let mime = require('mime');

const merge = (config) => {
  // 当前运行哪个命令时的目录,当前工作目录
  return {
    port: 3001,
    directory: process.cwd(),
    ...config,
  };
};

class Server {
  constructor(config) {
    this.config = merge(config);
    console.log(this.config);
  }
  handleRequest(req, res) {
    console.log(this);
  }
  start() {
    // 如果不进行bind，this默认是http.createServer
    let server = http.createServer(this.handleRequest.bind(this));
    server.listen(this.config.port,()=>{
      console.log(`服务启动在${this.config.port}端口`);
    });
  }
}

module.exports = Server;
