/**
 * Google Apps Script Web App for Aksara Transliteration Sheet Sync.
 * 
 * CARA DEPLOY:
 * 1. Buka Google Sheets baru atau Sheets yang sudah ada.
 * 2. Klik menu "Extensions" -> "Apps Script" (Ekstensi -> Apps Script).
 * 3. Hapus kode default yang ada di dalamnya, lalu tempelkan (paste) seluruh kode di bawah ini.
 * 4. Klik ikon Simpan (Save) atau tekan Ctrl+S.
 * 5. Klik tombol "Deploy" di bagian kanan atas -> pilih "New deployment".
 * 6. Klik ikon gir (pilihan jenis deployment) dan pilih "Web app".
 * 7. Konfigurasikan pengaturannya sebagai berikut:
 *    - Description: "Aksara Sync"
 *    - Execute as: "Me (email Anda)"
 *    - Who has access: "Anyone" (HARUS "Anyone" agar sistem back-end aplikasi dapat menyinkronkan data secara otomatis).
 * 8. Klik "Deploy". Google akan meminta izin akses ("Authorize Access"). Klik tombol tersebut, pilih akun Google Anda, klik "Advanced", lalu pilih "Go to Untitled project (unsafe)" dan klik "Allow".
 * 9. Salin URL Web App yang dihasilkan (URL yang berakhiran /exec).
 * 10. Masukkan URL tersebut ke variabel lingkungan (environment variable) `GOOGLE_APPS_SCRIPT_URL` di pengaturan back-end aplikasi Anda!
 */

function doPost(e) {
  try {
    // Validasi data masukan dari request body
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        success: false,
        error: "Data kosong/tidak valid (No post data provided)"
      });
    }

    // Parsing JSON request payload
    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse({
        success: false,
        error: "Format body harus berupa JSON: " + parseErr.toString()
      });
    }

    var spreadsheetId = payload.spreadsheetId;
    var values = payload.values;
    var sheetName = payload.sheetName;
    var clearSheet = payload.clearSheet;

    if (!values || !Array.isArray(values) || values.length === 0) {
      return createJsonResponse({
        success: false,
        error: "Data 'values' berupa array kosong atau tidak valid"
      });
    }

    // Buka Spreadsheet menggunakan ID yang dikirim, jika kosong buka Spreadsheet yang aktif
    var ss;
    if (spreadsheetId) {
      ss = SpreadsheetApp.openById(spreadsheetId);
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!ss) {
      return createJsonResponse({
        success: false,
        error: "Spreadsheet tidak ditemukan atau tidak memiliki hak akses."
      });
    }

    // Gunakan sheet berdasarkan nama jika ditargetkan, atau sheet pertama secara default
    var sheet;
    if (sheetName) {
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      } else if (clearSheet) {
        sheet.clearContents();
      }
    } else {
      sheet = ss.getSheets()[0];
    }

    // Jika sheet kosong sama sekali, tambahkan header kolom secara otomatis agar rapi
    if (sheet.getLastRow() === 0) {
      var headerRow = [];
      if (sheetName && sheetName.indexOf("Referensi") !== -1) {
        headerRow = [
          "Waktu Sinkronisasi",
          "ID Aturan",
          "Jenis Aturan",
          "Teks Latin (Input)",
          "Aksara Arab Pegon (Output)",
          "Deskripsi / Keterangan",
          "Status Ejaan"
        ];
      } else if (sheetName && sheetName.indexOf("Pengaturan") !== -1) {
        headerRow = [
          "Waktu Sinkronisasi",
          "Kunci Pengaturan",
          "Nilai Pengaturan",
          "Keterangan Deskriptif"
        ];
      } else {
        headerRow = [
          "Waktu Transliterasi",
          "Teks Asal (Latin)",
          "Hasil Aksara (Arab Pegon/Jawi)",
          "Tipe Transliterasi (Pegon/Jawi)",
          "Metode (Manual/AI)",
          "Panjang Karakter",
          "Jumlah Kata",
          "Keterangan/Saran",
          "Pengguna",
          "Lokasi",
          "IP Address"
        ];
      }
      sheet.appendRow(headerRow);
    }

    // Append baris-baris data dari array values
    for (var i = 0; i < values.length; i++) {
      var rowData = values[i];
      if (Array.isArray(rowData)) {
        sheet.appendRow(rowData);
      }
    }

    return createJsonResponse({
      success: true,
      message: "Sukses menyinkronkan data ke Google Sheets (" + values.length + " baris ditambahkan ke sheet '" + (sheetName || sheet.getName()) + "')",
      spreadsheetUrl: ss.getUrl()
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: "Terjadi kesalahan sistem internal Apps Script: " + error.toString()
    });
  }
}

// Helper untuk membuat JSON response dengan CORS enabled
function createJsonResponse(obj) {
  var jsonString = JSON.stringify(obj);
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

// Fungsi doGet sebagai endpoint ping uji coba dan deteksi email otomatis serta mengunduh referensi kustom
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : null;
  var spreadsheetId = e && e.parameter ? e.parameter.spreadsheetId : null;
  var sheetName = "Referensi & Kamus Kustom";

  if (action === "read-rules") {
    try {
      var ss;
      if (spreadsheetId) {
        ss = SpreadsheetApp.openById(spreadsheetId);
      } else {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
      if (!ss) {
        return createJsonResponse({ success: false, error: "Spreadsheet tidak ditemukan atau tidak memiliki hak akses." });
      }
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return createJsonResponse({ success: true, mappings: [] });
      }
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ success: true, mappings: [] });
      }
      var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      var mappings = [];
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var timestamp = row[0];
        var id = row[1];
        var typeLabel = row[2];
        var latin = row[3];
        var arabic = row[4];
        var description = row[5];
        var statusEjaan = row[6];

        if (id && id !== "-" && latin && arabic) {
          var type = "word";
          if (typeLabel.indexOf("Karakter Tunggal") !== -1) type = "character";
          else if (typeLabel.indexOf("Digraf") !== -1 || typeLabel.indexOf("Suku Kata") !== -1) type = "digraph";

          mappings.push({
            id: id,
            type: type,
            latin: latin,
            arabic: arabic,
            description: description,
            isPreset: false
          });
        }
      }
      return createJsonResponse({ success: true, mappings: mappings });
    } catch (err) {
      return createJsonResponse({ success: false, error: err.toString() });
    }
  } else if (action === "read-settings") {
    try {
      var ss;
      if (spreadsheetId) {
        ss = SpreadsheetApp.openById(spreadsheetId);
      } else {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
      if (!ss) {
        return createJsonResponse({ success: false, error: "Spreadsheet tidak ditemukan atau tidak memiliki hak akses." });
      }
      var sheet = ss.getSheetByName("Pengaturan Kustom");
      if (!sheet) {
        return createJsonResponse({ success: true, settings: {} });
      }
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ success: true, settings: {} });
      }
      var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      var settings = {};
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var key = row[1];
        var val = row[2];
        if (key && val !== undefined) {
          settings[key] = val;
        }
      }
      return createJsonResponse({ success: true, settings: settings });
    } catch (err) {
      return createJsonResponse({ success: false, error: err.toString() });
    }
  }

  return createJsonResponse({
    success: true,
    message: "Koneksi Google Apps Script Web App berhasil aktif!",
    ownerEmail: "Anonim"
  });
}
