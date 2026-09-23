var LINE_CHANNEL_ID = "2011702473";

const SHEET_ISSUES = 'Issues';
const SHIFTS = ['D', 'E', 'N'];
const CATEGORIES = ['系統', '設備', '網路', '其他'];

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const user = verifyIdToken(req.idToken);   // 每個請求都先驗證

    switch (req.action) {
      case 'ping':
        return json({ ok: true, data: { userId: user.sub, name: user.name } });
      case 'createIssue':
        return json({ ok: true, data: createIssue(req.data || {}, user) });
      default:
        return json({ ok: false, error: '未知的 action：' + req.action });
    }
  } catch (err) {
    console.error(err);   // 讓錯誤也出現在「執行作業」的紀錄中
    return json({ ok: false, error: err.message });
  }
}

function createIssue(data, user) {
  // 驗證輸入（前端的檢查可以被繞過，後端要再擋一次）
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dutyDate || '')) throw new Error('值班日期格式錯誤');
  if (!SHIFTS.includes(data.shift)) throw new Error('班別錯誤');
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

    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_ISSUES);
    if (!sheet) throw new Error('找不到工作表：' + SHEET_ISSUES);

    const row = sheet.getLastRow() + 1;
    const values = [
      issueId,
      data.dutyDate,
      data.shift,
      data.category,
      safeText(title),
      safeText(content),
      'O',                        // 待處理
      user.sub,
      safeText(user.name || ''),
      '',                         // RESOLUTION
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

// 開頭是 = + - @ 的字串會被試算表當成公式執行，前面加 ' 讓它保持文字
function safeText(s) {
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function verifyIdToken(idToken) {
  if (!idToken) throw new Error('缺少 idToken');

  const channelId = LINE_CHANNEL_ID;
  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'post',
    payload: { id_token: idToken, client_id: channelId },
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
