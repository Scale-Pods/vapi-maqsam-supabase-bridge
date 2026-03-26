const express = require("express");
const { google } = require("googleapis");

const app = express();
app.use(express.json());

// 🔧 CONFIG
const SPREADSHEET_ID = "1Y0lr91_i3bGIAw_LdqllVjn2rr5mPOMbaSPHn7XtXxo";
const RANGE = "Sheet1!A:B"; // Name + Phone

// 🔐 AUTH
const auth = new google.auth.GoogleAuth({
  keyFile: "theta-cider-472214-p9-4433c7cf21a6.json", // your downloaded file
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

async function getCustomerName(phoneNumber) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) return null;

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][0];
    const phone = rows[i][1];

    if (!phone) continue;

    // Normalize phone
    if (phone.replace(/\D/g, "") === phoneNumber.replace(/\D/g, "")) {
      return name;
    }
  }

  return null;
}

app.post("/assistant-selector", async (req, res) => {
  try {
    if (req.body.message?.type === "assistant-request") {

      console.log("Incoming request");

      const phoneNumber = req.body.message?.call?.customer?.number;

      console.log("PHONE:", phoneNumber);

      const customerName = await getCustomerName(phoneNumber);

      console.log("FOUND NAME:", customerName);

      res.json({
        assistantId: "02b53341-2f4f-44aa-a264-292e0ad57589",
        assistantOverrides: {
          variableValues: {
            customerName: customerName || "there"
          }
        }
      });
    }
  } catch (err) {
    console.error("ERROR:", err);

    res.json({
      assistantId: "02b53341-2f4f-44aa-a264-292e0ad57589",
      assistantOverrides: {
        variableValues: {
          customerName: "there"
        }
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));