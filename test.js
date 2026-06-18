#!/usr/bin/env node
"use strict";

/**
 * 深渊地牢 - 简单测试脚本
 * Abyss Dungeon - Simple Test Script
 */

const http = require("http");

const BASE_URL = "http://localhost:3000";

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
}

async function runTests() {
  console.log("🧪 运行测试...\n");

  // 测试健康检查端点
  test("健康检查端点", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert(res.status === 200, `状态码应为200，实际为${res.status}`);
    const data = JSON.parse(res.data);
    assert(typeof data.uptime === "number", "应返回uptime");
    assert(typeof data.players === "number", "应返回players");
    assert(typeof data.monsters === "number", "应返回monsters");
  });

  // 测试主页加载
  test("主页加载", async () => {
    const res = await fetch(BASE_URL);
    assert(res.status === 200, `状态码应为200，实际为${res.status}`);
    assert(res.data.includes("深渊地牢"), "应包含游戏标题");
    assert(res.data.includes("game"), "应包含游戏逻辑");
  });

  // 测试CSS文件
  test("CSS文件加载", async () => {
    const res = await fetch(`${BASE_URL}/client/css/styles.css`);
    assert(res.status === 200, `状态码应为200，实际为${res.status}`);
    assert(res.data.includes("暗黑"), "应包含暗黑风格定义");
  });

  // 测试JS文件
  test("JavaScript文件加载", async () => {
    const res = await fetch(`${BASE_URL}/client/js/main.js`);
    assert(res.status === 200, `状态码应为200，实际为${res.status}`);
    assert(res.data.includes("game"), "应包含游戏逻辑");
  });

  console.log("\n✨ 测试完成！");
}

runTests().catch(console.error);
