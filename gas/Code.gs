// 設定值（LINE_CHANNEL_ID、SPREADSHEET_ID）放在 Config.gs

const SHEET_ISSUES = 'Issues';
const CATEGORIES = ['系統', '設備', '網路', '其他'];
const QUERY_LIMIT = 50;
const MAX_IMAGES = 5;
const MAX_IMAGE_BASE64 = 3 * 1024 * 1024;   // 單張圖片 base64 上限（約 2.2MB 原始大小）
const IMAGE_FOLDER_NAME = '值班問題圖片';

// 欄位位置（0 起算），對應 Issues 工作表第一列
const HEADERS = [
  'ISSUE_ID', 'DUTY_DATE', 'CATEGORY', 'TITLE', 'CONTENT',
  'REPORTER_ID', 'REPORTER_NAME', 'CREATE_TIME', 'UPDATE_TIME', 'IMAGES'
];
const COL = {
  ISSUE_ID: 0, DUTY_DATE: 1, CATEGORY: 2, TITLE: 3, CONTENT: 4,
  REPORTER_ID: 5, REPORTER_NAME: 6, CREATE_TIME: 7, UPDATE_TIME: 8, IMAGES: 9
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
      case 'getIssue':
        return json({ ok: true, data: getIssue(req.issueId) });
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

// 取得圖片資料夾；第一次呼叫時自動建立，並把 ID 記在指令碼屬性
function getImageFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('IMAGE_FOLDER_ID');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (err) {
      // 資料夾被刪除或無法存取，下面重新建立
    }
  }
  const folder = DriveApp.createFolder(IMAGE_FOLDER_NAME);
  props.setProperty('IMAGE_FOLDER_ID', folder.getId());
  return folder;
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

  const images = Array.isArray(data.images) ? data.images : [];
  if (images.length > MAX_IMAGES) throw new Error('圖片最多 ' + MAX_IMAGES + ' 張');

  // 先存圖片（在 lock 外面做，避免上傳時間太長卡住其他人送出）
  const files = saveImages(images);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);   // 避免兩人同時送出拿到同一個編號

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
      new Date(),                           // CREATE_TIME
      '',                                   // UPDATE_TIME
      files.map(f => f.getId()).join(',')   // IMAGES：雲端硬碟檔案 ID，逗號分隔
    ];

    sheet.getRange(row, 2).setNumberFormat('@');   // 日期存成純文字，避免被自動轉型
    sheet.getRange(row, 1, 1, values.length).setValues([values]);

    props.setProperty('LAST_ISSUE_ID', String(issueId));

    files.forEach((f, i) => f.setName(issueId + '_' + (i + 1) + '.jpg'));   // 改成好辨識的檔名
    return { issueId };
  } catch (err) {
    files.forEach(f => f.setTrashed(true));   // 寫入失敗就把剛存的圖片丟進垃圾桶
    throw err;
  } finally {
    lock.releaseLock();
  }
}

// 前端已壓縮成 JPEG；這裡只接受 JPEG，並檢查大小
function saveImages(images) {
  if (!images.length) return [];

  const folder = getImageFolder();
  const saved = [];
  try {
    images.forEach((img, i) => {
      const base64 = String((img && img.data) || '');
      if (!base64) throw new Error('第 ' + (i + 1) + ' 張圖片沒有內容');
      if (base64.length > MAX_IMAGE_BASE64) throw new Error('第 ' + (i + 1) + ' 張圖片太大');

      const bytes = Utilities.base64Decode(base64);
      // JPEG 檔頭是 FF D8（Apps Script 的 byte 是有號數，所以是 -1, -40）
      if (bytes.length < 2 || bytes[0] !== -1 || bytes[1] !== -40) {
        throw new Error('第 ' + (i + 1) + ' 張不是 JPEG 圖片');
      }

      const blob = Utilities.newBlob(bytes, 'image/jpeg', Utilities.getUuid() + '.jpg');
      saved.push(folder.createFile(blob));
    });
  } catch (err) {
    saved.forEach(f => f.setTrashed(true));
    throw err;
  }
  return saved;
}

// 查詢所有同仁的紀錄，依編號由新到舊，最多 QUERY_LIMIT 筆（只回傳摘要）
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

  const rows = readRows();

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

  const items = matched.slice(0, QUERY_LIMIT).map(r => {
    const content = String(r[COL.CONTENT] || '');
    return {
      issueId: Number(r[COL.ISSUE_ID]),
      dutyDate: toDateText(r[COL.DUTY_DATE]),
      category: r[COL.CATEGORY],
      title: r[COL.TITLE],
      snippet: content.length > 60 ? content.slice(0, 60) + '…' : content,
      reporterName: r[COL.REPORTER_NAME],
      imageCount: splitIds(r[COL.IMAGES]).length
    };
  });

  return { items, total: matched.length };
}

// 取得單筆完整資料，包含圖片內容
function getIssue(issueId) {
  const id = Number(issueId);
  if (!id) throw new Error('缺少編號');

  const r = readRows().find(row => Number(row[COL.ISSUE_ID]) === id);
  if (!r) throw new Error('找不到編號 ' + id + ' 的資料');

  const images = [];
  splitIds(r[COL.IMAGES]).forEach(fileId => {
    try {
      const blob = DriveApp.getFileById(fileId).getBlob();
      images.push({
        mimeType: blob.getContentType(),
        data: Utilities.base64Encode(blob.getBytes())
      });
    } catch (err) {
      console.error('讀取圖片失敗：' + fileId, err);   // 檔案被刪除時略過，不讓整筆失敗
    }
  });

  return {
    issueId: id,
    dutyDate: toDateText(r[COL.DUTY_DATE]),
    category: r[COL.CATEGORY],
    title: r[COL.TITLE],
    content: r[COL.CONTENT],
    reporterName: r[COL.REPORTER_NAME],
    createTime: formatTime(r[COL.CREATE_TIME]),
    updateTime: formatTime(r[COL.UPDATE_TIME]),
    images
  };
}

function readRows() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
}

function splitIds(v) {
  return String(v || '').split(',').map(s => s.trim()).filter(Boolean);
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

// 手動執行一次：建立圖片資料夾，同時觸發雲端硬碟的授權
function initImageFolder() {
  const folder = getImageFolder();
  console.log('圖片資料夾：' + folder.getName() + '（' + folder.getUrl() + '）');
}

// ⚠ 會清空 Issues 工作表的所有資料並重設編號，只在初始化或改欄位時手動執行
function setupSheet() {
  const sheet = getSheet();
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  PropertiesService.getScriptProperties().deleteProperty('LAST_ISSUE_ID');
}
