import { expect } from "@playwright/test";
import { routeContract } from "../../src/routing/route-contract";

/**
 * 路由契约同步断言：服务端 /route-contract.json 必须与仓库源
 * src/routing/route-contract.ts 完全一致（构建时由 routes:build 从源生成 JSON）。
 *
 * 历史：这里曾是 toHaveLength(39) 硬编码，路由增删（37→39）后 CI 翻车，
 * 需要手工同步测试。改为深比较后，路由增删只需改源文件，断言自动跟随；
 * 同时保留更强的守卫——服务端漂移（忘记重新构建/被手改 JSON）也会被抓到。
 */
export function expectRouteContractInSync(manifest: { schemaVersion?: unknown; routes?: unknown }): void {
  expect(manifest.schemaVersion).toBe(1);
  expect(Array.isArray(manifest.routes)).toBe(true);
  expect(manifest.routes).toEqual(routeContract);
  // 结构不变式：路径唯一、根路由存在（与数量断言不同，这些不随路由增删变化）
  const paths = routeContract.map((route) => route.path);
  expect(new Set(paths).size).toBe(paths.length);
  expect(paths).toContain("/");
}
