let http = require('http');
let path = require('path');
let url = require('url');
let fs = require('fs').promises;
let { createReadStream } = require('fs'); // 可读流，可写流
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
  }
  async handleRequest(req, res) {
    console.log(this);
    // 判断是文件夹还是文件
    console.log(req.url);
    let { pathname } = url.parse(req.url);
    // const myUrl = new URL(req.url);
    pathname = decodeURIComponent(pathname); // 对路径进行解码
    let absPath = path.join(this.config.directory, pathname);
    console.log(absPath, 'absPath');
    try {
      let statObj = await fs.stat(absPath);
      if (statObj.isFile()) {
        // 如果是文件，需要读取文件中的内容
        this.sendFile(req, res, absPath);
      }
    } catch (e) {
      this.sendError(req, res, e);
    }
  }
  //
  sendFile(req, res, absPath) {
    // 采用流的方式 pipe  原理就是 监听 on data事件 ，拿到数据之后会调用 res.write,end方法把结果抛出去
    res.setHeader('Content-Type', mime.getType(absPath), 'charset=utf-8');
    // 注意 异步读取
    createReadStream(absPath).pipe(res);
  }
  sendError(req, res, e) {
    console.log(e);
    res.statusCode = 404;
    res.end('Not Found');
  }
  start() {
    // 如果不进行bind，this默认是http.createServer
    let server = http.createServer(this.handleRequest.bind(this));
    server.listen(this.config.port, () => {
      console.log(`服务启动在${this.config.port}端口`);
    });
  }
}

module.exports = Server;
