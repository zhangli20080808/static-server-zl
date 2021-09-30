/**
 * 对比文件
 * 可以通过 摘要算法来实现 计算一个唯一的 hash戳
 *
 * 摘要算法不是加密算法，只能通过输入推断输出，不能通过输出反推内容
 */

const crypto = require('crypto');

const r = crypto.createHash('md5').update('hello').digest('base64');
console.log(r);
