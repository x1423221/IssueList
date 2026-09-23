// Apps Script 後端（備份用，實際執行的是試算表綁定的 Apps Script）
// 修改後要到「管理部署作業 → 編輯 → 新版本」才會生效

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const user = verifyIdToken(req.idToken);   // 每個請求都先驗證

    switch (req.action) {
      case 'ping':
        return json({ ok: true, data: { userId: user.sub, name: user.name } });
      default:
        return json({ ok: false, error: '未知的 action：' + req.action });
    }
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function verifyIdToken(idToken) {
  if (!idToken) throw new Error('缺少 idToken');

  const channelId = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ID');
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
