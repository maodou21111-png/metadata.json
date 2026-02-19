# 射门领奖励小游戏（最小可运行版）

## 启动

```bash
node server.js
```

打开 `http://localhost:3000`。

## 已实现
- 用户注册并自动生成唯一验证码。
- 后台（演示接口）按验证码增加可玩次数。
- 轻触球员=降低力度、长按球员=增加力度。
- 射门随机轨迹动画与奖励命中。
- 奖励池分布：8×5000，3×10000，2×50000，1×100000。
- 后台记录每次射门与累计奖励（`data/db.json`）。

## API
- `POST /api/register` `{ "name": "..." }`
- `POST /api/admin/add-attempts` `{ "verificationCode": "...", "attempts": 3 }`
- `POST /api/shoot` `{ "verificationCode": "...", "powerAction": "tap|longpress" }`
- `GET /api/user?verificationCode=...`
