/**
  <!-- 如果有js语法，需要使用<%%> -->
  <!-- 如果要显示值 <%=%> -->
  服务端渲染 - 直接返回了一个字符串 包含完整的html和内容
  单页面应用 - webpack js -> 
 */
let http = require('http');
let path = require('path');
let url = require('url');
let fs = require('fs').promises;
let { createReadStream } = require('fs'); // 可读流，可写流
let mime = require('mime');
// ejs 将对象渲染好，拼接成一个字符
const ejs = require('ejs');
const { promisify } = require('util');
const renderFile = promisify(ejs.renderFile);

const renderTemplatePath = path.resolve(__dirname, 'template.html');
// renderFile(renderTemplatePath, { arr: [1, 2, 3] });
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
      } else {
        // 文件夹
        let arr = await fs.readdir(absPath);
        // 需要根据dir生成一个html字符串，生成到页面上，通过模板引擎，通过一个对象，合并成一个页面，送给 浏览器
        // ejs
        // arr 需要单独处理一下  点击的路劲
        let dirs = arr.map((item) => {
          return {
            path: path.join(pathname, item),
            dir: item,
          };
        });
        const r = await renderFile(renderTemplatePath, { arr: dirs });
        res.setHeader('Content-Type', 'text/html;charset=utf-8');
        res.end(r);
      }
    } catch (e) {
      this.sendError(req, res, e);
    }
  }
  //
  sendFile(req, res, absPath) {
    // 采用流的方式 pipe  原理就是 监听 on data事件 ，拿到数据之后会调用 res.write,end方法把结果抛出去
    res.setHeader(
      'Content-Type',
      mime.getType(absPath) || 'text/plain',
      'charset=utf-8'
    );
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
