# S4.4 海外固定 IP 部署包

目标：把当前静态 S4.4 页面部署到用户自行持有的海外 VPS，使普通访问者只连接 VPS 的公网 IP，不连接用户的家庭或手机网络。

## 推荐区域

优先新加坡；也可选择东京或美国。服务器应提供可长期保留的公网 IPv4（例如 Reserved IP / Static IP）。

## 推荐最低规格

- Ubuntu 24.04 LTS
- 1 vCPU
- 1 GB RAM
- 10 GB 以上磁盘
- 固定/保留公网 IPv4

该站点为纯静态页面，资源需求很低。

## 首次部署

登录新服务器后执行：

```bash
git clone --depth=1 https://github.com/sfu78074-arch/shuangfu.git
cd shuangfu
sudo bash deploy/install.sh
```

部署完成后先访问：

```text
http://服务器公网IP/
```

## 后续更新

```bash
sudo bash /opt/shuangfu-src/deploy/update.sh
```

## 安全基线

- 只开放 SSH、80、443。
- SSH 后续建议仅使用密钥认证并关闭密码登录。
- 不在页面加入第三方分析/广告追踪代码。
- Nginx 添加 CSP、Referrer-Policy、X-Frame-Options、nosniff、Permissions-Policy 等响应头。
- 保留必要的系统和 Web 安全日志，用于故障排查和安全事件处理。
- 当前 GitHub Pages 可在新服务器验证稳定后再停用，避免切换期间中断。

## HTTPS（没有域名也可做）

截至 2026 年，Let's Encrypt 已支持公网 IPv4/IPv6 的短期 IP 地址证书。服务器固定 IP 确认后，可以使用支持 IP 地址证书的新版 Certbot 自动申请和续期；证书有效期较短，因此必须自动续期。也可以以后绑定自己的域名后使用常规 HTTPS。

## 不包含的内容

本部署包用于正常的海外托管、网络隔离和安全加固，不提供规避合法调查、隐藏服务商账户关系或破坏审计记录的功能。
