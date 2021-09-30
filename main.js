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
const crypto = require('crypto');
const zlib = require('zlib');

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
    // 判断是文件夹还是文件
    let { pathname } = url.parse(req.url);
    // const myUrl = new URL(req.url);
    pathname = decodeURIComponent(pathname); // 对路径进行解码
    let absPath = path.join(this.config.directory, pathname);
    try {
      let statObj = await fs.stat(absPath);
      if (statObj.isFile()) {
        // 如果是文件，需要读取文件中的内容
        this.sendFile(req, res, absPath, statObj);
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

  /**
   * 采用流的方式 pipe  原理就是 监听 on data事件 ，拿到数据之后会调用 res.write,end方法把结果抛出去
   * 1. 强制缓存服务端可以设置，当前请求发送完毕后，如果再次发送请求，我可以设置在某段事件之内不会在向服务端
     发起请求，去浏览器缓存查找
     expires  - 过期时间，是一个绝对的时间 Cache-control
   * 2. 对比缓存就是 服务端的文件和浏览器的文件做一个对比，判断一下是否需要进行缓存，last-modified不进准的问题，可以使用eTag，指纹
   */
  async cache(req, res, absPath, statObj = {}) {
    res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toGMTString());
    // no-cache 表示浏览器有缓存，但是请求时会请求服务器
    // no-store 表示浏览器没有缓存 希望有缓存 max-age 秒为单位
    // 首页必须要发送请求，但是首页引用的资源可以实现强制缓存

    // 如果10s内 文件发生了变化 需要返回最新的文件

    res.setHeader('Cache-control', 'no-cache'); // 强制缓存 会导致文件更新 显示可能不是最新的
    // max-age: 10 第一次访问结束，10s内不会在发请求，超过10s才会发请求，进行对比，强制缓存可以和对比缓存一起使用
    // 如果强制缓存的时候到了，我们就走对比缓存-也叫协商缓存

    let fileContent = await fs.readFile(absPath);

    let ifModifiedSince = req.headers['if-modified-since']; // 浏览器给我们的
    let ifNoneMatch = req.headers['if-none-match'];

    // 可以显示最新的内容

    // 对比文件是否发生了变化
    let cTime = statObj.ctime.toGMTString();

    let etag = crypto.createHash('md5').update(fileContent).digest('base64');
    res.setHeader('Last-Modified', cTime); // 给浏览器设置的
    res.setHeader('Etag', etag); // 给浏览器设置的

    // 先走强制缓存，再走对比缓存(1. 比较指纹 比较最后修改时间，都符合，说明文件没有修改)
    let flag = true;
    if (cTime !== ifModifiedSince) {
      // 如果文件不一致，则返回新文件，如果时间一致，则找浏览器缓存
      return false;
    }
    if (ifNoneMatch !== etag) {
      // 不会直接取完整的etag
      return false;
    }
    return flag;
  }

  async sendFile(req, res, absPath, statObj) {
    const cache = await this.cache(req, res, absPath, statObj);
    if (cache) {
      // 服务端告诉你，浏览器有缓存
      res.statusCode = 304;
      res.end();
      return;
    }
    // 注意 异步读取
    res.setHeader(
      'Content-Type',
      mime.getType(absPath) || 'text/plain',
      'charset=utf-8'
    );
    // console.log(absPath);
    // 判断是否要压缩
    let gzip = this.gzip(req, res, absPath, statObj);
    console.log(gzip,'v'); //压缩流- 转化流[可以读到的结果放到一个转化流里面，帮我们转化完之后，写到另一个文件中]
    if (gzip) {
      createReadStream(absPath).pipe(gzip).pipe(res);
    } else {
      createReadStream(absPath).pipe(res);
    }
  }
  // 浏览器告诉服务端，我会做哪些压缩，服务器会根据浏览器的支持情况，做对应的压缩处理
  // gzip - 文件的重复度越高，压缩越多
  // 比如视频，图片，是不需要gzip压缩的
  gzip(req, res, absPath, statObj) {
    let encoding = req.headers['accept-encoding'];
    if (encoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      return zlib.createGzip();
    } else if (encoding.includes('deflate')) {
      res.setHeader('Content-Encoding', 'deflate');
      return zlib.createDeflate();
    }
    return false;
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
