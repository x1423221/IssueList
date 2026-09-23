// 設定值（LINE_CHANNEL_ID、SPREADSHEET_ID）放在 Config.gs

const SHEET_ISSUES = 'Issues';
const CATEGORIES = ['系統', '設備', '網路', '其他'];
const QUERY_LIMIT = 50;

// 欄位位置（0 起算），對應 Issues 工作表第一列
const HEADERS = [
  'ISSUE_ID', 'DUTY_DATE', 'CATEGORY', 'TITLE', 'CONTENT',
  'REPORTER_ID', 'REPORTER_NAME', 'CREATE_TIME', 'UPDATE_TIME'
];
const COL = {
  ISSUE_ID: 0, DUTY_DATE: 1, CATEGORY: 2, TITLE: 3, CONTENT: 4,
  REPORTER_ID: 5, REPORTER_NAME: 6, CREATE_TIME: 7, UPDATE_TIME: 8
};

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const user = verifyIdToken(req.idToken);   // 每個請求都先驗證

    switch (req.action) {
      case 'ping':
        return json({ ok: true, data: { userId: user.sub, name: user.name } });
      case 'createIssue':
        return json({ ok: true, data: createIssue(req.data || {}, user) });
      case 'queryIssues':
        return json({ ok: true, data: queryIssues(req.filter || {}) });
      default:
        return json({ ok: false, error: '未知的 action：' + req.action });
    }
  } catch (err) {
    console.error(err);   // 讓錯誤也出現在「執行作業」的紀錄中
    return json({ ok: false, error: err.message });
  }
}

function getSheet() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_ISSUES);
  if (!sheet) throw new Error('找不到工作表：' + SHEET_ISSUES);
  return sheet;
}

function createIssue(data, user) {
  // 驗證輸入（前端的檢查可以被繞過，後端要再擋一次）
  if (!isDate(data.dutyDate)) throw new Error('值班日期格式錯誤');
  if (!CATEGORIES.includes(data.category)) throw new Error('類別錯誤');
  const title = String(data.title || '').trim();
  if (!title) throw new Error('請填寫標題');
  if (title.length > 100) throw new Error('標題不可超過 100 字');
  const content = String(data.content || '').trim();
  if (content.length > 2000) throw new Error('內容不可超過 2000 字');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);   // 避免兩人同時送出拿到同一個編號
  try {
    const props = PropertiesService.getScriptProperties();
    const issueId = Number(props.getProperty('LAST_ISSUE_ID') || 0) + 1;

    const sheet = getSheet();
    const row = sheet.getLastRow() + 1;
    const values = [
      issueId,
      data.dutyDate,
      data.category,
      safeText(title),
      safeText(content),
      user.sub,
      safeText(user.name || ''),
      new Date(),                 // CREATE_TIME
      ''                          // UPDATE_TIME
    ];

    sheet.getRange(row, 2).setNumberFormat('@');   // 日期存成純文字，避免被自動轉型
    sheet.getRange(row, 1, 1, values.length).setValues([values]);

    props.setProperty('LAST_ISSUE_ID', String(issueId));
    return { issueId };
  } finally {
    lock.releaseLock();
  }
}

// 查詢所有同仁的紀錄，依編號由新到舊，最多 QUERY_LIMIT 筆
function queryIssues(filter) {
  if (filter.dateFrom && !isDate(filter.dateFrom)) throw new Error('起始日期格式錯誤');
  if (filter.dateTo && !isDate(filter.dateTo)) throw new Error('結束日期格式錯誤');
  if (filter.category && !CATEGORIES.includes(filter.category)) throw new Error('類別錯誤');

  // 關鍵字以空白分隔，每個字都要出現在標題或內容中（不分大小寫）
  const keywords = String(filter.keyword || '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { items: [], total: 0 };

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  const matched = rows.filter(r => {
    const d = toDateText(r[COL.DUTY_DATE]);
    if (filter.dateFrom && d < filter.dateFrom) return false;   // yyyy-MM-dd 可直接比字串
    if (filter.dateTo && d > filter.dateTo) return false;
    if (filter.category && r[COL.CATEGORY] !== filter.category) return false;
    if (keywords.length) {
      const text = (String(r[COL.TITLE]) + '\n' + String(r[COL.CONTENT])).toLowerCase();
      if (!keywords.every(k => text.includes(k))) return false;
    }
    return true;
  });

  matched.sort((a, b) => Number(b[COL.ISSUE_ID]) - Number(a[COL.ISSUE_ID]));

  const items = matched.slice(0, QUERY_LIMIT).map(r => ({
    issueId: Number(r[COL.ISSUE_ID]),
    dutyDate: toDateText(r[COL.DUTY_DATE]),
    category: r[COL.CATEGORY],
    title: r[COL.TITLE],
    content: r[COL.CONTENT],
    reporterName: r[COL.REPORTER_NAME],
    createTime: formatTime(r[COL.CREATE_TIME]),
    updateTime: formatTime(r[COL.UPDATE_TIME])
  }));

  return { items, total: matched.length };
}

function isDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s || '');
}

// DUTY_DATE 正常是純文字；萬一被試算表轉成日期物件，也轉回 yyyy-MM-dd
function toDateText(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd');
  return String(v);
}

function formatTime(v) {
  return v instanceof Date ? Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd HH:mm') : '';
}

// 開頭是 = + - @ 的字串會被試算表當成公式執行，前面加 ' 讓它保持文字
function safeText(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function verifyIdToken(idToken) {
  if (!idToken) throw new Error('缺少 idToken');

  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: LINE_CHANNEL_ID },
    muteHttpExceptions: true
  });

  const body = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    throw new Error('Token 驗證失敗：' + (body.error_description || body.error));
  }
  return body;   // body.sub = userId, body.name = 顯示名稱
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ⚠ 會清空 Issues 工作表的所有資料並重設編號，只在初始化或改欄位時手動執行
function setupSheet() {
  const sheet = getSheet();
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  PropertiesService.getScriptProperties().deleteProperty('LAST_ISSUE_ID');
}
