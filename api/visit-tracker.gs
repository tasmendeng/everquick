/**
 * 恒讯供应链 — 访客记录 & 每日邮件汇总
 * 部署到 Google Apps Script (关联一个 Google Sheet)
 *
 * 部署步骤：
 * 1. 打开 https://sheets.new 创建新表格
 * 2. 扩展程序 → Apps Script，把这段代码粘贴进去
 * 3. 点击「部署」→「新部署」→ 类型选「Web 应用」
 *    执行身份：我
 *    访问权限：任何人
 * 4. 复制 Web 应用 URL，配置到前端
 * 5. 在 Apps Script 左侧「触发器」添加：doDailyReport / 时间驱动 / 天 / 上午8-9点
 */

// 收到访客数据时写入 Sheet
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // 如果 Sheet 为空，写入表头
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        '时间', 'IP', '国家', '国家代码', '城市', '访问页面', '来源', '浏览器', '语言偏好'
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date(),
      data.ip        || '',
      data.country   || '',
      data.code      || '',
      data.city      || '',
      data.page      || '',
      data.referrer  || '',
      data.ua        || '',
      data.lang      || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 每日汇总 + 发邮件（通过触发器每天自动执行）
function doDailyReport() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return; // 只有表头，无数据

  // 获取今天的日期字符串（yyyy-MM-dd）
  var today = new Date();
  var todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');

  // 统计：总访问、今日访问、独立IP、国家分布
  var totalVisits = data.length - 1; // 去掉表头

  var todayVisits = 0;
  var todayIPs = {};
  var allIPs = {};
  var countryCount = {};
  var pageCount = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var ts = row[0];      // 时间戳 (Date 对象)
    var ip = row[1];      // IP
    var country = row[2]; // 国家
    var page = row[5];    // 访问页面

    if (!ip) continue;

    // 累计唯一 IP
    allIPs[ip] = true;

    // 国家统计
    if (country) {
      countryCount[country] = (countryCount[country] || 0) + 1;
    }

    // 页面统计
    if (page) {
      var shortPage = page.split('/').pop() || page;
      pageCount[shortPage] = (pageCount[shortPage] || 0) + 1;
    }

    // 检查是否今天
    if (ts instanceof Date) {
      var rowDate = ts.getFullYear() + '-' +
        String(ts.getMonth() + 1).padStart(2, '0') + '-' +
        String(ts.getDate()).padStart(2, '0');
      if (rowDate === todayStr) {
        todayVisits++;
        todayIPs[ip] = true;
      }
    }
  }

  var totalUniqueIPs = Object.keys(allIPs).length;
  var todayUniqueIPs = Object.keys(todayIPs).length;

  // 按数量排序国家
  var countriesSorted = Object.entries(countryCount)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 10);

  // 按数量排序页面
  var pagesSorted = Object.entries(pageCount)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 10);

  // 构建邮件正文
  var html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">';
  html += '<div style="background:#1e3a5f;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">';
  html += '<h2 style="margin:0;">📊 Everquick 访客日报</h2>';
  html += '<p style="margin:8px 0 0;opacity:0.8;">' + todayStr + '</p>';
  html += '</div>';

  html += '<div style="background:#f7fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">';

  // 概览
  html += '<h3 style="color:#1a202c;margin:0 0 16px;">📋 概览</h3>';
  html += '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">';
  html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#4a5568;">今日访问</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#1a202c;">' + todayVisits + ' 次 (' + todayUniqueIPs + ' 个独立IP)</td></tr>';
  html += '<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#4a5568;">累计访问</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-weight:bold;color:#1a202c;">' + totalVisits + ' 次 (' + totalUniqueIPs + ' 个独立IP)</td></tr>';
  html += '</table>';

  // 国家分布
  if (countriesSorted.length > 0) {
    html += '<h3 style="color:#1a202c;margin:0 0 12px;">🌍 访客国家 Top 10</h3>';
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">';
    for (var c = 0; c < countriesSorted.length; c++) {
      html += '<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568;">' + countriesSorted[c][0] + '</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">' + countriesSorted[c][1] + '</td></tr>';
    }
    html += '</table>';
  }

  // 热门页面
  if (pagesSorted.length > 0) {
    html += '<h3 style="color:#1a202c;margin:0 0 12px;">📄 热门页面 Top 10</h3>';
    html += '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;">';
    for (var p = 0; p < pagesSorted.length; p++) {
      html += '<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;color:#4a5568;">' + pagesSorted[p][0] + '</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">' + pagesSorted[p][1] + '</td></tr>';
    }
    html += '</table>';
  }

  html += '<p style="color:#a0aec0;font-size:12px;text-align:center;">此邮件由 Google Apps Script 自动发送 · Everquick 访客统计系统</p>';
  html += '</div></div>';

  // 发送邮件
  var recipient = 'tasmendeng@hotmail.com';
  var subject = '📊 [' + todayStr + '] Everquick 访客日报 — 今日 ' + todayVisits + ' 次访问';

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: html
  });
}
