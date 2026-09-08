/**
 * Esc 关闭栈：多个浮层叠加时（图鉴开着 + 时段信弹出），
 * 一次 Esc 只关最顶层的浮层，避免两层同时被关掉。
 * 用法：弹窗挂载时 acquireEscapeLayer() 拿 token，Esc 处理器先 isTopEscapeLayer(token)
 * 确认自己是顶层再关；卸载时 releaseEscapeLayer(token)。
 */

const stack: symbol[] = [];

export function acquireEscapeLayer(): symbol {
  const token = Symbol("esc-layer");
  stack.push(token);
  return token;
}

export function releaseEscapeLayer(token: symbol): void {
  const index = stack.indexOf(token);
  if (index >= 0) stack.splice(index, 1);
}

export function isTopEscapeLayer(token: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === token;
}
