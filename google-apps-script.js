/**
 * 사회성숙도 검사 웹앱 - Google Apps Script 연동 코드
 *
 * 사용 방법:
 * 1. https://script.google.com 에서 새 프로젝트 생성
 * 2. 아래 코드를 붙여넣기
 * 3. SPREADSHEET_ID를 본인 스프레드시트 ID로 변경
 *    (스프레드시트 URL의 /d/ 와 /edit 사이의 값)
 * 4. 배포 → 새 배포 → 웹 앱
 *    - 다음 사용자로 실행: 나
 *    - 액세스 권한: 모든 사용자
 * 5. 배포 URL을 웹앱 Google Sheets 설정에 입력
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const SHEET_NAME = '검사결과';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    // 시트가 없으면 생성
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    // 헤더가 없으면 첫 행에 추가
    if (sheet.getLastRow() === 0) {
      const headers = Object.keys(data);
      sheet.appendRow(headers);
      // 헤더 스타일
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1e40af');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    // 헤더 순서에 맞게 값 정렬
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const row = headers.map(h => data[h] !== undefined ? data[h] : '');

    sheet.appendRow(row);

    // 마지막 행 스타일 (짝수/홀수 교차)
    const lastRow = sheet.getLastRow();
    if (lastRow % 2 === 0) {
      sheet.getRange(lastRow, 1, 1, headers.length).setBackground('#f0f9ff');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: '사회성숙도 검사 API 동작 중' }))
    .setMimeType(ContentService.MimeType.JSON);
}
